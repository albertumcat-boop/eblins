import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getPaymentsBySchool, getStudentsBySchool, getPendingPayments, getUsersBySchool } from '@/services/db'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import { DollarSign, AlertCircle, Clock, Users, TrendingUp, TrendingDown, GraduationCap, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)

function StatCard({ icon: Icon, label, value, sub, color = 'blue', trend }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string; trend?: number
}) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {trend >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
              {Math.abs(trend)}% vs mes anterior
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={20}/>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', schoolId],
    queryFn: () => getPaymentsBySchool(schoolId, 500),
    enabled: !!schoolId,
  })
  const { data: students = [] } = useQuery({
    queryKey: ['students', schoolId],
    queryFn: () => getStudentsBySchool(schoolId),
    enabled: !!schoolId,
  })
  const { data: pending = [] } = useQuery({
    queryKey: ['pending-payments', schoolId],
    queryFn: () => getPendingPayments(schoolId),
    enabled: !!schoolId,
  })
  const { data: users = [] } = useQuery({
    queryKey: ['users', schoolId],
    queryFn: () => getUsersBySchool(schoolId),
    enabled: !!schoolId,
  })

  const approved = payments.filter(p => p.status === 'approved')
  const rejected = payments.filter(p => p.status === 'rejected')
  const totalIncome = approved.reduce((s, p) => s + (p.amountPaid || 0), 0)
  const totalDebt = payments.filter(p => p.status !== 'approved').reduce((s, p) => s + (p.balance || 0), 0)

  const now = new Date()
  const thisMonth = { start: startOfMonth(now), end: endOfMonth(now) }
  const lastMonth = { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) }

  const incomeThisMonth = approved
    .filter(p => isWithinInterval(toDate(p.paidAt || p.createdAt), thisMonth))
    .reduce((s, p) => s + (p.amountPaid || 0), 0)
  const incomeLastMonth = approved
    .filter(p => isWithinInterval(toDate(p.paidAt || p.createdAt), lastMonth))
    .reduce((s, p) => s + (p.amountPaid || 0), 0)
  const incomeTrend = incomeLastMonth > 0
    ? Math.round(((incomeThisMonth - incomeLastMonth) / incomeLastMonth) * 100)
    : 0

  const collectionRate = totalIncome + totalDebt > 0
    ? Math.round((totalIncome / (totalIncome + totalDebt)) * 100)
    : 0

  const debtors = students.filter(student => {
    const sp = payments.filter(p => p.studentId === student.id && p.status !== 'approved')
    return sp.length > 0
  })

  const monthlyData = (() => {
    const months: { name: string; ingresos: number; deuda: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(now, i)
      const interval = { start: startOfMonth(month), end: endOfMonth(month) }
      const ingresos = approved
        .filter(p => isWithinInterval(toDate(p.paidAt || p.createdAt), interval))
        .reduce((s, p) => s + (p.amountPaid || 0), 0)
      const deuda = payments
        .filter(p => p.status !== 'approved' && isWithinInterval(toDate(p.createdAt), interval))
        .reduce((s, p) => s + (p.balance || 0), 0)
      months.push({ name: format(month, 'MMM', { locale: es }), ingresos, deuda })
    }
    return months
  })()

  const byGrade = (() => {
    const map: Record<string, { total: number; paid: number }> = {}
    students.forEach(student => {
      const grade = `${student.grade}${student.section}`
      if (!map[grade]) map[grade] = { total: 0, paid: 0 }
      const sp = payments.filter(p => p.studentId === student.id)
      map[grade].total += sp.reduce((s, p) => s + (p.amount || 0), 0)
      map[grade].paid  += sp.filter(p => p.status === 'approved').reduce((s, p) => s + (p.amountPaid || 0), 0)
    })
    return Object.entries(map).map(([grade, { total, paid }]) => ({
      grade,
      mora: total > 0 ? Math.round(((total - paid) / total) * 100) : 0,
      pagado: total > 0 ? Math.round((paid / total) * 100) : 0,
    })).sort((a, b) => b.mora - a.mora)
  })()

  const pieData = [
    { name: 'Aprobados',  value: approved.length },
    { name: 'En revisión', value: pending.length },
    { name: 'Pendientes', value: payments.filter(p => p.status === 'pending').length },
    { name: 'Rechazados', value: rejected.length },
  ]
  const PIE_COLORS = ['#16a34a', '#d97706', '#6b7280', '#dc2626']

  const representatives = users.filter(u => u.role === 'representative')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Ingresos totales"    value={`$${totalIncome.toFixed(2)}`}    color="green"  trend={incomeTrend}/>
        <StatCard icon={AlertCircle} label="Deuda pendiente"    value={`$${totalDebt.toFixed(2)}`}      color="red"/>
        <StatCard icon={TrendingUp}  label="Tasa de cobro"      value={`${collectionRate}%`}             color="blue"   sub="del total facturado"/>
        <StatCard icon={Clock}       label="En revisión"        value={pending.length}                   color="amber"  sub="Requieren aprobación"/>
      </div>

      {/* KPIs secundarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={GraduationCap} label="Estudiantes"      value={students.length}                  color="purple"/>
        <StatCard icon={Users}         label="Representantes"   value={representatives.length}            color="blue"/>
        <StatCard icon={AlertCircle}   label="Deudores"         value={debtors.length}                   color="red"    sub={`de ${students.length} estudiantes`}/>
        <StatCard icon={CheckCircle}   label="Pagos aprobados"  value={approved.length}                  color="green"  sub="total histórico"/>
      </div>

      {/* Gráficas principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Ingresos vs Deuda — últimos 6 meses</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="gIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gDeuda" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#dc2626" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="name" tick={{ fontSize: 12 }}/>
              <YAxis tick={{ fontSize: 12 }}/>
              <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`]}/>
              <Legend/>
              <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#16a34a" fill="url(#gIngresos)" strokeWidth={2}/>
              <Area type="monotone" dataKey="deuda"    name="Deuda"    stroke="#dc2626" fill="url(#gDeuda)"    strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Estado de pagos</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]}/>)}
              </Pie>
              <Tooltip/>
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }}/>
                  <span className="text-slate-600">{d.name}</span>
                </div>
                <span className="font-medium text-slate-700">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Morosidad por grado */}
      {byGrade.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Morosidad por grado</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byGrade} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`}/>
              <YAxis dataKey="grade" type="category" tick={{ fontSize: 11 }} width={50}/>
              <Tooltip formatter={(v: number) => [`${v}%`]}/>
              <Legend/>
              <Bar dataKey="pagado" name="Pagado %"  fill="#16a34a" radius={[0, 4, 4, 0]} stackId="a"/>
              <Bar dataKey="mora"   name="Mora %"    fill="#dc2626" radius={[0, 4, 4, 0]} stackId="a"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Resumen financiero del mes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 mb-4">
            Resumen — {format(now, 'MMMM yyyy', { locale: es })}
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Ingresos del mes',    value: `$${incomeThisMonth.toFixed(2)}`,  cls: 'text-green-600' },
              { label: 'Mes anterior',        value: `$${incomeLastMonth.toFixed(2)}`,  cls: 'text-slate-600' },
              { label: 'Variación',           value: `${incomeTrend > 0 ? '+' : ''}${incomeTrend}%`, cls: incomeTrend >= 0 ? 'text-green-600' : 'text-red-500' },
              { label: 'Pagos aprobados hoy', value: approved.filter(p => format(toDate(p.paidAt || p.createdAt), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')).length, cls: 'text-blue-600' },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-600">{label}</span>
                <span className={`font-bold text-sm ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pagos pendientes de aprobación */}
        <div className="bg-white rounded-xl border border-amber-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <Clock size={16} className="text-amber-500"/>
              Pendientes de aprobación ({pending.length})
            </h2>
            <Link to="/payments" className="text-sm text-blue-600 hover:underline">Ver todos</Link>
          </div>
          {pending.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <CheckCircle size={28} className="mx-auto mb-2 opacity-30"/>
              <p className="text-sm">Todo al día</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pending.slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-50 border border-amber-100">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{p.description || p.monthLabel}</p>
                    <p className="text-xs text-slate-500">${(p.amountPaid || 0).toFixed(2)} enviado</p>
                  </div>
                  <Link to="/payments" className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                    Revisar
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
