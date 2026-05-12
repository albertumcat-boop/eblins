import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsByRepresentative, getSuppliesByGrade } from '@/services/db'
import { ShoppingBag } from 'lucide-react'
import clsx from 'clsx'

export default function RepresentativeSupplies() {
  const { appUser } = useAuth()
  const [selectedStudentId, setSelectedStudentId] = useState('')

  const { data: students = [] } = useQuery({
    queryKey: ['my-students', appUser?.id],
    queryFn: () => getStudentsByRepresentative(appUser!.id),
    enabled: !!appUser?.id,
  })

  const student = students.find(s => s.id === selectedStudentId)

  const { data: supplies } = useQuery({
    queryKey: ['supplies-grade', student?.grade],
    queryFn: () => getSuppliesByGrade(appUser!.schoolId, student!.grade),
    enabled: !!student,
  })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Útiles Escolares</h1>
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
        <div className="text-center py-16 text-slate-400"><ShoppingBag size={36} className="mx-auto mb-3 opacity-30"/><p className="text-sm">Selecciona un estudiante</p></div>
      ) : !supplies ? (
        <div className="text-center py-16 text-slate-400"><ShoppingBag size={36} className="mx-auto mb-3 opacity-30"/><p className="text-sm">La lista aún no está disponible</p></div>
      ) : (
        <div className="space-y-4">
          {(supplies as any).supplies && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">📦 Lista de útiles — {student?.grade} grado</h2>
              <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{(supplies as any).supplies}</pre>
            </div>
          )}
          {(supplies as any).uniforms && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-700 mb-3">👔 Uniformes escolares</h2>
              <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{(supplies as any).uniforms}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
