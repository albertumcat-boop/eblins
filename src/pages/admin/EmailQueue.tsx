import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getEmailQueue, markEmailSent } from '@/services/emailService'
import type { EmailJob } from '@/services/emailService'
import { Mail, CheckCircle, XCircle, Clock, RefreshCw, Info } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

type StatusFilter = 'all' | 'pending' | 'sent' | 'failed'

const TYPE_LABELS: Record<EmailJob['type'], string> = {
  payment_approved: 'Pago aprobado',
  payment_rejected: 'Pago rechazado',
  payment_reminder: 'Recordatorio de pago',
  announcement: 'Anuncio',
  welcome: 'Bienvenida',
}

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', icon: Clock, cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  sent:    { label: 'Enviado',   icon: CheckCircle, cls: 'bg-green-50 text-green-700 border border-green-200' },
  failed:  { label: 'Fallido',   icon: XCircle, cls: 'bg-red-50 text-red-700 border border-red-200' },
}

export default function AdminEmailQueue() {
  const { appUser } = useAuth()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [marking, setMarking] = useState<string | null>(null)

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['emailQueue', appUser?.schoolId],
    queryFn: () => getEmailQueue(appUser!.schoolId),
    enabled: !!appUser?.schoolId,
  })

  const filtered = filter === 'all' ? emails : emails.filter(e => e.status === filter)
  const pendingCount = emails.filter(e => e.status === 'pending').length

  const handleMarkSent = async (email: EmailJob) => {
    if (!email.id) return
    setMarking(email.id)
    try {
      await markEmailSent(email.id)
      toast.success('Marcado como enviado')
      qc.invalidateQueries({ queryKey: ['emailQueue'] })
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setMarking(null)
    }
  }

  const formatDate = (createdAt: any) => {
    if (!createdAt) return '—'
    const d = createdAt.toDate ? createdAt.toDate() : new Date(createdAt)
    return format(d, "d MMM yyyy, HH:mm", { locale: es })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Mail size={24} className="text-blue-600" />
            Cola de Emails
            {pendingCount > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Emails en espera de envío a través de Resend</p>
        </div>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['emailQueue'] })}
          className="flex items-center gap-1.5 text-sm border border-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50">
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Instrucciones Cloud Functions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800 space-y-1">
          <p className="font-semibold">Cómo configurar el envío automático con Resend</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>Crea una cuenta en <strong>resend.com</strong> y obtén tu API Key.</li>
            <li>Despliega una Cloud Function en Firebase que escuche la colección <code className="bg-blue-100 px-1 rounded">emailQueue</code> con status <code className="bg-blue-100 px-1 rounded">pending</code>.</li>
            <li>En la función, usa el SDK de Resend para enviar el email y luego actualiza el documento a <code className="bg-blue-100 px-1 rounded">status: "sent"</code>.</li>
            <li>Mientras tanto, usa el botón <strong>"Marcar como enviado"</strong> para gestión manual.</li>
          </ol>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'sent', 'failed'] as StatusFilter[]).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              filter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-700 hover:border-blue-300'
            }`}>
            {s === 'all' ? `Todos (${emails.length})` : s === 'pending' ? `Pendientes (${emails.filter(e => e.status === 'pending').length})` : s === 'sent' ? `Enviados (${emails.filter(e => e.status === 'sent').length})` : `Fallidos (${emails.filter(e => e.status === 'failed').length})`}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Mail size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay emails en esta categoría</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Destinatario</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Asunto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(email => {
                  const sc = STATUS_CONFIG[email.status]
                  const StatusIcon = sc.icon
                  return (
                    <tr key={email.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-700 font-medium">{email.to}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{email.subject}</td>
                      <td className="px-4 py-3 text-slate-600">{TYPE_LABELS[email.type] || email.type}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sc.cls}`}>
                          <StatusIcon size={12} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(email.createdAt)}</td>
                      <td className="px-4 py-3">
                        {email.status === 'pending' && (
                          <button
                            onClick={() => handleMarkSent(email)}
                            disabled={marking === email.id}
                            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                            <CheckCircle size={12} />
                            {marking === email.id ? 'Guardando...' : 'Marcar enviado'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
