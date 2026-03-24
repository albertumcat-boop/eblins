import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsByRepresentative, getPaymentsByStudent } from '@/services/db'
import { Link } from 'react-router-dom'
import { format, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import { GraduationCap, AlertCircle, ArrowRight } from 'lucide-react'
import type { Student } from '@/types'

const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = { approved: 'bg-green-500', in_review: 'bg-amber-400', pending: 'bg-slate-300', rejected: 'bg-red-400' }
  return <span className={`w-2 h-2 rounded-full shrink-0 ${colors[status] || 'bg-slate-300'}`}/>
}

function StudentFinancialCard({ student }: { student: Student }) {
  const { data: payments = [] } = useQuery({ queryKey: ['student-payments', student.id], queryFn: () => getPaymentsByStudent(student.id) })
  const totalDebt = payments.filter(p => p.status !== 'approved').reduce((s, p) => s + (p.balance || 0), 0)
  const overdue = payments.filter(p => p.status === 'pending' && p.dueDate && isAfter(new Date(), toDate(p.dueDate)))
  const inReview = payments.filter(p => p.status === 'in_review')
  const approved = payments.filter(p => p.status === 'approved')

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"><GraduationCap size={22} className="text-white"/></div>
          <div>
            <h3 className="font-bold text-white">{student.fullName}</h3>
            <p className="text-blue-200 text-sm">{student.grade}{student.section} · {student.schoolYear} · #{student.enrollmentCode}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-slate-100">
        {[
          { label: 'Deuda total', value: `$${totalDebt.toFixed(2)}`, cls: totalDebt > 0 ? 'text-red-600' : 'text-green-600' },
          { label: 'Pagos aprobados', value: approved.length, cls: 'text-green-600' },
          { label: 'Vencidos', value: overdue.length, cls: overdue.length > 0 ? 'text-red-500' : 'text-slate-400' },
          { label: 'En revisión', value: inReview.length, cls: inReview.length > 0 ? 'text-amber-500' : 'text-slate-400' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-white px-4 py-3">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`text-xl font-bold mt-0.5 ${cls}`}>{value}</p>
          </div>
        ))}
      </div>
      {overdue.length > 0 && (
        <div className="mx-4 my-3 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0"/>
          <div>
            <p className="text-sm font-medium text-red-700">Tienes {overdue.length} pago(s) vencido(s)</p>
            <p className="text-xs text-red-500 mt-0.5">Evita multas por mora subiendo el comprobante</p>
          </div>
        </div>
      )}
      {payments.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Últimos pagos</p>
          <div className="space-y-2">
            {payments.slice(0, 3).map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><StatusDot status={p.status}/><span className="text-sm text-slate-700">{p.description || p.monthLabel}</span></div>
                <span className="text-sm font-medium text-slate-600">${p.amount?.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
        <Link to={`/student/${student.id}`} className="flex-1 text-center text-sm text-blue-600 font-medium py-2 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-1">
          Ver detalle <ArrowRight size={14}/>
        </Link>
        <Link to="/payments" className="flex-1 text-center text-sm bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700">
          Registrar pago
        </Link>
      </div>
    </div>
  )
}

export default function RepresentativeDashboard() {
  const { appUser } = useAuth()
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['my-students', appUser?.id],
    queryFn: () => getStudentsByRepresentative(appUser!.id),
    enabled: !!appUser?.id,
  })

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Bienvenido, {appUser?.displayName?.split(' ')[0]}</h1>
        <p className="text-slate-500 text-sm mt-1">{format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
      </div>
      {students.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <GraduationCap size={40} className="mx-auto mb-3 opacity-30"/>
          <p className="font-medium text-slate-600">Sin estudiantes registrados</p>
          <p className="text-sm mt-1">Contacta al administrador para vincular a tus hijos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {students.map(s => <StudentFinancialCard key={s.id} student={s}/>)}
        </div>
      )}
    </div>
  )
}
