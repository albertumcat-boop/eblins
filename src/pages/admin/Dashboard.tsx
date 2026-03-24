import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getPaymentsBySchool, getStudentsBySchool, getPendingPayments } from '@/services/db'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { DollarSign, AlertCircle, Clock, Users, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }: { icon: any; label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600',
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}><Icon size={20}/></div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''

  const { data: payments = [] } = useQuery({ queryKey: ['payments', schoolId], queryFn: () => getPaymentsBySchool(schoolId, 500), enabled: !!schoolId })
  const { data: students = [] } = useQuery({ queryKey: ['students', schoolId], queryFn: () => getStudentsBySchool(schoolId), enabled: !!schoolId })
  const { data: pending = [] } = useQuery({ queryKey: ['pending-payments', schoolId], queryFn: () => getPendingPayments(schoolId), enabled: !!schoolId })

  const approved = payments.filter(p => p.status === 'approved')
  const totalIncome = approved.reduce((s, p) => s + (p.amountPaid || 0), 0)
  const totalDebt = payments.filter(p => p.status !== 'approved').reduce((s, p) => s + (p.balance || 0), 0)

  const monthlyData = (() => {
    const map: Record<string, number> = {}
    approved.forEach(p => {
      const key = format(toDate(p.paidAt || p.createdAt), 'MMM', { locale: es })
      map[key] = (map[key] || 0) + (p.amountPaid || 0)
    })
    return Object.entries(map).slice(-6).map(([name, total]) => ({ name, total }))
  })()

  const pieData = [
    { name: 'Aprobados', value: payments.filter(p => p.status === 'approved').length },
    { name: 'En revisión', value: payments.filter(p => p.status === 'in_review').length },
    { name: 'Pendientes', value: payments.filter(p => p.status === 'pending').length },
    { name: 'Rechazados', value: payments.filter(p => p.status === 'rejected').length },
  ]
  const PIE_COLORS = ['#16a34a', '#d97706', '#6b7280', '#dc2626']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">{format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Ingresos totales" value={`$${totalIncome.toFixed(2)}`} color="green"/>
        <StatCard icon={AlertCircle} label="Deuda pendiente" value={`$${totalDebt.toFixed(2)}`} color="red"/>
        <StatCard icon={Clock} label="En revisión" value={pending.length} sub="Requieren aprobación" color="amber"/>
        <StatCard icon={Users} label="Estudiantes" value={students.length} color="blue"/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Ingresos por mes</h2>
          {monthlyData.length === 0
            ? <p className="text-slate-400 text-sm text-center py-10">Sin datos aún</p>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }}/>
                  <YAxis tick={{ fontSize: 12 }}/>
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Ingreso']}/>
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]}/>
                </BarChart>
              </ResponsiveContainer>}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Estado de pagos</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
              {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]}/>)}
            </Pie><Tooltip/></PieChart>
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
      {pending.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <Clock size={16} className="text-amber-500"/>
              Pagos pendientes de aprobación ({pending.length})
            </h2>
            <Link to="/payments" className="text-sm text-blue-600 flex items-center gap-1">Ver todos <ArrowRight size={14}/></Link>
          </div>
          <div className="space-y-2">
            {pending.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-50 border border-amber-100">
                <div>
                  <p className="text-sm font-medium text-slate-700">{p.description}</p>
                  <p className="text-xs text-slate-500">${p.amountPaid?.toFixed(2)} pagado — saldo ${p.balance?.toFixed(2)}</p>
                </div>
                <Link to="/payments" className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">Revisar</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
