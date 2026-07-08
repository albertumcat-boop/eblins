import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsBySchool } from '@/services/db'
import { db } from '@/services/firebase'
import {
  collection, addDoc, getDocs, query, where,
  serverTimestamp, updateDoc, doc,
} from 'firebase/firestore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import {
  Check, X, Clock, Save, Calendar, Users,
  CheckCheck, AlarmClock, Bell,
} from 'lucide-react'
import clsx from 'clsx'

type AttStatus = 'present' | 'absent' | 'late' | 'excused'

const STATUS_CFG: Record<AttStatus, { label: string; short: string; color: string; selectedBg: string; icon: any }> = {
  present: { label: 'Asistió',     short: '✓',  color: 'bg-green-100 text-green-700 border-green-300',   selectedBg: 'bg-green-600 text-white border-green-600',   icon: Check },
  absent:  { label: 'Ausente',     short: '✗',  color: 'bg-red-100 text-red-700 border-red-300',         selectedBg: 'bg-red-600 text-white border-red-600',       icon: X },
  late:    { label: 'Tardanza',    short: '⏰', color: 'bg-amber-100 text-amber-700 border-amber-300',   selectedBg: 'bg-amber-500 text-white border-amber-500',   icon: Clock },
  excused: { label: 'Justificado', short: '📋', color: 'bg-blue-100 text-blue-700 border-blue-300',      selectedBg: 'bg-blue-600 text-white border-blue-600',     icon: Check },
}

const GRADES   = ['1er','2do','3er','4to','5to','6to','7mo','8vo','9no','10mo','11vo','12vo']
const SECTIONS = ['A','B','C','D','E']

interface LateNotice {
  id: string
  studentId: string
  studentName: string
  type: 'late' | 'absent'
  reason: string
  expectedTime?: string | null
  representativeName: string
}

