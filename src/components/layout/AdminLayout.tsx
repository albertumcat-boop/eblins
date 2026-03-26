import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { LayoutDashboard, CreditCard, Users, GraduationCap, BarChart3, MessageSquare, MessagesSquare, Settings, LogOut, Bell, Menu, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { subscribeToNotifications } from '@/services/db'
import type { Notification } from '@/types'
import clsx from 'clsx'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/payments', icon: CreditCard, label: 'Pagos' },
  { to: '/students', icon: GraduationCap, label: 'Estudiantes' },
  { to: '/users', icon: Users, label: 'Usuarios' },
  { to: '/reports', icon: BarChart3, label: 'Reportes' },
  { to: '/chat', icon: MessagesSquare, label: 'Chat' },
  { to: '/messages', icon: MessageSquare, label: 'Mensajes' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
]

export default function AdminLayout() {
  const { appUser, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [showN, setShowN] = useState(false)

  useEffect(() => { if (appUser) return subscribeToNotifications(appUser.id, setNotifs) }, [appUser?.id])
  const handleLogout = async () => { await logout(); navigate('/login') }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-sm">EF</div>
          <div><p className="font-semibold text-sm">EduFinance</p><p className="text-xs text-slate-400">Administrador</p></div>
          <button className="ml-auto lg:hidden text-slate-400" onClick={() => setOpen(false)}><X size={18}/></button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, exact }) => (
            <NavLink key={to} to={to} end={exact} className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            )}>
              <Icon size={18}/>{label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-slate-700">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
              {appUser?.displayName?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{appUser?.displayName}</p>
              <p className="text-xs text-slate-400 truncate">{appUser?.email}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-400"><LogOut size={16}/></button>
          </div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)}/>}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4">
          <button className="lg:hidden text-slate-500" onClick={() => setOpen(true)}><Menu size={20}/></button>
          <div className="flex-1"/>
          <div className="relative">
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg" onClick={() => setShowN(!showN)}>
              <Bell size={20}/>
              {notifs.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"/>}
            </button>
            {showN && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold">Notificaciones</div>
                {notifs.length === 0
                  ? <p className="text-sm text-slate-400 text-center py-6">Sin notificaciones</p>
                  : notifs.map(n => (
                    <div key={n.id} className="px-4 py-3 hover:bg-slate-50 border-b border-slate-50">
                      <p className="text-sm font-medium text-slate-800">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6"><Outlet /></main>
      </div>
    </div>
  )
}
