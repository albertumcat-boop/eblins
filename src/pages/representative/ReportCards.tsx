import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsByRepresentative } from '@/services/db'
import { db } from '@/services/firebase'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { FileText } from 'lucide-react'
import clsx from 'clsx'

export default function RepresentativeReportCards() {
  const { appUser } = useAuth()
  const [selectedStudentId, setSelectedStudentId] = useState('')

  const { data: students = [] } = useQuery({
    queryKey: ['my-students', appUser?.id],
    queryFn: () => getStudentsByRepresentative(appUser!.id),
    enabled: !!appUser?.id,
  })

  const { data: reportCards = [] } = useQuery({
    queryKey: ['rep-reportcards', selectedStudentId],
    queryFn: async () => {
      const q = query(collection(db, 'reportCards'),
        where('studentId', '==', selectedStudentId),
        orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
    enabled: !!selectedStudentId,
  })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Boletas</h1>

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
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 text-sm font-medium text-slate-600">
            Boletas disponibles ({reportCards.length})
          </div>
          {reportCards.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText size={32} className="mx-auto mb-2 opacity-30"/>
              <p className="text-sm">No hay boletas disponibles aún</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(reportCards as any[]).map(r => (
                <div key={r.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-medium text-slate-800">{r.period} · {r.schoolYear}</p>
                    {r.notes && <p className="text-xs text-slate-500 mt-0.5">{r.notes}</p>}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {format(r.createdAt?.toDate?.() || new Date(), "d 'de' MMMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <a href={r.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                    <FileText size={14}/> Ver / Descargar
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedStudentId && (
        <div className="text-center py-16 text-slate-400">
          <FileText size={36} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">Selecciona un estudiante para ver sus boletas</p>
        </div>
      )}
    </div>
  )
}
