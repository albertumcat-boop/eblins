import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Megaphone, GraduationCap, BookOpen, CalendarCheck,
  ShieldAlert, ListTodo, Clock, FileText, User,
  LogOut, Menu, X, MoreHorizontal, ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { updateTeacherAssignment } from '@/services/db'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const GRADES   = ['1er','2do','3er','4to','5to','6to','7mo','8vo','9no','10mo','11vo','12vo']
const SECTIONS = ['A','B','C','D','E']

// 5 primary items for bottom nav
const PRIMARY_NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Inicio',     exact: true },
  { to: '/attendance',  icon: CalendarCheck,   label: 'Asistencia' },
  { to: '/grades',      icon: BookOpen,        label: 'Notas' },
  { to: '/announcements',icon: Megaphone,      label: 'Anuncios' },
  { to: '/profile',     icon: User,            label: 'Perfil' },
]

const MORE_NAV = [
  { to: '/students',   icon: GraduationCap, label: 'Estudiantes' },
  { to: '/behavior',   icon: ShieldAlert,   label: 'Conducta' },
  { to: '/tasks',      icon: ListTodo,      label: 'Tareas' },
  { to: '/schedules',  icon: Clock,         label: 'Horarios' },
  { to: '/reportcards',icon: FileText,      label: 'Boletas' },
]

const ALL_NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Inicio',     exact: true },
  { to: '/announcements',icon: Megaphone,     label: 'Anuncios' },
  { to: '/students',   icon: GraduationCap,   label: 'Estudiantes' },
  { to: '/grades',     icon: BookOpen,        label: 'Notas' },
  { to: '/attendance', icon: CalendarCheck,   label: 'Asistencia' },
  { to: '/behavior',   icon: ShieldAlert,     label: 'Conducta' },
  { to: '/tasks',      icon: ListTodo,        label: 'Tareas' },
  { to: '/schedules',  icon: Clock,           label: 'Horarios' },
  { to: '/reportcards',icon: FileText,        label: 'Boletas' },
]

