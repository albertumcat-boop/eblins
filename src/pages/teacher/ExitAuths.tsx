import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getExitAuthsByClass, updateExitAuthStatus } from '@/services/db'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { LogOut, CheckCircle, XCircle, Clock, MessageSquare, X } from 'lucide-react'
import clsx from 'clsx'

const STATUS = {
  pending:  { label: 'Pendiente',  color: 'bg-amber-100 text-amber-700',  icon: Clock },
  approved: { label: 'Aprobada',   color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  rejected: { label: 'Rechazada',  color: 'bg-red-100 text-red-700',      icon: XCircle },
}

export default function TeacherExitAuths() {
  const { appUser } = useAuth()
  const qc = useQueryClient()
  const [notes, setNotes] = useState('')
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const grade = appUser?.assignedGrade || ''
  const section = appUser?.assignedSection || ''

  const { data: auths = [], isLoading } = useQuery({
    queryKey: ['exit-auths-teacher', appUser?.schoolId, grade, section],
    queryFn: () => getExitAuthsByClass(appUser!.schoolId, grade, section),
    enabled: !!appUser?.schoolId && !!grade,
  })

  const handleApprove = async (id: string) => {
    setUpdating(id)
    try {
      await updateExitAuthStatus(id, 'approved')
      toast.success('Autorización aprobada')
      qc.invalidateQueries({ queryKey: ['exit-auths-teacher'] })
    } catch { toast.error('Error') }
    finally { setUpdating(null) }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    setUpdating(rejectTarget)
    try {
      await updateExitAuthStatus(rejectTarget, 'rejected', notes)
      toast.success('Autorización rechazada')
      setRejectTarget(null)
      setNotes('')
      qc.invalidateQueries({ queryKey: ['exit-auths-teacher'] })
    } catch { toast.error('Error') }
    finally { setUpdating(null) }
  }

  const pending = auths.filter((a: any) => a.status === 'pending')
  const reviewed = auths.filter((a: any) => a.status !== 'pending')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Autorizaciones de Salida</h1>
          {grade && <p className="text-sm text-slate-500 mt-0.5">{grade} — Sección {section}</p>}
        </div>
        {pending.length > 0 && (
          <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            {pending.length} pendiente{pending.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {!grade && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          Asigna tu clase para ver las autorizaciones de tus estudiantes.
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : auths.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <LogOut size={36} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">Sin solicitudes de salida</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">Pendientes de revisión</h2>
              <div className="space-y-3">
                {pending.map((a: any) => <AuthCard key={a.id} auth={a} onApprove={handleApprove} onReject={id => { setRejectTarget(id); setNotes('') }} updating={updating}/>)}
              </div>
            </div>
          )}
          {reviewed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">Revisadas</h2>
              <div className="space-y-3">
                {reviewed.map((a: any) => <AuthCard key={a.id} auth={a} onApprove={handleApprove} onReject={id => { setRejectTarget(id); setNotes('') }} updating={updating}/>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Rechazar autorización</h3>
              <button onClick={() => setRejectTarget(null)}><X size={18} className="text-slate-400"/></button>
            </div>
            <p className="text-sm text-slate-500 mb-3">Puedes dejar una nota para el representante (opcional).</p>
            <textarea rows={3} placeholder="Motivo del rechazo..."
              value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"/>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRejectTarget(null)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm">Cancelar</button>
              <button onClick={handleReject} disabled={!!updating}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AuthCard({ auth: a, onApprove, onReject, updating }: {
  auth: any
  onApprove: (id: string) => void
  onReject: (id: string) => void
  updating: string | null
}) {
  const cfg = STATUS[a.status as keyof typeof STATUS] || STATUS.pending
  const Icon = cfg.icon
  return (
    <div className={clsx('bg-white rounded-xl border p-4', a.status === 'pending' ? 'border-amber-200' : 'border-slate-200')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800">{a.studentName}</p>
            <span className={clsx('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', cfg.color)}>
              <Icon size={11}/>{cfg.label}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {format(new Date(a.date + 'T00:00:00'), "EEEE d MMM", { locale: es })} · Salida {a.exitTime}
            {a.returnTime && ` · Retorno ${a.returnTime}`}
          </p>
          <p className="text-sm text-slate-600 mt-1"><span className="font-medium">Motivo:</span> {a.reason}</p>
          <p className="text-sm text-slate-600">
            <span className="font-medium">Retira:</span> {a.authorizedPerson}
            {a.authorizedPersonId && ` · CI: ${a.authorizedPersonId}`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Solicitado por {a.representativeName}</p>
          {a.notes && <p className="text-xs text-slate-500 italic mt-1">Nota: {a.notes}</p>}
        </div>
        {a.status === 'pending' && (
          <div className="flex flex-col gap-2 shrink-0">
            <button onClick={() => onApprove(a.id)} disabled={updating === a.id}
              className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
              <CheckCircle size={13}/>Aprobar
            </button>
            <button onClick={() => onReject(a.id)} disabled={updating === a.id}
              className="flex items-center gap-1 border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-50 disabled:opacity-50">
              <XCircle size={13}/>Rechazar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
