import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsBySchool } from '@/services/db'
import { db } from '@/services/firebase'
import { collection, addDoc, getDocs, query, where, serverTimestamp, updateDoc, doc } from 'firebase/firestore'
import toast from 'react-hot-toast'
import { Plus, Save, BookOpen, X } from 'lucide-react'

const PERIODS = ['1er Lapso', '2do Lapso', '3er Lapso', 'Final']
const SUBJECTS = ['Matemáticas','Lengua y Literatura','Ciencias Naturales','Ciencias Sociales','Inglés','Educación Física','Arte','Computación']

export default function TeacherGrades() {
  const { appUser } = useAuth()
  const qc = useQueryClient()
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('1er Lapso')
  const [grades, setGrades] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const { data: students = [] } = useQuery({
    queryKey: ['students', appUser?.schoolId],
    queryFn: () => getStudentsBySchool(appUser!.schoolId),
    enabled: !!appUser?.schoolId,
  })

  const { data: existingGrades = [] } = useQuery({
    queryKey: ['grades', selectedStudent, selectedPeriod],
    queryFn: async () => {
      if (!selectedStudent) return []
      const q = query(collection(db, 'grades'),
        where('studentId', '==', selectedStudent),
        where('period', '==', selectedPeriod))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
    enabled: !!selectedStudent,
  })

  const handleSave = async () => {
    if (!selectedStudent) return
    setSaving(true)
    try {
      const existing = existingGrades[0] as any
      const data = {
        studentId:  selectedStudent,
        schoolId:   appUser!.schoolId,
        teacherId:  appUser!.id,
        teacherName: appUser!.displayName,
        period:     selectedPeriod,
        grades,
        updatedAt:  serverTimestamp(),
      }
      if (existing) {
        await updateDoc(doc(db, 'grades', existing.id), data)
      } else {
        await addDoc(collection(db, 'grades'), { ...data, createdAt: serverTimestamp() })
      }
      toast.success('Notas guardadas')
      qc.invalidateQueries({ queryKey: ['grades'] })
      setShowModal(false)
    } catch { toast.error('Error al guardar notas') }
    finally { setSaving(false) }
  }

  const openModal = (studentId: string) => {
    setSelectedStudent(studentId)
    const existing = existingGrades[0] as any
    setGrades(existing?.grades || {})
    setShowModal(true)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Boletín de Notas</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        {PERIODS.map(p => (
          <button key={p} onClick={() => setSelectedPeriod(p)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              selectedPeriod === p ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 text-slate-700 hover:border-purple-300'
            }`}>
            {p}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-sm text-slate-500">Selecciona un estudiante para cargar o editar sus notas del <strong>{selectedPeriod}</strong></p>
        </div>
        <div className="divide-y divide-slate-100">
          {students.map(s => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-medium text-slate-700">{s.fullName}</p>
                <p className="text-xs text-slate-400">{s.grade}{s.section}</p>
              </div>
              <button onClick={() => openModal(s.id)}
                className="flex items-center gap-1.5 text-sm bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700">
                <BookOpen size={14}/> Cargar notas
              </button>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <div>
                <h3 className="font-bold text-slate-800">Cargar notas</h3>
                <p className="text-xs text-slate-400">{selectedPeriod}</p>
              </div>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-slate-400"/></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {SUBJECTS.map(subject => (
                <div key={subject} className="flex items-center gap-3">
                  <label className="text-sm text-slate-700 flex-1">{subject}</label>
                  <input type="number" min="0" max="20"
                    className="w-20 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="—"
                    value={grades[subject] || ''}
                    onChange={e => setGrades(g => ({ ...g, [subject]: e.target.value }))}/>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2">
                <Save size={14}/>{saving ? 'Guardando...' : 'Guardar notas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
