import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsByRepresentative, createStudent } from '@/services/db'
import { Link } from 'react-router-dom'
import { format, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import { GraduationCap, AlertCircle, ArrowRight, Plus, X } from 'lucide-react'
import type { Student } from '@/types'

const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)
const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()
const GRADES = ['1er','2do','3er','4to','5to','6to','7mo','8vo','9no','10mo','11vo','12vo']
const SECTIONS = ['A','B','C','D','E']

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = { approved: 'bg-green-500', in_review: 'bg-amber-400', pending: 'bg-slate-300', rejected: 'bg-red-400' }
  return <span className={`w-2 h-2 rounded-full shrink-0 ${colors[status] || 'bg-slate-300'}`}/>
}

export default function RepresentativeDashboard() {
  const { appUser } = useAuth()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ fullName: '', grade: '1er', section: 'A', schoolYear: '2024-2025' })

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['my-students', appUser?.id],
    queryFn: () => getStudentsByRepresentative(appUser!.id),
    enabled: !!appUser?.id,
  })

  const createMut = useMutation({
    mutationFn: () => createStudent({
      fullName: form.fullName,
      grade: form.grade,
      section: form.section,
      schoolYear: form.schoolYear,
      schoolId: appUser!.schoolId,
      representativeId: appUser!.id,
      enrollmentCode: generateCode(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-students'] })
      setShowModal(false)
      setForm({ fullName: '', grade: '1er', section: 'A', schoolYear: '2024-2025' })
    },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bienvenido, {appUser?.displayName?.split(' ')[0]}</h1>
          <p className="text-slate-500 text-sm mt-1">{format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
          <Plus size={16}/> Agregar hijo
        </button>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <GraduationCap size={40} className="mx-auto mb-3 opacity-30"/>
          <p className="font-medium text-slate-600">No tienes hijos registrados</p>
          <p className="text-sm mt-1">Haz clic en "Agregar hijo" para registrar a tu primer hijo</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 mx-auto">
            <Plus size={16}/> Agregar hijo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {students.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <GraduationCap size={22} className="text-white"/>
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{s.fullName}</h3>
                    <p className="text-blue-200 text-sm">{s.grade}{s.section} · {s.schoolYear} · #{s.enrollmentCode}</p>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
                <Link to={`/student/${s.id}`}
                  className="flex-1 text-center text-sm text-blue-600 font-medium py-2 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-1">
                  Ver detalle <ArrowRight size={14}/>
                </Link>
                <Link to="/payments"
                  className="flex-1 text-center text-sm bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700">
                  Registrar pago
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Registrar hijo</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Nombre completo del estudiante</label>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre completo" value={form.fullName} onChange={set('fullName')}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Grado</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.grade} onChange={set('grade')}>
                    {GRADES.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Sección</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.section} onChange={set('section')}>
                    {SECTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Año escolar</label>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2024-2025" value={form.schoolYear} onChange={set('schoolYear')}/>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50">
                Cancelar
              </button>
              <button disabled={!form.fullName || createMut.isPending} onClick={() => createMut.mutate()}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 font-medium">
                {createMut.isPending ? 'Registrando...' : 'Registrar hijo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
