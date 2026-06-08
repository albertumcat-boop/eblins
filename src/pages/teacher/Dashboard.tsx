import { useAuth } from '@/context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { Megaphone, GraduationCap, ClipboardList, BookOpen, CheckSquare, CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getAnnouncementsBySchool } from '@/services/db'
import { db } from '@/services/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const QUICK_ACTIONS = [
  { to: '/attendance', icon: CheckSquare, label: 'Tomar asistencia', desc: 'Registra la asistencia de hoy', color: 'bg-blue-50 text-blue-600', hover: 'hover:border-blue-300 hover:shadow-sm' },
  { to: '/grades', icon: BookOpen, label: 'Cargar notas', desc: 'Agrega o edita calificaciones', color: 'bg-green-50 text-green-600', hover: 'hover:border-green-300 hover:shadow-sm' },
  { to: '/tasks', icon: ClipboardList, label: 'Nueva tarea', desc: 'Publica una tarea o actividad', color: 'bg-purple-50 text-purple-600', hover: 'hover:border-purple-300 hover:shadow-sm' },
  { to: '/announcements', icon: Megaphone, label: 'Nuevo anuncio', desc: 'Publica avisos para los representantes', color: 'bg-orange-50 text-orange-600', hover: 'hover:border-orange-300 hover:shadow-sm' },
  { to: '/students', icon: GraduationCap, label: 'Estudiantes', desc: 'Consulta el listado de estudiantes', color: 'bg-slate-50 text-slate-600', hover: 'hover:border-slate-300 hover:shadow-sm' },
  { to: '/schedules', icon: CalendarDays, label: 'Horarios', desc: 'Revisa los horarios de clase', color: 'bg-teal-50 text-teal-600', hover: 'hover:border-teal-300 hover:shadow-sm' },
]

export default function TeacherDashboard() {
  const { appUser } = useAuth()

  const { data: allAnnouncements = [] } = useQuery({
    queryKey: ['announcements', appUser?.schoolId],
    queryFn: () => getAnnouncementsBySchool(appUser!.schoolId),
    enabled: !!appUser?.schoolId,
  })

  const { data: gradesCount = 0 } = useQuery({
    queryKey: ['gradesCount', appUser?.id],
    queryFn: async () => {
      if (!appUser?.id) return 0
      const q = query(collection(db, 'grades'), where('teacherId', '==', appUser.id))
      const snap = await getDocs(q)
      return snap.size
    },
    enabled: !!appUser?.id,
  })

  const myAnnouncements = allAnnouncements.filter(a => a.teacherId === appUser?.id)
  const recentAnnouncements = myAnnouncements.slice(0, 3)

  const today = new Date()
  const todayLabel = format(today, "EEEE d 'de' MMMM yyyy", { locale: es })
  const todayCapitalized = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)

  const formatRelative = (createdAt: any) => {
    if (!createdAt) return ''
    const d = createdAt.toDate ? createdAt.toDate() : new Date(createdAt)
    return format(d, "d MMM yyyy", { locale: es })
  }

  return (
    <div className="space-y-6">
      {/* Header con resumen del día */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Bienvenido, {appUser?.displayName?.split(' ')[0]}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{todayCapitalized}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-lg">
            {appUser?.displayName?.[0]?.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-3xl font-bold text-orange-600">{myAnnouncements.length}</p>
          <p className="text-sm text-slate-500 mt-1">Anuncios publicados</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-3xl font-bold text-green-600">{gradesCount}</p>
          <p className="text-sm text-slate-500 mt-1">Registros de notas</p>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Acceso rápido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK_ACTIONS.map(({ to, icon: Icon, label, desc, color, hover }) => (
            <Link key={to} to={to}
              className={`bg-white rounded-xl border border-slate-200 p-4 transition-all group ${hover}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                <Icon size={18} />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">{label}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Actividad reciente */}
      {recentAnnouncements.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Mis anuncios recientes</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {recentAnnouncements.map(a => (
              <div key={a.id} className="px-5 py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Megaphone size={14} className="text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">{a.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatRelative(a.createdAt)}</p>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{a.readBy?.length ?? 0} leídos</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
