import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getPaymentsBySchool, getStudentsBySchool } from '@/services/db'
import { exportDebtorsPDF, exportReportExcel } from '@/utils/exports'
import { format, differenceInDays, parseISO, addMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  FileDown, FileText, TrendingUp, Users, AlertCircle, DollarSign,
  CheckCircle, Filter, Calendar, BarChart2
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)

const GRADES = ['1er','2do','3er','4to','5to','6to','7mo','8vo','9no','10mo','11vo','12vo']

type DebtorRow = {
  student: { id: string; fullName: string; grade: string; section: string; enrollmentCode: string }
  balance: number
  daysOverdue: number
  dueDate: Date | null
  representativeName?: string
  status: 'red' | 'yellow'
}

function exportEnhancedDebtorsPDF(
  debtors: DebtorRow[],
  schoolName: string,
  dateFrom: string,
  dateTo: string
) {
  const doc = new jsPDF()

  // Header
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, 210, 32, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.text(schoolName || 'EduFinance', 14, 14)
  doc.setFontSize(11)
  doc.text('Reporte de Deudores', 14, 22)
  doc.setFontSize(9)
  doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, 14, 29)
  if (dateFrom || dateTo)
    doc.text(`Período: ${dateFrom || '—'} → ${dateTo || '—'}`, 120, 29)

  doc.setTextColor(30, 30, 30)

  autoTable(doc, {
    head: [['Estudiante', 'Grado', 'Representante', 'Monto pendiente', 'Vencimiento', 'Días mora', 'Estado']],
    body: debtors.map(d => [
      d.student.fullName,
      `${d.student.grade}${d.student.section}`,
      d.representativeName || '—',
      `$${d.balance.toFixed(2)}`,
      d.dueDate ? format(d.dueDate, 'dd/MM/yyyy', { locale: es }) : '—',
      d.daysOverdue > 0 ? `${d.daysOverdue} días` : '—',
      d.status === 'red' ? 'Crítico' : 'Advertencia',
    ]),
    startY: 38,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [220, 38, 38] },
    bodyStyles: { valign: 'middle' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 5: { halign: 'center' }, 6: { halign: 'center' } },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const status = debtors[data.row.index]?.status
        if (status === 'red') doc.setTextColor(220, 38, 38)
        else doc.setTextColor(217, 119, 6)
      }
    },
  })

  doc.save(`deudores-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

export default function AdminReports() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'debtors' | 'projection'>('overview')

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', schoolId],
    queryFn: () => getPaymentsBySchool(schoolId, 1000),
    enabled: !!schoolId,
  })
  const { data: students = [] } = useQuery({
    queryKey: ['students', schoolId],
    queryFn: () => getStudentsBySchool(schoolId),
    enabled: !!schoolId,
  })

  // Filtered payments by date range
  const filteredPayments = useMemo(() => {
    let list = payments
    if (dateFrom) list = list.filter(p => toDate(p.createdAt) >= parseISO(dateFrom))
    if (dateTo)   list = list.filter(p => toDate(p.createdAt) <= parseISO(dateTo))
    return list
  }, [payments, dateFrom, dateTo])

  // Filtered students by grade
  const filteredStudents = useMemo(() => {
    if (!gradeFilter) return students
    return students.filter(s => s.grade === gradeFilter)
  }, [students, gradeFilter])

  // KPIs
  const totalBilled   = filteredPayments.reduce((s, p) => s + p.amount, 0)
  const totalCollected = filteredPayments.filter(p => p.status === 'approved').reduce((s, p) => s + (p.amountPaid || 0), 0)
  const totalDebt     = filteredPayments.filter(p => p.status !== 'approved').reduce((s, p) => s + (p.balance || 0), 0)
  const effectiveness = totalBilled > 0 ? Math.round(totalCollected / totalBilled * 100) : 0

  // Monthly income chart
  const monthlyIncome = useMemo(() => {
    const map: Record<string, number> = {}
    filteredPayments.filter(p => p.status === 'approved').forEach(p => {
      const key = format(toDate(p.paidAt || p.createdAt), 'MMM yy', { locale: es })
      map[key] = (map[key] || 0) + (p.amountPaid || 0)
    })
    return Object.entries(map).slice(-12).map(([name, total]) => ({ name, total }))
  }, [filteredPayments])

  // Type breakdown
  const typeBreakdown = useMemo(() => {
    const approved = filteredPayments.filter(p => p.status === 'approved')
    return [
      { name: 'Mensualidades', value: approved.filter(p => p.type === 'monthly').reduce((s, p) => s + (p.amountPaid || 0), 0) },
      { name: 'Inscripciones', value: approved.filter(p => p.type === 'enrollment').reduce((s, p) => s + (p.amountPaid || 0), 0) },
      { name: 'Adicionales',   value: approved.filter(p => p.type === 'additional').reduce((s, p) => s + (p.amountPaid || 0), 0) },
    ]
  }, [filteredPayments])

  // Debtors with days overdue
  const debtors: DebtorRow[] = useMemo(() => {
    const now = new Date()
    return filteredStudents.map(student => {
      const sp = filteredPayments.filter(p => p.studentId === student.id && p.status !== 'approved')
      if (sp.length === 0) return null
      const balance = sp.reduce((s, p) => s + (p.balance || 0), 0)
      if (balance <= 0) return null
      const oldest = sp.reduce<Date | null>((min, p) => {
        if (!p.dueDate) return min
        const d = toDate(p.dueDate)
        return min === null || d < min ? d : min
      }, null)
      const daysOverdue = oldest ? Math.max(0, differenceInDays(now, oldest)) : 0
      return {
        student,
        balance,
        daysOverdue,
        dueDate: oldest,
        status: daysOverdue > 15 ? 'red' : 'yellow',
      } as DebtorRow
    }).filter(Boolean).sort((a, b) => b!.balance - a!.balance) as DebtorRow[]
  }, [filteredStudents, filteredPayments])

  // Projection: average monthly income * growth trend
  const projection = useMemo(() => {
    const monthMap: Record<string, number> = {}
    payments.filter(p => p.status === 'approved').forEach(p => {
      const key = format(toDate(p.paidAt || p.createdAt), 'yyyy-MM')
      monthMap[key] = (monthMap[key] || 0) + (p.amountPaid || 0)
    })
    const sorted = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
    if (sorted.length === 0) return []
    const avg = sorted.reduce((s, [, v]) => s + v, 0) / sorted.length
    const last = sorted[sorted.length - 1]?.[1] ?? avg
    const trend = sorted.length >= 2
      ? (last - (sorted[sorted.length - 2]?.[1] ?? last)) / (sorted[sorted.length - 2]?.[1] ?? 1) * 100
      : 0

    const result = sorted.map(([k, v]) => ({
      name: format(parseISO(`${k}-01`), 'MMM yy', { locale: es }),
      real: v,
      proyectado: null as number | null,
    }))

    const nextDate = addMonths(parseISO(`${last ? sorted[sorted.length - 1][0] : format(new Date(), 'yyyy-MM')}-01`), 1)
    const projected = Math.round(avg * (1 + trend / 100 * 0.5))
    result.push({
      name: format(nextDate, 'MMM yy', { locale: es }),
      real: null as any,
      proyectado: projected,
    })
    return result
  }, [payments])

  const tabs = [
    { id: 'overview',   label: 'Resumen',    icon: BarChart2 },
    { id: 'debtors',    label: 'Deudores',   icon: AlertCircle },
    { id: 'projection', label: 'Proyección', icon: TrendingUp },
  ] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Reportes</h1>
        <div className="flex gap-2">
          <button
            onClick={() => exportReportExcel(payments, format(new Date(), 'yyyy-MM'))}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileDown size={16} className="text-green-600"/> Exportar Excel
          </button>
          <button
            onClick={() => exportEnhancedDebtorsPDF(debtors, appUser?.displayName || 'EduFinance', dateFrom, dateTo)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileText size={16} className="text-red-500"/> Reporte PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={15} className="text-slate-400"/>
          <span className="text-sm font-medium text-slate-600">Filtros</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-slate-400"/>
            <label className="text-xs text-slate-500">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Grado</label>
            <select
              value={gradeFilter}
              onChange={e => setGradeFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          {(dateFrom || dateTo || gradeFilter) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setGradeFilter('') }}
              className="text-xs text-blue-600 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total facturado',   value: `$${totalBilled.toFixed(2)}`,     icon: DollarSign,  color: 'text-blue-600 bg-blue-50'   },
          { label: 'Total cobrado',     value: `$${totalCollected.toFixed(2)}`,  icon: CheckCircle, color: 'text-green-600 bg-green-50' },
          { label: '% Efectividad',     value: `${effectiveness}%`,              icon: TrendingUp,  color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Deuda total',       value: `$${totalDebt.toFixed(2)}`,       icon: AlertCircle, color: 'text-red-500 bg-red-50'     },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{value}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                <Icon size={18}/>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={14}/>{label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-700 mb-4">Ingresos mensuales</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyIncome}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="name" tick={{ fontSize: 11 }}/>
                <YAxis tick={{ fontSize: 11 }}/>
                <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Ingreso']}/>
                <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#g)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-700 mb-4">Por tipo de pago</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis type="number" tick={{ fontSize: 11 }}/>
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90}/>
                <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`]}/>
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab: Debtors */}
      {activeTab === 'debtors' && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">Lista de deudores ({debtors.length})</h2>
            <div className="flex gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"/>Crítico (&gt;15 días)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"/>Advertencia
              </span>
            </div>
          </div>
          {debtors.length === 0
            ? <p className="text-center text-slate-400 text-sm py-10">Sin deudores — ¡excelente!</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {['', 'Estudiante', 'Grado', 'Representante', 'Monto pendiente', 'Vencimiento', 'Días mora', 'Estado'].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {debtors.map((d) => (
                      <tr key={d.student.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className={`w-2.5 h-2.5 rounded-full inline-block ${
                            d.status === 'red' ? 'bg-red-500' : 'bg-amber-400'
                          }`}/>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">{d.student.fullName}</td>
                        <td className="px-4 py-3 text-slate-500">{d.student.grade}{d.student.section}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{d.representativeName || '—'}</td>
                        <td className="px-4 py-3 font-bold text-red-600">${d.balance.toFixed(2)}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {d.dueDate ? format(d.dueDate, 'dd/MM/yyyy', { locale: es }) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {d.daysOverdue > 0
                            ? <span className={`text-xs font-medium ${d.status === 'red' ? 'text-red-600' : 'text-amber-600'}`}>
                                {d.daysOverdue} días
                              </span>
                            : <span className="text-xs text-slate-400">—</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            d.status === 'red'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {d.status === 'red' ? 'Crítico' : 'Advertencia'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      )}

      {/* Tab: Projection */}
      {activeTab === 'projection' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between mb-1">
            <h2 className="font-semibold text-slate-700">Proyección de cobranza</h2>
            <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
              Basado en promedio histórico + tendencia
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-5">
            La barra punteada representa el ingreso proyectado para el próximo mes según el histórico de los últimos 6 meses.
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={projection}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="name" tick={{ fontSize: 11 }}/>
              <YAxis tick={{ fontSize: 11 }}/>
              <Tooltip formatter={(v: number) => [`$${v?.toFixed(2)}`]}/>
              <Legend/>
              <Bar dataKey="real" name="Real" fill="#3b82f6" radius={[4, 4, 0, 0]}/>
              <Bar dataKey="proyectado" name="Proyectado" fill="#a5f3fc" radius={[4, 4, 0, 0]} strokeDasharray="4 2" stroke="#0891b2" strokeWidth={1}/>
            </BarChart>
          </ResponsiveContainer>
          {projection.length > 0 && (() => {
            const last = projection[projection.length - 1]
            return last.proyectado != null ? (
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
                <TrendingUp size={20} className="text-blue-600 shrink-0"/>
                <p className="text-sm text-blue-700">
                  Ingreso proyectado para <strong>{last.name}</strong>:{' '}
                  <strong>${last.proyectado.toFixed(2)}</strong>
                </p>
              </div>
            ) : null
          })()}
        </div>
      )}
    </div>
  )
}
