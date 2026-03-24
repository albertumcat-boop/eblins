import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LayoutDashboard, Megaphone, GraduationCap, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import clsx from 'clsx'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio', exact: true },
  { to: '/announcements', icon: Megaphone, label: 'Anuncios' },
  { to: '/students', icon: GraduationCap, label: 'Estudiantes' },
]

export default function TeacherLayout() {
  const { appUser, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const handleLogout = async () => { await logout(); navigate('/login') }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-sm">EF</div>
          <div><p className="font-semibold text-sm text-slate-800">EduFinance</p><p className="text-xs text-slate-400">Profesor</p></div>
          <button className="ml-auto lg:hidden text-slate-400" onClick={() => setOpen(false)}><X size={18}/></button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, icon: Icon, label, exact }) => (
            <NavLink key={to} to={to} end={exact} className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-50'
            )}>
              <Icon size={18}/>{label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
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
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center">
          <button className="lg:hidden text-slate-500" onClick={() => setOpen(true)}><Menu size={20}/></button>
        </header>
        <main className="flex-1 p-4 md:p-6"><Outlet /></main>
      </div>
    </div>
  )
}
