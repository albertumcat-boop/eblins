import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getUsersBySchool, updateUserRole } from '@/services/db'
import toast from 'react-hot-toast'
import { Search, Shield, User, GraduationCap } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { AppUser, UserRole } from '@/types'
import clsx from 'clsx'

const ROLE_CONFIG: Record<UserRole, { label: string; icon: any; color: string }> = {
  admin:          { label: 'Administrador', icon: Shield,        color: 'bg-blue-100 text-blue-700' },
  representative: { label: 'Representante', icon: User,          color: 'bg-green-100 text-green-700' },
  teacher:        { label: 'Profesor',      icon: GraduationCap, color: 'bg-purple-100 text-purple-700' },
}
const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)

export default function AdminUsers() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users', schoolId], queryFn: () => getUsersBySchool(schoolId), enabled: !!schoolId })
  const updateMut = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => updateUserRole(userId, role, schoolId),
    onSuccess: () => { toast.success('Rol actualizado'); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: () => toast.error('Error al actualizar rol'),
  })

  const filtered = users.filter(u => {
    const matchSearch = !search || u.displayName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>
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
        {(['admin','representative','teacher'] as UserRole[]).map(role => {
          const cfg = ROLE_CONFIG[role]; const Icon = cfg.icon
          return (
            <div key={role} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.color}`}><Icon size={18}/></div>
              <div><p className="text-2xl font-bold text-slate-800">{users.filter(u => u.role === role).length}</p><p className="text-xs text-slate-500">{cfg.label}s</p></div>
            </div>
          )
        })}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{['Usuario','Correo','Rol','Registrado','Cambiar rol'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(u => {
                const cfg = ROLE_CONFIG[u.role as UserRole]; const Icon = cfg?.icon
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{u.displayName?.[0]?.toUpperCase() || '?'}</div>
                        <span className="font-medium text-slate-700">{u.displayName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', cfg?.color)}>
                        {Icon && <Icon size={11}/>}{cfg?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{u.createdAt ? format(toDate(u.createdAt), 'dd/MM/yyyy', { locale: es }) : '—'}</td>
                    <td className="px-4 py-3">
                      {u.id !== appUser?.id && (
                        <select className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={u.role} onChange={e => updateMut.mutate({ userId: u.id, role: e.target.value })}>
                          <option value="admin">Administrador</option>
                          <option value="representative">Representante</option>
                          <option value="teacher">Profesor</option>
                        </select>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>}
      </div>
    </div>
  )
}