export default function TeacherLayout() {
  const { appUser, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showClassPicker, setShowClassPicker] = useState(false)
  const [pickerGrade, setPickerGrade] = useState(appUser?.assignedGrade || GRADES[0])
  const [pickerSection, setPickerSection] = useState(appUser?.assignedSection || 'A')
  const [saving, setSaving] = useState(false)

  const hasAssignment = !!(appUser?.assignedGrade && appUser?.assignedSection)

  const handleSaveAssignment = async () => {
    if (!appUser) return
    setSaving(true)
    try {
      await updateTeacherAssignment(appUser.id, pickerGrade, pickerSection)
      setShowClassPicker(false)
      toast.success(`Clase asignada: ${pickerGrade} sección ${pickerSection}`)
    } catch {
      toast.error('Error al guardar la asignación')
    } finally { setSaving(false) }
  }

  const handleLogout = async () => { await logout(); navigate('/login') }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar — desktop */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-sm">EF</div>
          <div><p className="font-semibold text-sm text-slate-800">EduFinance</p><p className="text-xs text-slate-400">Profesor</p></div>
          <button className="ml-auto lg:hidden text-slate-400" onClick={() => setOpen(false)}><X size={18}/></button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {ALL_NAV.map(({ to, icon: Icon, label, exact }) => (
            <NavLink key={to} to={to} end={exact} className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-50'
            )}>
              <Icon size={16}/>{label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">{appUser?.displayName?.[0]?.toUpperCase()}</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-700 truncate">{appUser?.displayName}</p><p className="text-xs text-slate-400 truncate">{appUser?.email}</p></div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-400"><LogOut size={16}/></button>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)}/>}

      <div className="flex-1 lg:ml-64 flex flex-col">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button className="lg:hidden text-slate-500" onClick={() => setOpen(true)}><Menu size={20}/></button>
          {/* Class chip — always visible */}
          <button
            onClick={() => { setPickerGrade(appUser?.assignedGrade || GRADES[0]); setPickerSection(appUser?.assignedSection || 'A'); setShowClassPicker(true) }}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors',
              hasAssignment
                ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 animate-pulse'
            )}
          >
            <GraduationCap size={14}/>
            {hasAssignment
              ? `${appUser!.assignedGrade} — Sección ${appUser!.assignedSection}`
              : 'Seleccionar mi clase'}
            <ChevronDown size={13}/>
          </button>
        </header>
        <main className="flex-1 p-4 md:p-6 pb-24 sm:pb-6">
          {/* Block navigation until class is assigned */}
          {!hasAssignment
            ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-sm mx-auto">
                  <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <GraduationCap size={32} className="text-purple-600"/>
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">¿Cuál es tu clase?</h2>
                  <p className="text-slate-500 text-sm mb-6">
                    Antes de continuar, indica el grado y la sección que tienes a tu cargo.
                    Podrás cambiarlo en cualquier momento.
                  </p>
                  <button
                    onClick={() => setShowClassPicker(true)}
                    className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
                  >
                    Seleccionar mi grado y sección
                  </button>
                </div>
              </div>
            )
            : <Outlet />
          }
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 flex items-stretch">
        {PRIMARY_NAV.map(({ to, icon: Icon, label, exact }) => (
          <NavLink key={to} to={to} end={exact}
            className={({ isActive }) => clsx(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors',
              isActive ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'
            )}>
            <Icon size={22}/>
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </NavLink>
        ))}

        {/* More button */}
        <button
          onClick={() => setShowMore(v => !v)}
          className={clsx(
            'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors',
            showMore ? 'text-purple-600' : 'text-slate-400'
          )}>
          <MoreHorizontal size={22}/>
          <span className="text-[10px] font-medium leading-none">Más</span>
        </button>
      </nav>

      {/* ── Class picker modal ── */}
      {showClassPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Mi grado y sección</h3>
              {hasAssignment && (
                <button onClick={() => setShowClassPicker(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20}/>
                </button>
              )}
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-500">
                Selecciona el grado y la sección que tienes a tu cargo. El sistema mostrará únicamente los alumnos de esa clase.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-2">Grado</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {GRADES.map(g => (
                      <button key={g} onClick={() => setPickerGrade(g)}
                        className={clsx(
                          'py-2 rounded-lg text-xs font-semibold border transition-colors',
                          pickerGrade === g
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        )}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-2">Sección</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SECTIONS.map(s => (
                      <button key={s} onClick={() => setPickerSection(s)}
                        className={clsx(
                          'py-2 rounded-lg text-sm font-bold border transition-colors',
                          pickerSection === s
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        )}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Preview */}
              <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-purple-500 mb-0.5">Clase seleccionada</p>
                <p className="text-lg font-bold text-purple-700">{pickerGrade} — Sección {pickerSection}</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              {hasAssignment && (
                <button onClick={() => setShowClassPicker(false)}
                  className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50">
                  Cancelar
                </button>
              )}
              <button
                onClick={handleSaveAssignment}
                disabled={saving}
                className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Confirmar clase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* "More" drawer — mobile */}
      {showMore && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setShowMore(false)}/>
          <div className="lg:hidden fixed bottom-16 inset-x-0 z-50 bg-white rounded-t-2xl border-t border-slate-200 p-4 shadow-2xl">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4"/>
            <div className="grid grid-cols-4 gap-3">
              {MORE_NAV.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} onClick={() => setShowMore(false)}
                  className={({ isActive }) => clsx(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-colors',
                    isActive ? 'bg-purple-50 text-purple-600' : 'text-slate-600 hover:bg-slate-50'
                  )}>
                  <Icon size={22}/>
                  <span className="text-[10px] font-medium leading-tight">{label}</span>
                </NavLink>
              ))}
              <button onClick={handleLogout}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-red-400 hover:bg-red-50 transition-colors">
                <LogOut size={22}/>
                <span className="text-[10px] font-medium leading-tight">Salir</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
