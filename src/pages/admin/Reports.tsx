import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getPaymentsBySchool, getStudentsBySchool } from '@/services/db'
import { exportDebtorsPDF, exportReportExcel } from '@/utils/exports'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { FileDown, FileText, TrendingUp, Users, AlertCircle, DollarSign } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)

export default function AdminReports() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''
  const [selectedMonth] = useState(format(new Date(), 'yyyy-MM'))

  const { data: payments = [] } = useQuery({ queryKey: ['payments', schoolId], queryFn: () => getPaymentsBySchool(schoolId, 1000), enabled: !!schoolId })
  const { data: students = [] } = useQuery({ queryKey: ['students', schoolId], queryFn: () => getStudentsBySchool(schoolId), enabled: !!schoolId })

  const monthlyIncome = (() => {
    const map: Record<string, number> = {}
    payments.filter(p => p.status === 'approved').forEach(p => {
      const key = format(toDate(p.paidAt || p.createdAt), 'MMM yy', { locale: es })
      map[key] = (map[key] || 0) + (p.amountPaid || 0)
    })
    return Object.entries(map).slice(-12).map(([name, total]) => ({ name, total }))
  })()

  const typeBreakdown = (() => {
    const approved = payments.filter(p => p.status === 'approved')
    return [
      { name: 'Mensualidades', value: approved.filter(p => p.type === 'monthly').reduce((s, p) => s + p.amountPaid, 0) },
      { name: 'Inscripciones', value: approved.filter(p => p.type === 'enrollment').reduce((s, p) => s + p.amountPaid, 0) },
      { name: 'Adicionales',   value: approved.filter(p => p.type === 'additional').reduce((s, p) => s + p.amountPaid, 0) },
    ]
  })()

  const debtors = students.map(student => {
    const sp = payments.filter(p => p.studentId === student.id)
    const balance = sp.filter(p => p.status !== 'approved').reduce((s, p) => s + (p.balance || 0), 0)
    return { student, balance, payments: sp }
  }).filter(d => d.balance > 0).sort((a, b) => b.balance - a.balance)

  const totalApproved = payments.filter(p => p.status === 'approved').reduce((s, p) => s + p.amountPaid, 0)
  const totalPending  = payments.filter(p => p.status !== 'approved').reduce((s, p) => s + (p.balance || 0), 0)
  const collectionRate = totalApproved + totalPending > 0 ? Math.round(totalApproved / (totalApproved + totalPending) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Reportes</h1>
        <div className="flex gap-2">
          <button onClick={() => exportReportExcel(payments, selectedMonth)} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
            <FileDown size={16} className="text-green-600"/> Exportar Excel
          </button>
          <button onClick={() => exportDebtorsPDF(debtors)} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
            <FileText size={16} className="text-red-500"/> Reporte deudores PDF
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos totales', value: `$${totalApproved.toFixed(2)}`, icon: DollarSign, color: 'text-green-600 bg-green-50' },
          { label: 'Deuda pendiente', value: `$${totalPending.toFixed(2)}`,  icon: AlertCircle, color: 'text-red-500 bg-red-50' },
          { label: 'Tasa de cobro',   value: `${collectionRate}%`,           icon: TrendingUp,  color: 'text-blue-600 bg-blue-50' },
          { label: 'Deudores',        value: debtors.length,                 icon: Users,       color: 'text-amber-600 bg-amber-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-bold text-slate-800 mt-1">{value}</p></div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}><Icon size={18}/></div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Ingresos mensuales</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyIncome}>
              <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="name" tick={{ fontSize: 11 }}/><YAxis tick={{ fontSize: 11 }}/>
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
              <XAxis type="number" tick={{ fontSize: 11 }}/><YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90}/>
              <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`]}/>
              <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-700">Lista de deudores ({debtors.length})</h2></div>
        {debtors.length === 0 ? <p className="text-center text-slate-400 text-sm py-10">Sin deudores — ¡excelente!</p>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-slate-50"><tr>{['Estudiante','Grado','Matrícula','Deuda total','Pagos pendientes'].map(h => (
              <th key={h} className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">{h}</th>
            ))}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {debtors.map(({ student, balance, payments: sp }) => (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{student.fullName}</td>
                  <td className="px-4 py-3 text-slate-500">{student.grade}{student.section}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{student.enrollmentCode}</td>
                  <td className="px-4 py-3 font-bold text-red-600">${balance.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-600">{sp.filter(p => p.status === 'pending' || p.status === 'rejected').length}</td>
                </tr>
              ))}
            </tbody>
          </table></div>}
      </div>
    </div>
  )
}
