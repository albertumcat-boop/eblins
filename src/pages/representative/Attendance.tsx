import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsByRepresentative } from '@/services/db'
import { db } from '@/services/firebase'
import {
  collection, query, where, orderBy, limit,
  onSnapshot, getDocs,
} from 'firebase/firestore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Check, X, Clock, Calendar, AlertTriangle,
  CheckCircle2, HelpCircle, Radio,
} from 'lucide-react'
import clsx from 'clsx'

type AttStatus = 'present' | 'absent' | 'late' | null

const STATUS_CFG: Record<string, { label: string; bg: string; border: string; text: string; icon: any; desc: string }> = {
  present: {
    label: 'Presente',
    bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700',
    icon: CheckCircle2,
    desc: 'Tu hijo/a llegó y está en clases.',
  },
  absent: {
    label: 'Ausente',
    bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700',
    icon: AlertTriangle,
    desc: 'Tu hijo/a no asistió a clases hoy.',
  },
  late: {
    label: 'Tardanza',
    bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700',
    icon: Clock,
    desc: 'Tu hijo/a llegó tarde a clases.',
  },
}

const HISTORY_CFG: Record<string, { label: string; color: string; icon: any }> = {
  present: { label: 'Presente', color: 'bg-green-100 text-green-700', icon: Check },
  absent:  { label: 'Ausente',  color: 'bg-red-100 text-red-700',     icon: X },
  late:    { label: 'Tardanza', color: 'bg-amber-100 text-amber-700', icon: Clock },
}

