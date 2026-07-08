import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsBySchool } from '@/services/db'
import { db } from '@/services/firebase'
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { Award, ChevronDown, Users, Calendar, History } from 'lucide-react'
import clsx from 'clsx'

const BEHAVIOR_TYPES = [
  { value: 'excellent', label: 'Excelente',  emoji: '🏆', color: 'bg-green-100 text-green-700 border-green-300',   selectedBg: 'bg-green-600 text-white border-green-600',  negative: false },
  { value: 'verygood',  label: 'Muy buena',  emoji: '⭐', color: 'bg-blue-100 text-blue-700 border-blue-300',      selectedBg: 'bg-blue-600 text-white border-blue-600',    negative: false },
  { value: 'good',      label: 'Buena',      emoji: '👍', color: 'bg-teal-100 text-teal-700 border-teal-300',      selectedBg: 'bg-teal-600 text-white border-teal-600',    negative: false },
  { value: 'warning',   label: 'Llamado',    emoji: '⚠️', color: 'bg-amber-100 text-amber-700 border-amber-300',   selectedBg: 'bg-amber-500 text-white border-amber-500',  negative: true  },
  { value: 'minor',     label: 'Falta leve', emoji: '⚡', color: 'bg-orange-100 text-orange-700 border-orange-300',selectedBg: 'bg-orange-500 text-white border-orange-500',negative: true  },
  { value: 'serious',   label: 'Falta grave',emoji: '🚨', color: 'bg-red-100 text-red-700 border-red-300',         selectedBg: 'bg-red-600 text-white border-red-600',      negative: true  },
]

const CONSEQUENCES = [
  'Ninguna', 'Notificación al representante', 'Citación al representante',
  'Suspensión 1 día', 'Suspensión 3 días', 'Suspensión 5 días', 'Otro',
]

const GRADES   = ['1er','2do','3er','4to','5to','6to','7mo','8vo','9no','10mo','11vo','12vo']
const SECTIONS = ['A','B','C','D','E']

interface StudentRow {
  id: string
  selectedType: string | null
  description: string
  consequence: string
  saving: boolean
  saved: boolean
}

