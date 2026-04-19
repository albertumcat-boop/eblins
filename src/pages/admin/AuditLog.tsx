import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { db } from '@/services/firebase'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Shield, CreditCard, Users, GraduationCap, MessageSquare, Settings } from 'lucide-react'

const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)

const ACTION_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  payment_approved:  { label: 'Pago aprobado',       icon: CreditCard,    color: 'bg-green-100 text-green-700' },
  payment_rejected:  { label: 'Pago rechazado',      icon: CreditCard,    color: 'bg-red-100 text-red-700' },
  payment_created:   { label: 'Pago registrado',     icon: CreditCard,    color: 'bg-blue-100 text-blue-700' },
  student_created:   { label: 'Estudiante creado',   icon: GraduationCap, color: 'bg-purple-100 text-purple-700' },
  student_updated:   { label: 'Estudiante editado',  icon: GraduationCap, color: 'bg-purple-100 text-purple-700' },
  role_changed:      { label: 'Rol cambiado',        icon: Users,         color: 'bg-amber-100 text-amber-700' },
  message_closed:    { label: 'Mensaje resuelto',    icon: MessageSquare, color: 'bg-slate-100 text-slate-600' },
  settings_updated:  { label: 'Configuración guardada', icon: Settings,  color: 'bg-slate-100 text-slate-600' },
}

export default function AdminAuditLog() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', schoolId],
    queryFn: async () => {
      const q = query(
        collection(db, 'auditLogs'),
        where('schoolId', '==', schoolId),
        orderBy('createdAt', 'desc'),
        limit(100)
      )
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
    enabled: !!schoolId,
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Shield size={22} className="text-slate-600"/>
        <h1 className="text-2xl font-bold text-slate-800">Historial de actividad</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-600">Últimas 100 acciones</p>
          <span className="text-xs text-slate-400">{logs.length} registros</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Shield size={36} className="mx-auto mb-3 opacity-30"/>
            <p className="text-sm">Sin actividad registrada aún</p>
            <p className="text-xs mt-1">Las acciones se registrarán automáticamente</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(logs as any[]).map(log => {
              const cfg = ACTION_CONFIG[log.action] || { label: log.action, icon: Shield, color: 'bg-slate-100 text-slate-600' }
              const Icon = cfg.icon
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                    <Icon size={15}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{log.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>Por: <strong className="text-slate-500">{log.performedByName || log.performedBy}</strong></span>
                      {log.createdAt && (
                        <span>{format(toDate(log.createdAt), "d MMM yyyy, HH:mm", { locale: es })}</span>
                      )}
                    </div>
                    {log.metadata && (
                      <p className="text-xs text-slate-400 mt-0.5">{JSON.stringify(log.metadata)}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
