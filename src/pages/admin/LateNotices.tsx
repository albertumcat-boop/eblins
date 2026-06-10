import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { db } from '@/services/firebase'
import {
  collection, query, where, orderBy, getDocs, updateDoc, doc, limit
} from 'firebase/firestore'
import { format, isToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlarmClock, UserX, Clock, CheckCheck, Filter, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

type NoticeType = 'late' | 'absent' | 'all'
type StatusFilter = 'all' | 'pending' | 'acknowledged'

interface LateNoticeDoc {
  id: string
  representativeName: string
  studentName: string
  grade: string
  section: string
  type: 'late' | 'absent'
  reason: string
  expectedTime?: string | null
  date: string
  createdAt: any
  status: 'pending' | 'acknowledged'
  seenByAdmin: boolean
}

export default function AdminLateNotices() {
  const { appUser } = useAuth()
  const qc = useQueryClient()
  const [typeFilter, setTypeFilter] = useState<NoticeType>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [gradeFilter, setGradeFilter] = useState('')
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'))

  const { data: notices = [], isLoading, refetch } = useQuery({
    queryKey: ['late-notices-admin', appUser?.schoolId, dateFilter],
    queryFn: async () => {
      const q = query(
        collection(db, 'lateNotices'),
        where('schoolId', '==', appUser!.schoolId),
        where('date', '==', dateFilter),
        orderBy('createdAt', 'desc'),
        limit(100)
      )
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as LateNoticeDoc))
    },
    enabled: !!appUser?.schoolId,
  })

  const ackMutation = useMutation({
    mutationFn: async (id: string) => {
      await updateDoc(doc(db, 'lateNotices', id), {
        status: 'acknowledged',
        seenByAdmin: true,
      })
    },
    onSuccess: () => {
      toast.success('Marcado como visto')
      qc.invalidateQueries({ queryKey: ['late-notices-admin'] })
    },
    onError: () => toast.error('Error al actualizar'),
  })

  const ackAllMutation = useMutation({
    mutationFn: async () => {
      const pending = filtered.filter(n => n.status === 'pending')
      await Promise.all(
        pending.map(n => updateDoc(doc(db, 'lateNotices', n.id), { status: 'acknowledged', seenByAdmin: true }))
      )
    },
    onSuccess: () => {
      toast.success('Todos marcados como vistos')
      qc.invalidateQueries({ queryKey: ['late-notices-admin'] })
    },
  })

  const grades = [...new Set(notices.map(n => n.grade))].sort()

  const filtered = notices.filter(n => {
    if (typeFilter !== 'all' && n.type !== typeFilter) return false
    if (statusFilter !== 'all' && n.status !== statusFilter) return false
    if (gradeFilter && n.grade !== gradeFilter) return false
    return true
  })

  const pendingCount = notices.filter(n => n.status === 'pending').length
  const lateCount = notices.filter(n => n.type === 'late').length
  const absentCount = notices.filter(n => n.type === 'absent').length

  const isDateToday = dateFilter === format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <AlarmClock size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Avisos de tardanza y ausencia</h1>
            <p className="text-sm text-slate-500">Notificaciones enviadas por los representantes</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-sm border border-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-slate-600">Fecha:</label>
        <input
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {!isDateToday && (
          <button
            onClick={() => setDateFilter(format(new Date(), 'yyyy-MM-dd'))}
            className="text-xs text-blue-600 hover:underline"
          >
            Ir a hoy
          </button>
        )}
        <span className="text-sm text-slate-500">
          {isDateToday ? '📅 Hoy' : format(parseISO(dateFilter), "EEEE d 'de' MMMM", { locale: es })}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{lateCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">Tardanzas</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{absentCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">Ausencias</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className={`text-2xl font-bold ${pendingCount > 0 ? 'text-orange-600' : 'text-green-600'}`}>{pendingCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">Sin revisar</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
        <Filter size={14} className="text-slate-400" />

        {/* Type */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
          {(['all', 'late', 'absent'] as NoticeType[]).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                typeFilter === t ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t === 'all' ? 'Todos' : t === 'late' ? '⏰ Tardanzas' : '🚫 Ausencias'}
            </button>
          ))}
        </div>

        {/* Status */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
          {(['all', 'pending', 'acknowledged'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                statusFilter === s ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s === 'all' ? 'Todos' : s === 'pending' ? 'Pendientes' : 'Vistos'}
            </button>
          ))}
        </div>

        {/* Grade */}
        {grades.length > 0 && (
          <select
            value={gradeFilter}
            onChange={e => setGradeFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          >
            <option value="">Todos los grados</option>
            {grades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        )}

        {pendingCount > 0 && (
          <button
            onClick={() => ackAllMutation.mutate()}
            disabled={ackAllMutation.isPending}
            className="ml-auto flex items-center gap-1.5 text-sm bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            <CheckCheck size={14} /> Marcar todos como vistos
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
          <AlarmClock size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">
            {notices.length === 0
              ? 'No hay avisos para esta fecha'
              : 'No hay avisos con estos filtros'}
          </p>
          <p className="text-sm text-slate-400 mt-1">Los representantes aún no han enviado notificaciones</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(n => (
            <div
              key={n.id}
              className={`bg-white rounded-2xl border p-5 flex items-start justify-between gap-4 transition-all ${
                n.status === 'pending' ? 'border-amber-300 shadow-sm shadow-amber-100' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  n.type === 'late' ? 'bg-amber-100' : 'bg-red-100'
                }`}>
                  {n.type === 'late'
                    ? <Clock size={18} className="text-amber-600" />
                    : <UserX size={18} className="text-red-600" />
                  }
                </div>

                {/* Info */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800">{n.studentName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      n.type === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {n.type === 'late' ? '⏰ Tardanza' : '🚫 Ausencia'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    <span className="font-medium">Motivo:</span> {n.reason}
                  </p>
                  {n.type === 'late' && n.expectedTime && (
                    <p className="text-sm text-amber-700 mt-0.5 font-medium">
                      🕐 Hora estimada de llegada: {n.expectedTime}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-slate-400">
                    <span>Grado {n.grade} · Sección {n.section}</span>
                    <span>·</span>
                    <span>Representante: {n.representativeName}</span>
                    <span>·</span>
                    <span>
                      {n.createdAt?.toDate
                        ? format(n.createdAt.toDate(), "d MMM, HH:mm", { locale: es })
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status / Action */}
              <div className="shrink-0 flex flex-col items-end gap-2">
                {n.status === 'acknowledged' ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2.5 py-1 rounded-full">
                    <CheckCheck size={12} /> Visto
                  </span>
                ) : (
                  <button
                    onClick={() => ackMutation.mutate(n.id)}
                    disabled={ackMutation.isPending}
                    className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    <CheckCheck size={12} /> Marcar visto
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
