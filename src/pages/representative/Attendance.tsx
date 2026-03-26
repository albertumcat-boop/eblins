import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsByRepresentative } from '@/services/db'
import { db } from '@/services/firebase'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, X, Minus, Calendar } from 'lucide-react'
import clsx from 'clsx'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  present: { label: 'Presente', color: 'bg-green-100 text-green-700', icon: Check },
  absent:  { label: 'Ausente',  color: 'bg-red-100 text-red-700',     icon: X },
  late:    { label: 'Tardanza', color: 'bg-amber-100 text-amber-700', icon: Minus },
}

export default function RepresentativeAttendance() {
  const { appUser } = useAuth()
  const [selectedStudentId, setSelectedStudentId] = useState('')

  const { data: students = [] } = useQuery({
    queryKey: ['my-students', appUser?.id],
    queryFn: () => getStudentsByRepresentative(appUser!.id),
    enabled: !!appUser?.id,
  })

  const { data: records = [] } = useQuery({
    queryKey: ['rep-attendance', selectedStudentId],
    queryFn: async () => {
      const q = query(collection(db, 'attendance'),
        where('schoolId', '==', appUser!.schoolId),
        orderBy('date', 'desc'), limit(30))
      const snap = await getDocs(q)
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((r: any) => r.records?.[selectedStudentId])
    },
    enabled: !!selectedStudentId,
  })

  const counts = {
    present: records.filter((r: any) => r.records[selectedStudentId] === 'present').length,
    absent:  records.filter((r: any) => r.records[selectedStudentId] === 'absent').length,
    late:    records.filter((r: any) => r.records[selectedStudentId] === 'late').length,
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Asistencia</h1>

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
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(counts).map(([status, count]) => {
              const cfg = STATUS_CONFIG[status]
              return (
                <div key={status} className={`rounded-xl border p-3 text-center ${cfg.color}`}>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs font-medium">{cfg.label}</p>
                  <p className="text-xs opacity-70">últimos 30 días</p>
                </div>
              )
            })}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 text-sm font-medium text-slate-600">
              <Calendar size={16}/> Historial reciente
            </div>
            {records.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-10">Sin registros de asistencia</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {(records as any[]).map(r => {
                  const status = r.records[selectedStudentId]
                  const cfg = STATUS_CONFIG[status]
                  const Icon = cfg?.icon
                  return (
                    <div key={r.id} className="flex items-center justify-between px-5 py-3">
                      <p className="text-sm text-slate-700">
                        {format(new Date(r.date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
                      </p>
                      <span className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium', cfg?.color)}>
                        {Icon && <Icon size={12}/>}{cfg?.label}
                      </span>
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
          <Calendar size={36} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">Selecciona un estudiante para ver su asistencia</p>
        </div>
      )}
    </div>
  )
}
