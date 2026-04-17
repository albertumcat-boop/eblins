import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsBySchool } from '@/services/db'
import { db } from '@/services/firebase'
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { Plus, X, ThumbsUp, ThumbsDown, AlertTriangle, Award } from 'lucide-react'

const BEHAVIOR_TYPES = [
  { value: 'excellent',  label: 'Excelente conducta', icon: Award,         color: 'bg-green-100 text-green-700 border-green-300',  emoji: '🏆' },
  { value: 'good',       label: 'Buena conducta',     icon: ThumbsUp,      color: 'bg-blue-100 text-blue-700 border-blue-300',     emoji: '👍' },
  { value: 'warning',    label: 'Llamado de atención', icon: AlertTriangle, color: 'bg-amber-100 text-amber-700 border-amber-300',  emoji: '⚠️' },
  { value: 'minor',      label: 'Falta leve',         icon: ThumbsDown,    color: 'bg-orange-100 text-orange-700 border-orange-300', emoji: '⚡' },
  { value: 'serious',    label: 'Falta grave',        icon: ThumbsDown,    color: 'bg-red-100 text-red-700 border-red-300',        emoji: '🚨' },
]

const CONSEQUENCES = [
  'Ninguna', 'Notificación al representante', 'Citación al representante',
  'Suspensión 1 día', 'Suspensión 3 días', 'Suspensión 5 días', 'Otro',
]

export default function TeacherBehavior() {
  const { appUser } = useAuth()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [form, setForm] = useState({
    type: 'good', description: '', consequence: 'Ninguna', date: format(new Date(), 'yyyy-MM-dd'),
  })
  const [saving, setSaving] = useState(false)
  const [filterStudent, setFilterStudent] = useState('')

  const { data: students = [] } = useQuery({
    queryKey: ['students', appUser?.schoolId],
    queryFn: () => getStudentsBySchool(appUser!.schoolId),
    enabled: !!appUser?.schoolId,
  })

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

  const handleSave = async () => {
    if (!selectedStudent || !form.description) {
      toast.error('Completa todos los campos')
      return
    }
    setSaving(true)
    try {
      const student = students.find(s => s.id === selectedStudent)
      await addDoc(collection(db, 'behavior'), {
        studentId:       selectedStudent,
        studentName:     student?.fullName,
        schoolId:        appUser!.schoolId,
        teacherId:       appUser!.id,
        teacherName:     appUser!.displayName,
        type:            form.type,
        description:     form.description,
        consequence:     form.consequence,
        date:            form.date,
        createdAt:       serverTimestamp(),
      })

      if (['warning', 'minor', 'serious'].includes(form.type)) {
        await addDoc(collection(db, 'notifications'), {
          userId:    student?.representativeId,
          schoolId:  appUser!.schoolId,
          title:     `${BEHAVIOR_TYPES.find(b => b.value === form.type)?.emoji} Reporte de conducta`,
          body:      `${student?.fullName}: ${form.description}. Consecuencia: ${form.consequence}`,
          type:      'system',
          read:      false,
          createdAt: serverTimestamp(),
        })
      }

      toast.success('Registro guardado')
      qc.invalidateQueries({ queryKey: ['behavior'] })
      setShowModal(false)
      setForm({ type: 'good', description: '', consequence: 'Ninguna', date: format(new Date(), 'yyyy-MM-dd') })
      setSelectedStudent('')
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Control de Conducta</h1>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700">
          <Plus size={16}/> Nuevo registro
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterStudent('')}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${!filterStudent ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 text-slate-700'}`}>
          Todos
        </button>
        {students.map(s => (
          <button key={s.id} onClick={() => setFilterStudent(s.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${filterStudent === s.id ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 text-slate-700'}`}>
            {s.fullName}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BEHAVIOR_TYPES.filter(b => ['excellent','good','warning','serious'].includes(b.value)).map(b => {
          const count = records.filter((r: any) => r.type === b.value).length
          return (
            <div key={b.value} className={`rounded-xl border p-3 text-center ${b.color}`}>
              <p className="text-2xl">{b.emoji}</p>
              <p className="text-xl font-bold mt-1">{count}</p>
              <p className="text-xs font-medium">{b.label}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 text-sm font-medium text-slate-600">
          Historial ({records.length} registros)
        </div>
        {records.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Award size={32} className="mx-auto mb-2 opacity-30"/>
            <p className="text-sm">Sin registros de conducta</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(records as any[]).map(r => {
              const bt = BEHAVIOR_TYPES.find(b => b.value === r.type)
              return (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">{bt?.emoji}</span>
                      <div>
                        <p className="font-medium text-slate-800">{r.studentName}</p>
                        <p className="text-sm text-slate-600 mt-0.5">{r.description}</p>
                        {r.consequence !== 'Ninguna' && (
                          <p className="text-xs text-red-600 mt-1 font-medium">
                            Consecuencia: {r.consequence}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {r.teacherName} · {format(new Date(r.date + 'T12:00:00'), "d 'de' MMMM yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium border ${bt?.color}`}>
                      {bt?.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-bold text-slate-800">Nuevo registro de conducta</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-slate-400"/></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Estudiante</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                  <option value="">Seleccionar estudiante</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Tipo de conducta</label>
                <div className="grid grid-cols-1 gap-2">
                  {BEHAVIOR_TYPES.map(b => (
                    <button key={b.value} onClick={() => setForm(f => ({ ...f, type: b.value }))}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${form.type === b.value ? b.color : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      <span>{b.emoji}</span>{b.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Descripción</label>
                <textarea rows={3} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder="Describe la situación con detalle..."
                  value={form.description} onChange={set('description')}/>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Consecuencia</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={form.consequence} onChange={set('consequence')}>
                  {CONSEQUENCES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Fecha</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={form.date} onChange={set('date')}/>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm">Cancelar</button>
              <button disabled={!selectedStudent || !form.description || saving} onClick={handleSave}
                className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50 font-medium">
                {saving ? 'Guardando...' : 'Guardar registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
