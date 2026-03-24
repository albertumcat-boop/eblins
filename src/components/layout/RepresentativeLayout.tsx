import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { LayoutDashboard, CreditCard, Megaphone, MessageSquare, LogOut, Bell, Menu, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { subscribeToNotifications, markNotificationRead } from '@/services/db'
import type { Notification } from '@/types'
import clsx from 'clsx'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio', exact: true },
  { to: '/payments', icon: CreditCard, label: 'Pagos' },
  { to: '/announcements', icon: Megaphone, label: 'Anuncios' },
  { to: '/messages', icon: MessageSquare, label: 'Mensajes' },
]

export default function RepresentativeLayout() {
  const { appUser, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [showN, setShowN] = useState(false)

  useEffect(() => { if (appUser) return subscribeToNotifications(appUser.id, setNotifs) }, [appUser?.id])
  const handleLogout = async () => { await logout(); navigate('/login') }
  const handleNotif = async (n: Notification) => {
    await markNotificationRead(n.id)
    setNotifs(p => p.filter(x => x.id !== n.id))
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">EF</div>
          <div><p className="font-semibold text-sm text-slate-800">EduFinance</p><p className="text-xs text-slate-400">Representante</p></div>
          <button className="ml-auto lg:hidden text-slate-400" onClick={() => setOpen(false)}><X size={18}/></button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, icon: Icon, label, exact }) => (
            <NavLink key={to} to={to} end={exact} className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            )}>
              <Icon size={18}/>{label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
              {appUser?.displayName?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{appUser?.displayName}</p>
              <p className="text-xs text-slate-400 truncate">{appUser?.email}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-400"><LogOut size={16}/></button>
          </div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)}/>}
      <div className="flex-1 lg:ml-64 flex flex-col">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4">
          <button className="lg:hidden text-slate-500" onClick={() => setOpen(true)}><Menu size={20}/></button>
          <div className="flex-1"/>
          <div className="relative">
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg" onClick={() => setShowN(!showN)}>
              <Bell size={20}/>
              {notifs.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"/>}
            </button>
            {showN && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold">Notificaciones</div>
                {notifs.length === 0
                  ? <p className="text-sm text-slate-400 text-center py-6">Sin notificaciones</p>
                  : notifs.map(n => (
                    <button key={n.id} onClick={() => handleNotif(n)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50">
                      <p className="text-sm font-medium text-slate-800">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                    </button>
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
