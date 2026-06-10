import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getUsersBySchool, updateUserRole, deleteUser, approveUser, rejectUser, createAuditLog } from '@/services/db'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/services/firebase'
import toast from 'react-hot-toast'
import { Search, Shield, User, GraduationCap, Trash2, X, AlertTriangle, CheckCircle, Clock, KeyRound } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { AppUser, UserRole } from '@/types'
import clsx from 'clsx'

const ROLE_CONFIG = {
  admin:          { label: 'Administrador', icon: Shield,        color: 'bg-blue-100 text-blue-700' },
  representative: { label: 'Representante', icon: User,          color: 'bg-green-100 text-green-700' },
  teacher:        { label: 'Profesor',      icon: GraduationCap, color: 'bg-purple-100 text-purple-700' },
} as Record<UserRole, { label: string; icon: any; color: string }>

const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)

export default function AdminUsers() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [confirmDelete, setConfirmDelete] = useState<AppUser | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', schoolId],
    queryFn: () => getUsersBySchool(schoolId),
    enabled: !!schoolId
  })

  const updateMut = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => updateUserRole(userId, role, schoolId),
    onSuccess: async (_, { userId, role }) => {
      const u = users.find(x => x.id === userId)
      await createAuditLog({
        schoolId,
        action: 'role_changed',
        description: 'Rol de ' + (u?.displayName || userId) + ' cambiado a ' + role,
        performedBy: appUser!.id,
        performedByName: appUser!.displayName,
        metadata: { userId, newRole: role },
      })
      toast.success('Rol actualizado')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('Error al actualizar rol'),
  })

  const deleteMut = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: async (_, userId) => {
      const u = users.find(x => x.id === userId)
      await createAuditLog({
        schoolId,
        action: 'user_deleted',
        description: 'Usuario ' + (u?.displayName || userId) + ' eliminado del sistema',
        performedBy: appUser!.id,
        performedByName: appUser!.displayName,
        metadata: { userId, role: u?.role },
      }).catch(() => {})
      toast.success('Usuario eliminado')
      qc.invalidateQueries({ queryKey: ['users'] })
      setConfirmDelete(null)
    },
    onError: () => toast.error('Error al eliminar usuario'),
  })

  const approveMut = useMutation({
    mutationFn: (userId: string) => approveUser(userId),
    onSuccess: async (_, userId) => {
      const u = users.find(x => x.id === userId)
      await createAuditLog({
        schoolId,
        action: 'user_approved',
        description: 'Representante ' + (u?.displayName || userId) + ' aprobado',
        performedBy: appUser!.id,
        performedByName: appUser!.displayName,
        metadata: { userId },
      }).catch(() => {})
      toast.success('Representante aprobado')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('Error al aprobar usuario'),
  })

  const rejectMut = useMutation({
    mutationFn: (userId: string) => rejectUser(userId),
    onSuccess: (_, userId) => {
      const u = users.find(x => x.id === userId)
      toast.success((u?.displayName || 'Usuario') + ' rechazado y eliminado')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('Error al rechazar'),
  })

  const sendReset = async (email: string, name: string) => {
    try {
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + '/login',
        handleCodeInApp: false,
      })
      toast.success('Correo de recuperación enviado a ' + name)
    } catch {
      toast.error('No se pudo enviar el correo')
    }
  }

  const pending = users.filter((u: any) => u.status === 'pending_approval')
  const active  = users.filter((u: any) => u.status !== 'pending_approval')

  const filtered = active.filter(u => {
    const ms = !search || u.displayName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const mr = roleFilter === 'all' || u.role === roleFilter
    return ms && mr
  })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>

      {/* ── Solicitudes pendientes de aprobación ───────────────── */}
      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-200 flex items-center gap-2">
            <Clock size={16} className="text-amber-600"/>
            <span className="font-semibold text-amber-800 text-sm">
              Solicitudes pendientes de aprobación — {pending.length}
            </span>
          </div>
          <div className="divide-y divide-amber-100">
            {pending.map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center text-sm font-bold text-amber-800 shrink-0">
                  {u.displayName?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{u.displayName}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => approveMut.mutate(u.id)}
                    disabled={approveMut.isPending}
                    className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
                    <CheckCircle size={13}/> Aprobar
                  </button>
                  <button
                    onClick={() => rejectMut.mutate(u.id)}
                    disabled={rejectMut.isPending}
                    className="flex items-center gap-1.5 border border-red-300 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-50 disabled:opacity-50">
                    <X size={13}/> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar por nombre o correo..." value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">Todos los roles</option>
          <option value="admin">Administrador</option>
          <option value="representative">Representante</option>
          <option value="teacher">Profesor</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(['admin', 'representative', 'teacher'] as UserRole[]).map(role => {
          const cfg = ROLE_CONFIG[role]; const Icon = cfg.icon
          return (
            <div key={role} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.color}`}><Icon size={18}/></div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{active.filter(u => u.role === role).length}</p>
                <p className="text-xs text-slate-500">{cfg.label}s</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading
          ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>
          : filtered.length === 0
            ? <div className="text-center py-16 text-slate-400 text-sm">Sin usuarios</div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Usuario', 'Correo', 'Rol', 'Registrado', 'Cambiar rol', 'Acciones'].map((h, i) => (
                        <th key={i} className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(u => {
                      const cfg = ROLE_CONFIG[u.role as UserRole]; const Icon = cfg?.icon
                      const isSelf = u.id === appUser?.id
                      return (
                        <tr key={u.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                {u.displayName?.[0]?.toUpperCase() || '?'}
                              </div>
                              <span className="font-medium text-slate-700">{u.displayName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', cfg?.color)}>
                              {Icon && <Icon size={11}/>}{cfg?.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs">
                            {u.createdAt ? format(toDate(u.createdAt), 'dd/MM/yyyy', { locale: es }) : '---'}
                          </td>
                          <td className="px-4 py-3">
                            {!isSelf && (
                              <select
                                className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={u.role}
                                onChange={e => updateMut.mutate({ userId: u.id, role: e.target.value })}>
                                <option value="admin">Administrador</option>
                                <option value="representative">Representante</option>
                                <option value="teacher">Profesor</option>
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {!isSelf && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => sendReset(u.email, u.displayName)}
                                  className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Enviar correo de recuperación de contraseña">
                                  <KeyRound size={14}/>
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(u)}
                                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar usuario">
                                  <Trash2 size={14}/>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500"/> Eliminar usuario
              </h3>
              <button onClick={() => setConfirmDelete(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 mb-2">
                Vas a eliminar a <strong>{confirmDelete.displayName}</strong> del sistema.
              </p>
              <p className="text-xs text-slate-400">{confirmDelete.email} &mdash; {ROLE_CONFIG[confirmDelete.role as UserRole]?.label}</p>
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <strong>Nota:</strong> Esto elimina el perfil. El usuario no podra acceder hasta volver a registrarse.
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={() => deleteMut.mutate(confirmDelete.id)}
                disabled={deleteMut.isPending}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm hover:bg-red-700 disabled:opacity-50 font-medium">
                {deleteMut.isPending ? 'Eliminando...' : 'Si, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