export default function TeacherBehavior() {
  const { appUser } = useAuth()
  const qc = useQueryClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [selectedDate, setSelectedDate] = useState(today)
  const [gradeFilter, setGradeFilter]   = useState(appUser?.assignedGrade || '1er')
  const [sectionFilter, setSectionFilter] = useState(appUser?.assignedSection || 'A')
  const [rows, setRows] = useState<Record<string, StudentRow>>({})

  useEffect(() => {
    if (appUser?.assignedGrade) setGradeFilter(appUser.assignedGrade)
    if (appUser?.assignedSection) setSectionFilter(appUser.assignedSection)
  }, [appUser?.assignedGrade, appUser?.assignedSection])
  const [showHistory, setShowHistory] = useState(false)
  const [filterStudent, setFilterStudent] = useState('')

  const { data: allStudents = [] } = useQuery({
    queryKey: ['students', appUser?.schoolId],
    queryFn: () => getStudentsBySchool(appUser!.schoolId),
    enabled: !!appUser?.schoolId,
  })

  const students = allStudents.filter(s => s.grade === gradeFilter && s.section === sectionFilter)

  const { data: records = [] } = useQuery({
    queryKey: ['behavior', appUser?.schoolId, filterStudent],
    queryFn: async () => {
      const conditions: any[] = [where('schoolId', '==', appUser!.schoolId)]
      if (filterStudent) conditions.push(where('studentId', '==', filterStudent))
      const q = query(collection(db, 'behavior'), ...conditions, orderBy('date', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
    enabled: !!appUser?.schoolId,
  })

  const getRow = (studentId: string): StudentRow =>
    rows[studentId] ?? { id: studentId, selectedType: null, description: '', consequence: 'Ninguna', saving: false, saved: false }

  const setRow = (studentId: string, patch: Partial<StudentRow>) =>
    setRows(prev => ({ ...prev, [studentId]: { ...getRow(studentId), ...patch } }))

  const selectType = (studentId: string, typeValue: string) => {
    const bt = BEHAVIOR_TYPES.find(b => b.value === typeValue)!
    const row = getRow(studentId)
    // Toggle off if already selected
    if (row.selectedType === typeValue) {
      setRow(studentId, { selectedType: null, description: '', consequence: 'Ninguna', saved: false })
      return
    }
    setRow(studentId, { selectedType: typeValue, description: '', consequence: 'Ninguna', saved: false })
    // Auto-save positive behaviors immediately
    if (!bt.negative) saveRecord(studentId, typeValue, 'Conducta positiva registrada', 'Ninguna')
  }

  const saveRecord = async (studentId: string, typeValue: string, description: string, consequence: string) => {
    setRow(studentId, { saving: true })
    try {
      const student = allStudents.find(s => s.id === studentId)
      const bt = BEHAVIOR_TYPES.find(b => b.value === typeValue)!
      await addDoc(collection(db, 'behavior'), {
        studentId, studentName: student?.fullName,
        schoolId: appUser!.schoolId,
        teacherId: appUser!.id, teacherName: appUser!.displayName,
        type: typeValue, description, consequence,
        date: selectedDate, createdAt: serverTimestamp(),
      })
      if (bt.negative && student?.representativeId) {
        await addDoc(collection(db, 'notifications'), {
          userId: student.representativeId,
          schoolId: appUser!.schoolId,
          title: `${bt.emoji} Reporte de conducta`,
          body: `${student.fullName}: ${description}. Consecuencia: ${consequence}`,
          type: 'system', read: false, createdAt: serverTimestamp(),
        })
      }
      setRow(studentId, { saving: false, saved: true, description: '', consequence: 'Ninguna' })
      toast.success(`Conducta guardada — ${student?.fullName}`)
      qc.invalidateQueries({ queryKey: ['behavior'] })
    } catch {
      setRow(studentId, { saving: false })
      toast.error('Error al guardar')
    }
  }

  const handleSaveNegative = (studentId: string) => {
    const row = getRow(studentId)
    if (!row.selectedType || !row.description.trim()) {
      toast.error('Describe el motivo de la conducta negativa')
      return
    }
    saveRecord(studentId, row.selectedType, row.description, row.consequence)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Control de Conducta</h1>
        <button onClick={() => setShowHistory(v => !v)}
          className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50">
          <History size={15}/>{showHistory ? 'Ocultar historial' : 'Ver historial'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1.5">Fecha</label>
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-slate-400"/>
            <input type="date" value={selectedDate} max={today}
              onChange={e => { setSelectedDate(e.target.value); setRows({}) }}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"/>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1.5">Grado</label>
          <select value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setRows({}) }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            {GRADES.map(g => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1.5">Sección</label>
          <select value={sectionFilter} onChange={e => { setSectionFilter(e.target.value); setRows({}) }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            {SECTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5 ml-auto text-sm text-slate-500">
          <Users size={15}/>{students.length} estudiantes
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {BEHAVIOR_TYPES.map(b => (
          <span key={b.value} className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', b.color)}>
            {b.emoji} {b.label}
          </span>
        ))}
      </div>

      {/* Student list */}
      {students.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400">
          <Users size={32} className="mx-auto mb-2 opacity-30"/>
          <p className="text-sm">No hay estudiantes en {gradeFilter} {sectionFilter}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {students.map((s, idx) => {
            const row = getRow(s.id)
            const selectedBt = BEHAVIOR_TYPES.find(b => b.value === row.selectedType)

            return (
              <div key={s.id} className={clsx(
                'px-4 py-3 transition-colors',
                row.saved && 'bg-green-50/50',
              )}>
                {/* Student name + number */}
                <div className="flex items-center gap-3 mb-2.5">
                  <span className="text-xs text-slate-400 w-5 text-right shrink-0">{idx + 1}</span>
                  <span className="font-medium text-slate-700 text-sm flex-1">{s.fullName}</span>
                  {row.saved && selectedBt && (
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold border', selectedBt.color)}>
                      {selectedBt.emoji} Guardado
                    </span>
                  )}
                </div>

                {/* Quick buttons */}
                <div className="flex flex-wrap gap-1.5 ml-8">
                  {BEHAVIOR_TYPES.map(bt => (
                    <button
                      key={bt.value}
                      disabled={row.saving || row.saved}
                      onClick={() => selectType(s.id, bt.value)}
                      className={clsx(
                        'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                        row.selectedType === bt.value ? bt.selectedBg : bt.color,
                        (row.saving || row.saved) && 'opacity-50 cursor-not-allowed',
                      )}>
                      <span>{bt.emoji}</span>
                      <span className="hidden sm:inline">{bt.label}</span>
                    </button>
                  ))}
                </div>

                {/* Negative behavior form — expands inline */}
                {row.selectedType && selectedBt?.negative && !row.saved && (
                  <div className="ml-8 mt-3 space-y-2 border-l-2 border-red-200 pl-3">
                    <textarea
                      rows={2}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                      placeholder="¿Qué ocurrió? Describe la situación..."
                      value={row.description}
                      onChange={e => setRow(s.id, { description: e.target.value })}
                    />
                    <div className="flex gap-2 items-center flex-wrap">
                      <select
                        className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400 flex-1 min-w-[180px]"
                        value={row.consequence}
                        onChange={e => setRow(s.id, { consequence: e.target.value })}>
                        {CONSEQUENCES.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <button
                        onClick={() => handleSaveNegative(s.id)}
                        disabled={row.saving || !row.description.trim()}
                        className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-red-700 disabled:opacity-50">
                        {row.saving ? 'Guardando...' : '💾 Guardar'}
                      </button>
                      <button
                        onClick={() => setRow(s.id, { selectedType: null, description: '', consequence: 'Ninguna' })}
                        className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* History (collapsible) */}
      {showHistory && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <History size={15} className="text-purple-500"/> Historial de conducta
            </span>
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setFilterStudent('')}
                className={clsx('px-3 py-1 rounded-lg text-xs font-medium border',
                  !filterStudent ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 text-slate-600')}>
                Todos
              </button>
              {allStudents.slice(0, 8).map(s => (
                <button key={s.id} onClick={() => setFilterStudent(s.id)}
                  className={clsx('px-3 py-1 rounded-lg text-xs font-medium border',
                    filterStudent === s.id ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 text-slate-600')}>
                  {s.fullName.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          {records.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Award size={28} className="mx-auto mb-2 opacity-30"/>
              <p className="text-sm">Sin registros</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {(records as any[]).map(r => {
                const bt = BEHAVIOR_TYPES.find(b => b.value === r.type)
                return (
                  <div key={r.id} className="px-5 py-3 flex items-start gap-3">
                    <span className="text-lg mt-0.5">{bt?.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-800 text-sm">{r.studentName}</span>
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium border', bt?.color)}>{bt?.label}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
                      {r.consequence !== 'Ninguna' && (
                        <p className="text-xs text-red-600 font-medium mt-0.5">Consecuencia: {r.consequence}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">
                        {format(new Date(r.date + 'T12:00:00'), "d 'de' MMMM yyyy", { locale: es })} · {r.teacherName}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
