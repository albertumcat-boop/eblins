import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import {
  getStudentsByRepresentative, createStudent, generateMonthlyPayments,
  checkAndCreatePaymentReminders, getPaymentsByRepresentative, getNotificationsByUser,
  linkRepresentativeToStudents,
} from '@/services/db'
import { Link } from 'react-router-dom'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  GraduationCap, ArrowRight, Plus, X, AlertTriangle, Clock,
  CheckCircle, Bell, CreditCard, Info, Megaphone
} from 'lucide-react'
import type { Notification } from '@/types'

const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()
const GRADES   = ['1er','2do','3er','4to','5to','6to','7mo','8vo','9no','10mo','11vo','12vo']
const SECTIONS = ['A','B','C','D','E']

const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function avatarColor(name: string) {
  const colors = [
    'bg-blue-500','bg-indigo-500','bg-purple-500','bg-pink-500',
    'bg-rose-500','bg-orange-500','bg-teal-500','bg-cyan-500',
  ]
  let hash = 0
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

const NOTIF_ICONS: Record<string, React.ElementType> = {
  payment:      CreditCard,
  message:      Bell,
  announcement: Megaphone,
  system:       Info,
}

export default function RepresentativeDashboard() {
  const { appUser } = useAuth()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    fullName: '', grade: '1er', section: 'A', schoolYear: '2024-2025'
  })

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['my-students', appUser?.id],
    queryFn: () => getStudentsByRepresentative(appUser!.id, appUser!.schoolId),
    enabled: !!appUser?.id,
  })

  const { data: allPayments = [] } = useQuery({
    queryKey: ['payments', appUser?.schoolId, appUser?.id],
    queryFn: () => getPaymentsByRepresentative(appUser!.schoolId, appUser!.id),
    enabled: !!appUser?.schoolId && !!appUser?.id,
  })

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', appUser?.id],
    queryFn: () => getNotificationsByUser(appUser!.id),
    enabled: !!appUser?.id,
  })

  useEffect(() => {
    if (appUser?.schoolId) {
      generateMonthlyPayments(appUser.schoolId).catch(() => {})
      checkAndCreatePaymentReminders(appUser.schoolId, appUser.id).catch(() => {})
      // Auto-link any students imported before this rep registered
      if (appUser.email) {
        linkRepresentativeToStudents(appUser.id, appUser.email, appUser.schoolId)
          .then(count => { if (count > 0) qc.invalidateQueries({ queryKey: ['my-students'] }) })
          .catch(() => {})
      }
    }
  }, [appUser?.schoolId])

  const createMut = useMutation({
    mutationFn: () => createStudent({
      fullName:         form.fullName,
      grade:            form.grade,
      section:          form.section,
      schoolYear:       form.schoolYear,
      schoolId:         appUser!.schoolId,
      representativeId: appUser!.id,
      enrollmentCode:   generateCode(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-students'] })
      setShowModal(false)
      setForm({ fullName: '', grade: '1er', section: 'A', schoolYear: '2024-2025' })
    },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  // My students IDs
  const myStudentIds = students.map(s => s.id)

  // Payments that belong to my students
  const myPayments = allPayments.filter(p => myStudentIds.includes(p.studentId))

  // Overdue payments
  const now = new Date()
  const overduePayments = myPayments.filter(p =>
    p.status !== 'approved' && p.dueDate && toDate(p.dueDate) < now
  )
  const overdueTotal = overduePayments.reduce((s, p) => s + (p.balance || 0), 0)

  // Next 3 upcoming due dates (not overdue, not approved)
  const upcoming = myPayments
    .filter(p => p.status !== 'approved' && p.dueDate && toDate(p.dueDate) >= now)
    .sort((a, b) => toDate(a.dueDate).getTime() - toDate(b.dueDate).getTime())
    .slice(0, 3)

  // Per-student debt
  const studentDebt = (studentId: string) => {
    const sp = myPayments.filter(p => p.studentId === studentId)
    const debt = sp.filter(p => p.status !== 'approved').reduce((s, p) => s + (p.balance || 0), 0)
    return debt
  }

  // Recent notifications (3)
  const recentNotifs = [...notifications]
    .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
    .slice(0, 3) as Notification[]

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Bienvenido, {appUser?.displayName?.split(' ')[0]}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16}/> Agregar hijo
        </button>
      </div>

      {/* Overdue alert */}
      {overdueTotal > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-red-600"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-red-800">Tienes pagos vencidos</p>
            <p className="text-sm text-red-600 mt-0.5">
              Monto total vencido: <strong>${overdueTotal.toFixed(2)}</strong>
              {' — '}{overduePayments.length} pago{overduePayments.length !== 1 ? 's' : ''} pendiente{overduePayments.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            to="/payments"
            className="shrink-0 bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-red-700 whitespace-nowrap"
          >
            Pagar ahora
          </Link>
        </div>
      )}

      {/* Payment timeline */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-blue-500"/> Próximos vencimientos
          </h2>
          <div className="space-y-3">
            {upcoming.map(p => {
              const due = toDate(p.dueDate)
              const days = differenceInDays(due, now)
              const color = days > 7 ? 'green' : days >= 0 ? 'yellow' : 'red'
              const colorMap = {
                green:  { bar: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  label: `${days} días` },
                yellow: { bar: 'bg-amber-400',  text: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  label: `${days} días` },
                red:    { bar: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    label: 'Vencido'     },
              }[color]
              const student = students.find(s => s.id === p.studentId)
              return (
                <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border ${colorMap.bg} ${colorMap.border}`}>
                  <div className={`w-1 h-10 rounded-full ${colorMap.bar} shrink-0`}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {p.description || p.monthLabel}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {student?.fullName} · Vence {format(due, "dd/MM/yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-800">${(p.balance || p.amount).toFixed(2)}</p>
                    <p className={`text-xs font-medium ${colorMap.text}`}>{colorMap.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Students */}
      {students.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <GraduationCap size={40} className="mx-auto mb-3 opacity-30"/>
          <p className="font-medium text-slate-600">No tienes hijos registrados</p>
          <p className="text-sm mt-1">Haz clic en "Agregar hijo" para comenzar</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 mx-auto"
          >
            <Plus size={16}/> Agregar hijo
          </button>
        </div>
      ) : (
        <>
          <h2 className="font-semibold text-slate-700">Mis hijos</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {students.map(s => {
              const debt = studentDebt(s.id)
              const hasDebt = debt > 0
              return (
                <div key={s.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg ${avatarColor(s.fullName)}`}>
                        {getInitials(s.fullName)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{s.fullName}</h3>
                        <p className="text-blue-200 text-sm">
                          {s.grade}{s.section} · {s.schoolYear} · #{s.enrollmentCode}
                        </p>
                      </div>
                      <div className="ml-auto">
                        {hasDebt ? (
                          <span className="bg-red-500 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                            Con deuda
                          </span>
                        ) : (
                          <span className="bg-green-500 text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle size={11}/> Al día
                          </span>
                        )}
                      </div>
                    </div>
                    {hasDebt && (
                      <div className="mt-3 bg-white/10 rounded-xl px-3 py-2">
                        <p className="text-white/80 text-xs">Deuda pendiente</p>
                        <p className="text-white font-bold">${debt.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
                    <Link
                      to={`/student/${s.id}`}
                      className="flex-1 text-center text-sm text-blue-600 font-medium py-2 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-1"
                    >
                      Ver detalle <ArrowRight size={14}/>
                    </Link>
                    <Link
                      to="/payments"
                      className="flex-1 text-center text-sm bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700"
                    >
                      Ver pagos
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Recent notifications */}
      {recentNotifs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <Bell size={16} className="text-blue-500"/> Últimas notificaciones
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentNotifs.map(n => {
              const Icon = NOTIF_ICONS[n.type] || Info
              const iconColor = {
                payment: 'text-green-600 bg-green-50',
                message: 'text-blue-600 bg-blue-50',
                announcement: 'text-purple-600 bg-purple-50',
                system: 'text-slate-600 bg-slate-100',
              }[n.type] || 'text-slate-600 bg-slate-100'
              return (
                <div key={n.id} className={`px-5 py-3.5 flex items-start gap-3 ${!n.read ? 'bg-blue-50/30' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
                    <Icon size={15}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{n.body}</p>
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">
                    {format(toDate(n.createdAt), "d MMM", { locale: es })}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal: add child */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Registrar hijo</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20}/>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Nombre completo</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre completo del estudiante"
                  value={form.fullName} onChange={set('fullName')}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Grado</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.grade} onChange={set('grade')}
                  >
                    {GRADES.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Sección</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.section} onChange={set('section')}
                  >
                    {SECTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Año escolar</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2024-2025"
                  value={form.schoolYear} onChange={set('schoolYear')}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                disabled={!form.fullName || createMut.isPending}
                onClick={() => createMut.mutate()}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {createMut.isPending ? 'Registrando...' : 'Registrar hijo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
