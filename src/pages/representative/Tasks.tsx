import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsByRepresentative, getTasksByGrade } from '@/services/db'
import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { BookOpen } from 'lucide-react'
import clsx from 'clsx'

export default function RepresentativeTasks() {
  const { appUser } = useAuth()
  const [selectedStudentId, setSelectedStudentId] = useState('')

  const { data: students = [] } = useQuery({
    queryKey: ['my-students', appUser?.id],
    queryFn: () => getStudentsByRepresentative(appUser!.id, appUser!.schoolId),
    enabled: !!appUser?.id,
  })

  const student = students.find(s => s.id === selectedStudentId)

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-grade', student?.grade, student?.section],
    queryFn: () => getTasksByGrade(appUser!.schoolId, student!.grade, student!.section),
    enabled: !!student,
  })

  const isOverdue = (date: string) => date && new Date(date + 'T23:59:59') < new Date()
  const pending = tasks.filter((t: any) => !isOverdue(t.dueDate))
  const past = tasks.filter((t: any) => isOverdue(t.dueDate))

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Tareas</h1>
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
        <div className="text-center py-16 text-slate-400">
          <BookOpen size={36} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">Selecciona un estudiante para ver sus tareas</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BookOpen size={36} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">No hay tareas asignadas para {student?.grade}{student?.section}</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-3">Pendientes ({pending.length})</h2>
              <div className="space-y-3">
                {pending.map((t: any) => (
                  <div key={t.id} className="bg-white rounded-xl border border-blue-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800">{t.title}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{t.subject}</span>
                        </div>
                        {t.description && <p className="text-sm text-slate-500 mt-1">{t.description}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-400">Entrega:</p>
                        <p className="text-sm font-semibold text-blue-600">{format(new Date(t.dueDate + 'T12:00:00'), "d MMM", { locale: es })}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Prof. {t.teacherName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">Entregadas / Vencidas</h2>
              <div className="space-y-2 opacity-60">
                {past.slice(0, 5).map((t: any) => (
                  <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="font-medium text-slate-700">{t.title}</p>
                    <p className="text-xs text-slate-400">{t.subject} · Prof. {t.teacherName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
