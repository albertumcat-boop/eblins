import { useAuth } from '@/context/AuthContext'
import { Megaphone, GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function TeacherDashboard() {
  const { appUser } = useAuth()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Bienvenido, {appUser?.displayName?.split(' ')[0]}</h1>
        <p className="text-slate-500 text-sm mt-1">Panel del profesor</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/announcements" className="bg-white rounded-xl border border-slate-200 p-5 hover:border-purple-300 hover:shadow-sm transition-all group">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors">
            <Megaphone size={20} className="text-purple-600"/>
          </div>
          <h2 className="font-semibold text-slate-800">Anuncios</h2>
          <p className="text-sm text-slate-500 mt-1">Publica información y avisos para los representantes</p>
        </Link>
        <Link to="/students" className="bg-white rounded-xl border border-slate-200 p-5 hover:border-purple-300 hover:shadow-sm transition-all group">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors">
            <GraduationCap size={20} className="text-purple-600"/>
          </div>
          <h2 className="font-semibold text-slate-800">Estudiantes</h2>
          <p className="text-sm text-slate-500 mt-1">Consulta el listado de estudiantes de tu institución</p>
        </Link>
      </div>
    </div>
  )
}
