import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsByRepresentative } from '@/services/db'
import { db } from '@/services/firebase'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Award } from 'lucide-react'
import clsx from 'clsx'

const BEHAVIOR_TYPES: Record<string, { label: string; color: string; emoji: string }> = {
  excellent: { label: 'Excelente conducta',  color: 'bg-green-100 text-green-700',   emoji: '🏆' },
  good:      { label: 'Buena conducta',      color: 'bg-blue-100 text-blue-700',     emoji: '👍' },
  warning:   { label: 'Llamado de atención', color: 'bg-amber-100 text-amber-700',   emoji: '⚠️' },
  minor:     { label: 'Falta leve',          color: 'bg-orange-100 text-orange-700', emoji: '⚡' },
  serious:   { label: 'Falta grave',         color: 'bg-red-100 text-red-700',       emoji: '🚨' },
}

export default function RepresentativeBehavior() {
  const { appUser } = useAuth()
  const [selectedStudentId, setSelectedStudentId] = useState('')

  const { data: students = [] } = useQuery({
    queryKey: ['my-students', appUser?.id],
    queryFn: () => getStudentsByRepresentative(appUser!.id),
    enabled: !!appUser?.id,
  })

  const { data: records = [] } = useQuery({
    queryKey: ['rep-behavior', selectedStudentId],
    queryFn: async () => {
      const q = query(collection(db, 'behavior'),
        where('studentId', '==', selectedStudentId),
        orderBy('date', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
    enabled: !!selectedStudentId,
  })

  const positives = records.filter((r: any) => ['excellent','good'].includes(r.type)).length
  const negatives = records.filter((r: any) => ['warning','minor','serious'].includes(r.type)).length

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Conducta</h1>

      <div className="flex gap-2 flex-wrap">
        {students.map(s => (
          <button key={s.id} onClick={() => setSelectedStudentId(s.id)}
            className={clsx('px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
              selectedStudentId === s.id ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-700')}>
            {s.fullName}
          </button>
        ))}
      </div>

      {selectedStudentId && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{positives}</p>
              <p className="text-sm text-green-700 font-medium mt-1">✅ Conducta positiva</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{negatives}</p>
              <p className="text-sm text-red-700 font-medium mt-1">⚠️ Faltas / llamados</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 text-sm font-medium text-slate-600">
              Historial de conducta
            </div>
            {records.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Award size={32} className="mx-auto mb-2 opacity-30"/>
                <p className="text-sm">Sin registros de conducta</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {(records as any[]).map(r => {
                  const bt = BEHAVIOR_TYPES[r.type]
                  return (
                    <div key={r.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{bt?.emoji}</span>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{r.description}</p>
                            {r.consequence !== 'Ninguna' && (
                              <p className="text-xs text-red-600 mt-1 font-medium">
                                Consecuencia: {r.consequence}
                              </p>
                            )}
                            <p className="text-xs text-slate-400 mt-1">
                              Prof. {r.teacherName} · {format(new Date(r.date + 'T12:00:00'), "d 'de' MMMM yyyy", { locale: es })}
                            </p>
                          </div>
                        </div>
                        <span className={clsx('text-xs px-2 py-1 rounded-full font-medium', bt?.color)}>
                          {bt?.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {!selectedStudentId && (
        <div className="text-center py-16 text-slate-400">
          <Award size={36} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">Selecciona un estudiante para ver su conducta</p>
        </div>
      )}
    </div>
  )
}
