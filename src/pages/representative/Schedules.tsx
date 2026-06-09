import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsByRepresentative, getSchedule } from '@/services/db'
import { Clock } from 'lucide-react'
import clsx from 'clsx'

export default function RepresentativeSchedules() {
  const { appUser } = useAuth()
  const [selectedStudentId, setSelectedStudentId] = useState('')

  const { data: students = [] } = useQuery({
    queryKey: ['my-students', appUser?.id],
    queryFn: () => getStudentsByRepresentative(appUser!.id, appUser!.schoolId),
    enabled: !!appUser?.id,
  })

  const student = students.find(s => s.id === selectedStudentId)

  const { data: schedule } = useQuery({
    queryKey: ['schedule', student?.grade, student?.section],
    queryFn: () => getSchedule(appUser!.schoolId, student!.grade, student!.section),
    enabled: !!student,
  })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Horarios</h1>
      <div className="flex gap-2 flex-wrap">
        {students.map(s => (
          <button key={s.id} onClick={() => setSelectedStudentId(s.id)}
            className={clsx('px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
              selectedStudentId === s.id ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-700')}>
            {s.fullName}
          </button>
        ))}
      </div>
      {!selectedStudentId ? (
        <div className="text-center py-16 text-slate-400"><Clock size={36} className="mx-auto mb-3 opacity-30"/><p className="text-sm">Selecciona un estudiante</p></div>
      ) : !schedule ? (
        <div className="text-center py-16 text-slate-400"><Clock size={36} className="mx-auto mb-3 opacity-30"/><p className="text-sm">El horario aún no está disponible</p></div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 mb-4">{student?.grade} grado — Sección {student?.section}</h2>
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed bg-slate-50 rounded-xl p-4">
            {(schedule as any).content}
          </pre>
        </div>
      )}
    </div>
  )
}
