import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsByRepresentative } from '@/services/db'
import { db } from '@/services/firebase'
import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp, limit } from 'firebase/firestore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlarmClock, UserX, Send, Clock, ChevronDown, CheckCircle2, History } from 'lucide-react'
import toast from 'react-hot-toast'

type NoticeType = 'late' | 'absent'

interface LateNoticeDoc {
  id: string
  studentName: string
  grade: string
  section: string
  type: NoticeType
  reason: string
  expectedTime?: string
  date: string
  createdAt: any
  status: 'pending' | 'acknowledged'
}

const REASONS_LATE = [
  'Tráfico / transporte',
  'Cita médica',
  'Trámites personales',
  'Emergencia familiar',
  'Otro motivo',
]

const REASONS_ABSENT = [
  'Enfermedad / reposo médico',
  'Cita médica todo el día',
  'Viaje o compromiso familiar',
  'Emergencia familiar',
  'Duelo familiar',
  'Otro motivo',
]

export default function RepLateNotice() {
  const { appUser } = useAuth()
  const qc = useQueryClient()

  const [type, setType] = useState<NoticeType>('late')
  const [studentId, setStudentId] = useState('')
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [expectedTime, setExpectedTime] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [submitted, setSubmitted] = useState(false)

  const { data: students = [] } = useQuery({
    queryKey: ['my-students', appUser?.id],
    queryFn: () => getStudentsByRepresentative(appUser!.id, appUser!.schoolId),
    enabled: !!appUser?.id,
  })

  const { data: history = [] } = useQuery({
    queryKey: ['late-notices-rep', appUser?.id],
    queryFn: async () => {
      const q = query(
        collection(db, 'lateNotices'),
        where('representativeId', '==', appUser!.id),
        where('schoolId', '==', appUser!.schoolId),
        orderBy('createdAt', 'desc'),
        limit(20)
      )
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as LateNoticeDoc))
    },
    enabled: !!appUser?.id,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const student = students.find(s => s.id === studentId)
      if (!student) throw new Error('Selecciona un estudiante')
      const finalReason = reason === 'Otro motivo' ? customReason.trim() : reason
      if (!finalReason) throw new Error('Escribe el motivo')
      if (type === 'late' && !expectedTime) throw new Error('Indica la hora estimada de llegada')

      await addDoc(collection(db, 'lateNotices'), {
        schoolId: appUser!.schoolId,
        representativeId: appUser!.id,
        representativeName: appUser!.displayName,
        studentId: student.id,
        studentName: student.fullName,
        grade: student.grade,
        section: student.section,
        type,
        reason: finalReason,
        expectedTime: type === 'late' ? expectedTime : null,
        date,
        status: 'pending',
        seenByAdmin: false,
        createdAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      toast.success('Aviso enviado a la directiva')
      qc.invalidateQueries({ queryKey: ['late-notices-rep'] })
      qc.invalidateQueries({ queryKey: ['late-notices-admin'] })
      setSubmitted(true)
      // reset form after 3s
      setTimeout(() => {
        setSubmitted(false)
        setStudentId('')
        setReason('')
        setCustomReason('')
        setExpectedTime('')
        setDate(format(new Date(), 'yyyy-MM-dd'))
      }, 3000)
    },
    onError: (e: any) => toast.error(e.message || 'Error al enviar aviso'),
  })

  const reasonOptions = type === 'late' ? REASONS_LATE : REASONS_ABSENT
  const selectedStudent = students.find(s => s.id === studentId)

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <AlarmClock size={20} className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Aviso de tardanza o ausencia</h1>
          <p className="text-sm text-slate-500">Notifica a la directiva sobre la asistencia de tu hijo/a</p>
        </div>
      </div>

      {/* Tipo de aviso */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setType('late'); setReason('') }}
          className={`flex flex-col items-center gap-2 py-5 rounded-2xl border-2 transition-all ${
            type === 'late'
              ? 'border-amber-400 bg-amber-50 text-amber-700'
              : 'border-slate-200 bg-white text-slate-500 hover:border-amber-200'
          }`}
        >
          <Clock size={28} className={type === 'late' ? 'text-amber-500' : 'text-slate-400'} />
          <span className="font-semibold text-sm">Llegará tarde</span>
          <span className="text-xs opacity-70">Tardanza</span>
        </button>

        <button
          onClick={() => { setType('absent'); setReason(''); setExpectedTime('') }}
          className={`flex flex-col items-center gap-2 py-5 rounded-2xl border-2 transition-all ${
            type === 'absent'
              ? 'border-red-400 bg-red-50 text-red-700'
              : 'border-slate-200 bg-white text-slate-500 hover:border-red-200'
          }`}
        >
          <UserX size={28} className={type === 'absent' ? 'text-red-500' : 'text-slate-400'} />
          <span className="font-semibold text-sm">No asistirá</span>
          <span className="text-xs opacity-70">Ausencia</span>
        </button>
      </div>

      {submitted ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
          <p className="font-bold text-green-800 text-lg">¡Aviso enviado!</p>
          <p className="text-sm text-green-600 mt-1">La directiva ha sido notificada</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">

          {/* Fecha */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Estudiante */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estudiante</label>
            <div className="relative">
              <select
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              >
                <option value="">Selecciona un estudiante</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} — {s.grade} {s.section}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {selectedStudent && (
              <p className="text-xs text-slate-400 mt-1">
                Grado {selectedStudent.grade} · Sección {selectedStudent.section}
              </p>
            )}
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Motivo</label>
            <div className="grid grid-cols-1 gap-2">
              {reasonOptions.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                    reason === r
                      ? type === 'late'
                        ? 'border-amber-400 bg-amber-50 text-amber-800 font-medium'
                        : 'border-red-400 bg-red-50 text-red-800 font-medium'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {reason === 'Otro motivo' && (
              <textarea
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Describe el motivo..."
                rows={2}
                className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            )}
          </div>

          {/* Hora estimada — solo para tardanza */}
          {type === 'late' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Hora estimada de llegada
              </label>
              <input
                type="time"
                value={expectedTime}
                onChange={e => setExpectedTime(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          )}

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !studentId || !reason || (reason === 'Otro motivo' && !customReason.trim()) || (type === 'late' && !expectedTime)}
            className={`w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all ${
              type === 'late'
                ? 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300'
                : 'bg-red-500 hover:bg-red-600 disabled:bg-red-300'
            } disabled:cursor-not-allowed`}
          >
            {mutation.isPending
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Enviando...</>
              : <><Send size={15} /> Enviar aviso a la directiva</>
            }
          </button>
        </div>
      )}

      {/* Historial */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <History size={15} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Mis avisos recientes</span>
          </div>
          <div className="divide-y divide-slate-100">
            {history.map(n => (
              <div key={n.id} className="px-5 py-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    n.type === 'late' ? 'bg-amber-100' : 'bg-red-100'
                  }`}>
                    {n.type === 'late'
                      ? <Clock size={14} className="text-amber-600" />
                      : <UserX size={14} className="text-red-600" />
                    }
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{n.studentName}</p>
                    <p className="text-xs text-slate-500">{n.reason}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {n.date} {n.type === 'late' && n.expectedTime ? `· Llega a las ${n.expectedTime}` : ''}
                    </p>
                  </div>
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                  n.status === 'acknowledged'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {n.status === 'acknowledged' ? 'Visto' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
