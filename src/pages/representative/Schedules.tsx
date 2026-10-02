import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsByRepresentative, getSchedule } from '@/services/db'
import { Clock } from 'lucide-react'
import clsx from 'clsx'

const SUBJECT_PALETTE = [
  'bg-blue-100 text-blue-800',
  'bg-emerald-100 text-emerald-800',
  'bg-violet-100 text-violet-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
  'bg-cyan-100 text-cyan-800',
  'bg-orange-100 text-orange-800',
  'bg-teal-100 text-teal-800',
  'bg-pink-100 text-pink-800',
  'bg-indigo-100 text-indigo-800',
]

function buildColorMap(blocks: any[]): Record<string, string> {
  const map: Record<string, string> = {}
  let idx = 0
  for (const b of blocks) {
    for (const subj of Object.values(b.subjects || {})) {
      const s = (subj as string).trim()
      if (s && !map[s] && s.toLowerCase() !== 'receso') {
        map[s] = SUBJECT_PALETTE[idx % SUBJECT_PALETTE.length]
        idx++
      }
    }
  }
  return map
}

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

  const s = schedule as any
  const hasBlocks = s?.blocks?.length > 0
  const days: string[] = s?.days || ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
  const colorMap = hasBlocks ? buildColorMap(s.blocks) : {}

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Horarios</h1>
      <div className="flex gap-2 flex-wrap">
        {students.map(st => (
          <button key={st.id} onClick={() => setSelectedStudentId(st.id)}
            className={clsx('px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
              selectedStudentId === st.id ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-700')}>
            {st.fullName}
          </button>
        ))}
      </div>
      {!selectedStudentId ? (
        <div className="text-center py-16 text-slate-400"><Clock size={36} className="mx-auto mb-3 opacity-30"/><p className="text-sm">Selecciona un estudiante</p></div>
      ) : !schedule ? (
        <div className="text-center py-16 text-slate-400"><Clock size={36} className="mx-auto mb-3 opacity-30"/><p className="text-sm">El horario aún no está disponible</p></div>
      ) : hasBlocks ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="font-semibold text-slate-700">{student?.grade} — Sección {student?.section}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Hora</th>
                  {days.map((d: string) => (
                    <th key={d} className="text-center px-2 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide min-w-[110px]">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.blocks.map((block: any, i: number) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-xs font-mono text-slate-500 whitespace-nowrap">
                      {block.startTime} – {block.endTime}
                    </td>
                    {days.map((day: string) => {
                      const subj = block.subjects?.[day] || ''
                      const isReceso = subj.toLowerCase() === 'receso'
                      const color = colorMap[subj.trim()] || ''
                      return (
                        <td key={day} className="px-1.5 py-1.5 text-center">
                          {subj ? (
                            <span className={clsx('inline-block text-xs font-medium px-2 py-1 rounded-lg w-full',
                              isReceso ? 'bg-slate-100 text-slate-400 italic' : color || 'bg-slate-100 text-slate-600')}>
                              {subj}
                            </span>
                          ) : (
                            <span className="text-slate-200 text-xs">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 mb-4">{student?.grade} — Sección {student?.section}</h2>
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed bg-slate-50 rounded-xl p-4">
            {s.content}
          </pre>
        </div>
      )}
    </div>
  )
}