export default function RepresentativeAttendance() {
  const { appUser } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [todayStatus, setTodayStatus] = useState<AttStatus>(null)
  const [attendanceTaken, setAttendanceTaken] = useState(false) // teacher saved a record today
  const [liveTime, setLiveTime] = useState(format(new Date(), 'HH:mm'))

  // Tick the live clock every minute
  useEffect(() => {
    const t = setInterval(() => setLiveTime(format(new Date(), 'HH:mm')), 60_000)
    return () => clearInterval(t)
  }, [])

  const { data: students = [] } = useQuery({
    queryKey: ['my-students', appUser?.id],
    queryFn: () => getStudentsByRepresentative(appUser!.id, appUser!.schoolId),
    enabled: !!appUser?.id,
  })

  const selectedStudent = students.find(s => s.id === selectedStudentId)

  // ── Real-time listener for TODAY's attendance ───────────────────────────
  useEffect(() => {
    if (!selectedStudent || !appUser?.schoolId) return
    setTodayStatus(null)
    setAttendanceTaken(false)

    const q = query(
      collection(db, 'attendance'),
      where('schoolId', '==', appUser.schoolId),
      where('date', '==', today),
      where('grade', '==', selectedStudent.grade),
      where('section', '==', selectedStudent.section),
    )

    const unsub = onSnapshot(q, snap => {
      if (snap.empty) {
        setTodayStatus(null)
        setAttendanceTaken(false)
        return
      }
      const data = snap.docs[0].data()
      const status = data.records?.[selectedStudentId] ?? null
      setTodayStatus(status)
      setAttendanceTaken(true)
    })

    return unsub
  }, [selectedStudentId, selectedStudent?.grade, selectedStudent?.section, appUser?.schoolId, today])

  // ── Historical records (last 30 days) ──────────────────────────────────
  const { data: history = [] } = useQuery({
    queryKey: ['rep-attendance-history', selectedStudentId, selectedStudent?.grade, selectedStudent?.section],
    queryFn: async () => {
      if (!selectedStudent) return []
      const q = query(
        collection(db, 'attendance'),
        where('schoolId', '==', appUser!.schoolId),
        where('grade', '==', selectedStudent.grade),
        where('section', '==', selectedStudent.section),
        orderBy('date', 'desc'),
        limit(30),
      )
      const snap = await getDocs(q)
      return snap.docs
        .filter(d => d.data().records?.[selectedStudentId])
        .map(d => ({
          id: d.id,
          date: d.data().date as string,
          status: d.data().records?.[selectedStudentId] as string,
        }))
    },
    enabled: !!selectedStudentId && !!selectedStudent,
  })

  const counts = {
    present: history.filter(r => r.status === 'present').length,
    absent:  history.filter(r => r.status === 'absent').length,
    late:    history.filter(r => r.status === 'late').length,
  }

  // Auto-select first student
  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) setSelectedStudentId(students[0].id)
  }, [students])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Asistencia</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })} · {liveTime}
          </p>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-full">
          <Radio size={12} className="animate-pulse"/>
          En vivo
        </div>
      </div>

      {/* Student selector */}
      {students.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {students.map(s => (
            <button key={s.id} onClick={() => setSelectedStudentId(s.id)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
                selectedStudentId === s.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-200 text-slate-700 hover:border-blue-300',
              )}>
              {s.fullName}
            </button>
          ))}
        </div>
      )}

      {selectedStudentId && selectedStudent && (
        <>
          {/* ── TODAY'S STATUS — main card ───────────────────────────── */}
          <div className={clsx(
            'rounded-2xl border-2 p-6 transition-all',
            todayStatus ? STATUS_CFG[todayStatus].bg + ' ' + STATUS_CFG[todayStatus].border
              : attendanceTaken ? 'bg-slate-50 border-slate-300'
              : 'bg-white border-slate-200',
          )}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Estado de hoy — {selectedStudent.fullName}
            </p>

            {/* Not taken yet */}
            {!attendanceTaken && (
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <HelpCircle size={28} className="text-slate-400"/>
                </div>
                <div>
                  <p className="font-bold text-slate-600 text-lg">Sin registrar</p>
                  <p className="text-sm text-slate-400 mt-0.5">
                    El maestro aún no ha pasado lista. Esta página se actualizará automáticamente.
                  </p>
                </div>
              </div>
            )}

            {/* Taken but student not in record (shouldn't happen often) */}
            {attendanceTaken && !todayStatus && (
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <HelpCircle size={28} className="text-slate-400"/>
                </div>
                <div>
                  <p className="font-bold text-slate-600 text-lg">No registrado</p>
                  <p className="text-sm text-slate-400 mt-0.5">
                    El maestro pasó lista pero no registró a este alumno.
                  </p>
                </div>
              </div>
            )}

            {/* Status known */}
            {todayStatus && (() => {
              const cfg = STATUS_CFG[todayStatus]
              const Icon = cfg.icon
              return (
                <div className="flex items-center gap-4">
                  <div className={clsx(
                    'w-14 h-14 rounded-2xl flex items-center justify-center',
                    todayStatus === 'present' ? 'bg-green-100'
                      : todayStatus === 'absent' ? 'bg-red-100' : 'bg-amber-100',
                  )}>
                    <Icon size={28} className={cfg.text}/>
                  </div>
                  <div>
                    <p className={clsx('font-bold text-2xl', cfg.text)}>{cfg.label}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{cfg.desc}</p>
                  </div>
                </div>
              )
            })()}

            {/* Alert banner for absent */}
            {todayStatus === 'absent' && (
              <div className="mt-4 bg-red-100 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5"/>
                <p className="text-sm text-red-800">
                  <strong>Tu hijo/a no está en clase.</strong> Si no enviaste un aviso previamente,
                  contacta al colegio para aclarar la situación.
                </p>
              </div>
            )}
          </div>

          {/* ── STATS (last 30 records) ──────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{counts.present}</p>
              <p className="text-xs font-medium text-green-600">Presentes</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{counts.absent}</p>
              <p className="text-xs font-medium text-red-600">Ausencias</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{counts.late}</p>
              <p className="text-xs font-medium text-amber-600">Tardanzas</p>
            </div>
          </div>

          {/* ── HISTORY ──────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 text-sm font-medium text-slate-600">
              <Calendar size={15}/> Historial (últimos 30 registros)
            </div>
            {history.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-10">Sin registros de asistencia aún</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {history.map(r => {
                  const isCurrentDay = r.date === today
                  const cfg = HISTORY_CFG[r.status]
                  const Icon = cfg?.icon
                  return (
                    <div key={r.id + r.date}
                      className={clsx('flex items-center justify-between px-5 py-3', isCurrentDay && 'bg-blue-50/40')}>
                      <div>
                        <p className="text-sm text-slate-700 capitalize">
                          {format(new Date(r.date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
                        </p>
                        {isCurrentDay && (
                          <p className="text-xs text-blue-500 font-medium">Hoy</p>
                        )}
                      </div>
                      <span className={clsx(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                        cfg?.color,
                      )}>
                        {Icon && <Icon size={11}/>}{cfg?.label}
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
