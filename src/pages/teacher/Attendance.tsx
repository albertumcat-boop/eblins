import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsBySchool } from '@/services/db'
import { db } from '@/services/firebase'
import { collection, addDoc, getDocs, query, where, serverTimestamp, updateDoc, doc } from 'firebase/firestore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { Check, X, Minus, Save, Calendar, Users, CheckCheck } from 'lucide-react'
import clsx from 'clsx'

type AttStatus = 'present' | 'absent' | 'late'

const STATUS_CONFIG: Record<AttStatus, { label: string; color: string; icon: any; short: string }> = {
  present: { label: 'Presente', short: 'P', color: 'bg-green-100 text-green-700 border-green-300', icon: Check },
  absent:  { label: 'Ausente',  short: 'A', color: 'bg-red-100 text-red-700 border-red-300',       icon: X },
  late:    { label: 'Tardanza', short: 'T', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: Minus },
}

const GRADES   = ['1er','2do','3er','4to','5to','6to','7mo','8vo','9no','10mo','11vo','12vo']
const SECTIONS = ['A','B','C','D','E']

export default function TeacherAttendance() {
  const { appUser } = useAuth()
  const qc = useQueryClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [selectedDate, setSelectedDate] = useState(today)
  const [attendance, setAttendance] = useState<Record<string, AttStatus>>({})
  const [saving, setSaving] = useState(false)
  const [gradeFilter, setGradeFilter] = useState('1er')
  const [sectionFilter, setSectionFilter] = useState('A')

  const { data: allStudents = [] } = useQuery({
    queryKey: ['students', appUser?.schoolId],
    queryFn: () => getStudentsBySchool(appUser!.schoolId),
    enabled: !!appUser?.schoolId,
  })

  // Filter by selected grade/section
  const students = allStudents.filter(s => s.grade === gradeFilter && s.section === sectionFilter)

  const { data: existingAtt } = useQuery({
    queryKey: ['attendance', selectedDate, appUser?.schoolId, gradeFilter, sectionFilter],
    queryFn: async () => {
      const q = query(collection(db, 'attendance'),
        where('date', '==', selectedDate),
        where('schoolId', '==', appUser!.schoolId),
        where('grade', '==', gradeFilter),
        where('section', '==', sectionFilter))
      const snap = await getDocs(q)
      if (!snap.empty) {
        const data = snap.docs[0].data()
        setAttendance(data.records || {})
        return { id: snap.docs[0].id, ...data }
      }
      setAttendance({})
      return null
    },
    enabled: !!appUser?.schoolId,
  })

  const toggle = (studentId: string) => {
    setAttendance(prev => {
      const current = prev[studentId]
      const next: AttStatus = !current || current === 'late' ? 'present' : current === 'present' ? 'absent' : 'late'
      return { ...prev, [studentId]: next }
    })
  }

  const markAll = (status: AttStatus) => {
    const all: Record<string, AttStatus> = {}
    students.forEach(s => { all[s.id] = status })
    setAttendance(all)
  }

  const handleSave = async () => {
    if (students.length === 0) { toast.error('No hay estudiantes en este grado/sección'); return }
    setSaving(true)
    try {
      const data = {
        date:      selectedDate,
        schoolId:  appUser!.schoolId,
        teacherId: appUser!.id,
        grade:     gradeFilter,
        section:   sectionFilter,
        records:   attendance,
        updatedAt: serverTimestamp(),
      }
      if (existingAtt) {
        await updateDoc(doc(db, 'attendance', (existingAtt as any).id), data)
      } else {
        await addDoc(collection(db, 'attendance'), { ...data, createdAt: serverTimestamp() })
      }
      toast.success(`Asistencia guardada — ${gradeFilter} ${sectionFilter}`)
      qc.invalidateQueries({ queryKey: ['attendance'] })
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const counts = {
    present: Object.values(attendance).filter(v => v === 'present').length,
    absent:  Object.values(attendance).filter(v => v === 'absent').length,
    late:    Object.values(attendance).filter(v => v === 'late').length,
    unmarked: students.length - Object.values(attendance).filter(Boolean).length,
  }
  const allMarked = students.length > 0 && counts.unmarked === 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Asistencia</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {format(new Date(selectedDate + 'T12:00:00'), "EEEE d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <button onClick={handleSave} disabled={saving || students.length === 0}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors">
          <Save size={16}/>{saving ? 'Guardando...' : 'Guardar asistencia'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1.5">Fecha</label>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400"/>
            <input type="date" value={selectedDate} max={today}
              onChange={e => setSelectedDate(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"/>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1.5">Grado</label>
          <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            {GRADES.map(g => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1.5">Sección</label>
          <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            {SECTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5 ml-auto text-sm text-slate-500">
          <Users size={16}/>{students.length} estudiantes
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{counts.present}</p>
          <p className="text-xs font-medium text-green-600">Presentes</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{counts.absent}</p>
          <p className="text-xs font-medium text-red-600">Ausentes</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-700">{counts.late}</p>
          <p className="text-xs font-medium text-amber-600">Tardanzas</p>
        </div>
        <div className={clsx('border rounded-xl p-3 text-center', allMarked ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200')}>
          <p className={clsx('text-2xl font-bold', allMarked ? 'text-blue-700' : 'text-slate-500')}>{counts.unmarked}</p>
          <p className={clsx('text-xs font-medium', allMarked ? 'text-blue-600' : 'text-slate-400')}>
            {allMarked ? '✓ Completado' : 'Sin marcar'}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-sm text-slate-500 self-center">Marcar todos como:</span>
        {(['present','absent','late'] as AttStatus[]).map(status => {
          const cfg = STATUS_CONFIG[status]
          const Icon = cfg.icon
          return (
            <button key={status} onClick={() => markAll(status)}
              className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:opacity-80', cfg.color)}>
              <Icon size={12}/>{cfg.label}
            </button>
          )
        })}
      </div>

      {/* Student list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">Toca el nombre para cambiar estado: Presente → Ausente → Tardanza</span>
          {allMarked && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCheck size={13}/>Todos marcados
            </span>
          )}
        </div>

        {students.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Users size={32} className="mx-auto mb-2 opacity-30"/>
            <p className="text-sm">No hay estudiantes en {gradeFilter} {sectionFilter}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {students.map((s, idx) => {
              const status = attendance[s.id]
              const cfg = status ? STATUS_CONFIG[status] : null
              const Icon = cfg?.icon
              return (
                <div key={s.id} className={clsx(
                  'flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-slate-50',
                  status === 'absent' && 'bg-red-50/30',
                  status === 'late' && 'bg-amber-50/30',
                )}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-5 text-right">{idx + 1}</span>
                    <div>
                      <p className="font-medium text-slate-700 text-sm">{s.fullName}</p>
                      <p className="text-xs text-slate-400">{s.grade} {s.section}</p>
                    </div>
                  </div>
                  <button onClick={() => toggle(s.id)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all min-w-[90px] justify-center',
                      cfg ? cfg.color : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                    )}>
                    {Icon ? <Icon size={13}/> : <Minus size={13}/>}
                    {cfg?.label || 'Sin marcar'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
