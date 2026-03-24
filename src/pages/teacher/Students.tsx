import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsBySchool } from '@/services/db'
import { Search } from 'lucide-react'

export default function TeacherStudents() {
  const { appUser } = useAuth()
  const [search, setSearch] = useState('')
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', appUser?.schoolId],
    queryFn: () => getStudentsBySchool(appUser!.schoolId),
    enabled: !!appUser?.schoolId,
  })
  const filtered = students.filter(s => !search || s.fullName.toLowerCase().includes(search.toLowerCase()) || s.enrollmentCode.includes(search))

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Estudiantes</h1>
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Buscar estudiante..." value={search} onChange={e => setSearch(e.target.value)}/>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"/></div>
        : <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{['Nombre','Matrícula','Grado','Sección','Año escolar'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{s.fullName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.enrollmentCode}</td>
                  <td className="px-4 py-3 text-slate-600">{s.grade}</td>
                  <td className="px-4 py-3 text-slate-600">{s.section}</td>
                  <td className="px-4 py-3 text-slate-500">{s.schoolYear}</td>
                </tr>
              ))}
            </tbody>
          </table>}
      </div>
    </div>
  )
}
