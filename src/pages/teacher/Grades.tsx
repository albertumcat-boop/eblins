import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsBySchool } from '@/services/db'
import { db } from '@/services/firebase'
import { collection, addDoc, getDocs, query, where, serverTimestamp, updateDoc, doc } from 'firebase/firestore'
import toast from 'react-hot-toast'
import { Plus, Save, BookOpen, X, Download, Filter } from 'lucide-react'
import type { Student } from '@/types'

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
  const [filterGrade, setFilterGrade] = useState('')
  const [filterSection, setFilterSection] = useState('')

  const { data: students = [] } = useQuery({
    queryKey: ['students', appUser?.schoolId],
    queryFn: () => getStudentsBySchool(appUser!.schoolId),
    enabled: !!appUser?.schoolId,
  })

  // Opciones únicas de grado y sección
  const gradeOptions = useMemo(() => [...new Set(students.map(s => s.grade))].sort(), [students])
  const sectionOptions = useMemo(() => {
    const base = filterGrade ? students.filter(s => s.grade === filterGrade) : students
    return [...new Set(base.map(s => s.section))].sort()
  }, [students, filterGrade])

  const filteredStudents = useMemo(() =>
    students.filter(s =>
      (!filterGrade || s.grade === filterGrade) &&
      (!filterSection || s.section === filterSection)
    ), [students, filterGrade, filterSection])

  // Cargar todas las notas del período para los estudiantes filtrados
  const { data: allGrades = [] } = useQuery({
    queryKey: ['allGrades', appUser?.schoolId, selectedPeriod],
    queryFn: async () => {
      if (!appUser?.schoolId) return []
      const q = query(collection(db, 'grades'),
        where('schoolId', '==', appUser.schoolId),
        where('period', '==', selectedPeriod))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() as any }))
    },
    enabled: !!appUser?.schoolId,
  })

  // Notas del estudiante seleccionado (para modal)
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

  const gradesByStudent = useMemo(() => {
    const map: Record<string, any> = {}
    allGrades.forEach((g: any) => { map[g.studentId] = g })
    return map
  }, [allGrades])

  const withGrades = filteredStudents.filter(s => gradesByStudent[s.id])
  const progressPct = filteredStudents.length > 0
    ? Math.round((withGrades.length / filteredStudents.length) * 100)
    : 0

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
      qc.invalidateQueries({ queryKey: ['allGrades'] })
      setShowModal(false)
    } catch { toast.error('Error al guardar notas') }
    finally { setSaving(false) }
  }

  const openModal = (studentId: string) => {
    setSelectedStudent(studentId)
    const existing = (gradesByStudent[studentId]) as any
    setGrades(existing?.grades || {})
    setShowModal(true)
  }

  const exportCSV = () => {
    const header = ['Nombre', 'Grado', 'Sección', ...SUBJECTS]
    const rows = filteredStudents.map(s => {
      const g = gradesByStudent[s.id]?.grades || {}
      return [s.fullName, s.grade, s.section, ...SUBJECTS.map(sub => g[sub] || '')]
    })
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `notas_${selectedPeriod.replace(/\s/g, '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Boletín de Notas</h1>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 text-sm border border-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50">
          <Download size={14}/> Exportar CSV
        </button>
      </div>

      {/* Selector de período */}
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

      {/* Filtros por grado y sección */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Filter size={14}/> Filtrar:
        </div>
        <select value={filterGrade} onChange={e => { setFilterGrade(e.target.value); setFilterSection('') }}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
          <option value="">Todos los grados</option>
          {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filterSection} onChange={e => setFilterSection(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
          <option value="">Todas las secciones</option>
          {sectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filterGrade || filterSection) && (
          <button onClick={() => { setFilterGrade(''); setFilterSection('') }}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <X size={12}/> Limpiar
          </button>
        )}
      </div>

      {/* Indicador de progreso */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-700">Notas cargadas en {selectedPeriod}</p>
          <span className="text-sm font-bold text-purple-600">{withGrades.length}/{filteredStudents.length} ({progressPct}%)</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-purple-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Tabla de estudiantes */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Mostrando <strong>{filteredStudents.length}</strong> estudiantes — período <strong>{selectedPeriod}</strong>
          </p>
        </div>

        {/* Vista tabla con materias */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Estudiante</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Grado/Sec.</th>
                {SUBJECTS.map(s => (
                  <th key={s} className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap min-w-[60px]">
                    {s.split(' ')[0]}
                  </th>
                ))}
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map(s => {
                const g = gradesByStudent[s.id]?.grades || {}
                const hasGrades = !!gradesByStudent[s.id]
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{s.fullName}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{s.grade}{s.section}</td>
                    {SUBJECTS.map(sub => (
                      <td key={sub} className="px-3 py-3 text-center">
                        {g[sub] ? (
                          <span className={`font-semibold ${Number(g[sub]) < 10 ? 'text-red-600' : Number(g[sub]) < 13 ? 'text-amber-600' : 'text-green-600'}`}>
                            {g[sub]}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openModal(s.id)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg mx-auto ${
                          hasGrades
                            ? 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}>
                        <BookOpen size={12}/> {hasGrades ? 'Editar' : 'Cargar'}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={SUBJECTS.length + 3} className="text-center py-10 text-slate-400 text-sm">
                    No hay estudiantes con esos filtros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de carga de notas */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <div>
                <h3 className="font-bold text-slate-800">Cargar notas</h3>
                <p className="text-xs text-slate-400">
                  {students.find(s => s.id === selectedStudent)?.fullName} · {selectedPeriod}
                </p>
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