export default function TeacherAttendance() {
  const { appUser } = useAuth()
  const qc = useQueryClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [selectedDate, setSelectedDate] = useState(today)
  const [attendance, setAttendance] = useState<Record<string, AttStatus>>({})
  const [saving, setSaving] = useState(false)
  const [gradeFilter, setGradeFilter] = useState(appUser?.assignedGrade || '1er')
  const [sectionFilter, setSectionFilter] = useState(appUser?.assignedSection || 'A')

  // Sync filters when appUser loads asynchronously (Firestore onSnapshot may arrive after first render)
  useEffect(() => {
    if (appUser?.assignedGrade) setGradeFilter(appUser.assignedGrade)
    if (appUser?.assignedSection) setSectionFilter(appUser.assignedSection)
  }, [appUser?.assignedGrade, appUser?.assignedSection])

  const { data: allStudents = [] } = useQuery({
    queryKey: ['students', appUser?.schoolId],
    queryFn: () => getStudentsBySchool(appUser!.schoolId),
    enabled: !!appUser?.schoolId,
  })

  const students = allStudents.filter(s => s.grade === gradeFilter && s.section === sectionFilter)

  // Load attendance record for this date/grade/section
  const { data: existingAtt } = useQuery({
    queryKey: ['attendance', selectedDate, appUser?.schoolId, gradeFilter, sectionFilter],
    queryFn: async () => {
      const q = query(
        collection(db, 'attendance'),
        where('date', '==', selectedDate),
        where('schoolId', '==', appUser!.schoolId),
        where('grade', '==', gradeFilter),
        where('section', '==', sectionFilter),
      )
      const snap = await getDocs(q)
      if (!snap.empty) {
        const data = snap.docs[0].data()
        setAttendance(data.records || {})
        return { id: snap.docs[0].id, ...data }
      }
      // No saved record yet — pre-fill from lateNotices (applied after notices load)
      setAttendance({})
      return null
    },
    enabled: !!appUser?.schoolId,
  })

  // Load late/absence notices from representatives for this date + grade
  const { data: notices = [] } = useQuery({
    queryKey: ['lateNotices-teacher', appUser?.schoolId, selectedDate, gradeFilter, sectionFilter],
    queryFn: async () => {
      const q = query(
        collection(db, 'lateNotices'),
        where('schoolId', '==', appUser!.schoolId),
        where('date', '==', selectedDate),
        where('grade', '==', gradeFilter),
        where('section', '==', sectionFilter),
      )
      const snap = await getDocs(q)
      const result = snap.docs.map(d => ({ id: d.id, ...d.data() } as LateNotice))

      // If no attendance saved yet, pre-fill states from notices
      setAttendance(prev => {
        const hasSaved = Object.keys(prev).length > 0
        if (hasSaved) return prev           // don't overwrite teacher's work
        const prefilled: Record<string, AttStatus> = {}
        result.forEach(n => {
          prefilled[n.studentId] = n.type === 'late' ? 'late' : 'absent'
        })
        return prefilled
      })
      return result
    },
    enabled: !!appUser?.schoolId,
  })

  // Build a map: studentId → notice (for quick lookup in the list)
  const noticeByStudent: Record<string, LateNotice> = {}
  notices.forEach(n => { noticeByStudent[n.studentId] = n })

  const setStatus = (studentId: string, status: AttStatus) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === status ? undefined as any : status,
    }))
  }

  const markAll = (status: AttStatus) => {
    const all: Record<string, AttStatus> = {}
    students.forEach(s => { all[s.id] = status })
    setAttendance(all)
  }

  const allStatuses = Object.keys(STATUS_CFG) as AttStatus[]

  const handleSave = async () => {
    if (students.length === 0) { toast.error('No hay estudiantes en este grado/sección'); return }
    setSaving(true)
    try {
      const data = {
        date: selectedDate, schoolId: appUser!.schoolId, teacherId: appUser!.id,
        grade: gradeFilter, section: sectionFilter,
        records: attendance, updatedAt: serverTimestamp(),
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
    present:  Object.values(attendance).filter(v => v === 'present').length,
    absent:   Object.values(attendance).filter(v => v === 'absent').length,
    late:     Object.values(attendance).filter(v => v === 'late').length,
    excused:  Object.values(attendance).filter(v => v === 'excused').length,
    unmarked: students.length - Object.values(attendance).filter(Boolean).length,
  }
  const allMarked = students.length > 0 && counts.unmarked === 0
  const isToday = selectedDate === today

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

      {/* Advertencia grado diferente */}
      {appUser?.assignedGrade && gradeFilter !== appUser.assignedGrade && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          ⚠️ Estás viendo datos de un grado diferente al asignado en tu perfil.
        </div>
      )}

      {/* Avisos de representantes — banner */}
      {notices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell size={16} className="text-blue-600"/>
            <span className="font-semibold text-blue-800 text-sm">
              {notices.length} aviso{notices.length > 1 ? 's' : ''} de representantes para hoy
            </span>
          </div>
          <div className="space-y-1.5">
            {notices.map(n => (
              <div key={n.id} className="flex items-start gap-2 text-sm">
                <span className={clsx(
                  'shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold mt-0.5',
                  n.type === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                )}>
                  {n.type === 'late' ? '⏰ Tarde' : '🚫 Ausente'}
                </span>
                <span className="text-blue-900">
                  <strong>{n.studentName}</strong>
                  {' — '}{n.reason}
                  {n.type === 'late' && n.expectedTime && (
                    <span className="text-blue-600"> · llega aprox. {n.expectedTime}</span>
                  )}
                  <span className="text-blue-400 text-xs"> · Aviso de: {n.representativeName}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{counts.present}</p>
          <p className="text-xs font-medium text-green-600">Asistieron</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{counts.absent}</p>
          <p className="text-xs font-medium text-red-600">Ausentes</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-700">{counts.late}</p>
          <p className="text-xs font-medium text-amber-600">Tardanzas</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{counts.excused}</p>
          <p className="text-xs font-medium text-blue-600">Justificados</p>
        </div>
        <div className={clsx('border rounded-xl p-3 text-center',
          allMarked ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200')}>
          <p className={clsx('text-2xl font-bold', allMarked ? 'text-purple-700' : 'text-slate-500')}>
            {allMarked ? '✓' : counts.unmarked}
          </p>
          <p className={clsx('text-xs font-medium', allMarked ? 'text-purple-600' : 'text-slate-400')}>
            {allMarked ? 'Completado' : 'Sin marcar'}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-sm text-slate-500">Marcar todos:</span>
        {allStatuses.map(status => {
          const cfg = STATUS_CFG[status]
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
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <AlarmClock size={13} className="text-blue-400"/>
            El ícono de campana indica que el representante envió un aviso previo
          </span>
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
              const cfg = status ? STATUS_CFG[status] : null
              const Icon = cfg?.icon
              const notice = noticeByStudent[s.id]

              return (
                <div key={s.id} className={clsx(
                  'flex items-center gap-3 px-5 py-3.5 transition-colors',
                  status === 'absent' && 'bg-red-50/40',
                  status === 'late'   && 'bg-amber-50/40',
                  !status && 'hover:bg-slate-50',
                )}>
                  {/* Number */}
                  <span className="text-xs text-slate-400 w-5 text-right shrink-0">{idx + 1}</span>

                  {/* Student info + notice */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-700 text-sm">{s.fullName}</span>
                      {notice && (
                        <span className={clsx(
                          'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold',
                          notice.type === 'late'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        )}>
                          <Bell size={10}/>
                          {notice.type === 'late' ? 'Aviso tardanza' : 'Aviso ausencia'}
                        </span>
                      )}
                    </div>
                    {notice && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {notice.reason}
                        {notice.type === 'late' && notice.expectedTime
                          ? ` · llega ~${notice.expectedTime}`
                          : ''}
                      </p>
                    )}
                  </div>

                  {/* 4 status buttons */}
                  <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                    {allStatuses.map(st => {
                      const c = STATUS_CFG[st]
                      const Ic = c.icon
                      const isSelected = status === st
                      return (
                        <button key={st} onClick={() => setStatus(s.id, st)}
                          title={c.label}
                          className={clsx(
                            'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                            isSelected ? c.selectedBg : c.color + ' hover:opacity-80'
                          )}>
                          <Ic size={12}/>
                          <span className="hidden md:inline">{c.label}</span>
                          <span className="md:hidden">{c.short}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <p className="text-xs text-slate-400 text-center">
        Toca un botón para marcar el estado. Tócalo de nuevo para desmarcarlo.
      </p>
    </div>
  )
}
