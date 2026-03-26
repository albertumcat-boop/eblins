import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsBySchool } from '@/services/db'
import { db } from '@/services/firebase'
import { collection, addDoc, getDocs, query, where, serverTimestamp, updateDoc, doc } from 'firebase/firestore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { Check, X, Minus, Save, Calendar } from 'lucide-react'

type AttStatus = 'present' | 'absent' | 'late'

const STATUS_CONFIG: Record<AttStatus, { label: string; color: string; icon: any }> = {
  present: { label: 'Presente', color: 'bg-green-100 text-green-700 border-green-300', icon: Check },
  absent:  { label: 'Ausente',  color: 'bg-red-100 text-red-700 border-red-300',       icon: X },
  late:    { label: 'Tardanza', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: Minus },
}

export default function TeacherAttendance() {
  const { appUser } = useAuth()
  const qc = useQueryClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [selectedDate, setSelectedDate] = useState(today)
  const [attendance, setAttendance] = useState<Record<string, AttStatus>>({})
  const [saving, setSaving] = useState(false)

  const { data: students = [] } = useQuery({
    queryKey: ['students', appUser?.schoolId],
    queryFn: () => getStudentsBySchool(appUser!.schoolId),
    enabled: !!appUser?.schoolId,
  })

  const { data: existingAtt } = useQuery({
    queryKey: ['attendance', selectedDate, appUser?.schoolId],
    queryFn: async () => {
      const q = query(collection(db, 'attendance'),
        where('date', '==', selectedDate),
        where('schoolId', '==', appUser!.schoolId))
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

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = {
        date:      selectedDate,
        schoolId:  appUser!.schoolId,
        teacherId: appUser!.id,
        records:   attendance,
        updatedAt: serverTimestamp(),
      }
      if (existingAtt) {
        await updateDoc(doc(db, 'attendance', (existingAtt as any).id), data)
      } else {
        await addDoc(collection(db, 'attendance'), { ...data, createdAt: serverTimestamp() })
      }
      toast.success('Asistencia guardada')
      qc.invalidateQueries({ queryKey: ['attendance'] })
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const counts = {
    present: Object.values(attendance).filter(v => v === 'present').length,
    absent:  Object.values(attendance).filter(v => v === 'absent').length,
    late:    Object.values(attendance).filter(v => v === 'late').length,
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Asistencia</h1>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
          <Save size={16}/>{saving ? 'Guardando...' : 'Guardar asistencia'}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <Calendar size={18} className="text-slate-400"/>
        <input type="date" value={selectedDate} max={today}
          onChange={e => setSelectedDate(e.target.value)}
          className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"/>
        <span className="text-sm text-slate-500">{format(new Date(selectedDate + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {Object.entries(counts).map(([status, count]) => {
          const cfg = STATUS_CONFIG[status as AttStatus]
          return (
            <div key={status} className={`rounded-xl border p-3 text-center ${cfg.color}`}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs font-medium">{cfg.label}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 text-xs text-slate-500 flex justify-between">
          <span>Toca el botón para cambiar el estado</span>
          <span className="font-medium">Presente → Ausente → Tardanza</span>
        </div>
        <div className="divide-y divide-slate-100">
          {students.map(s => {
            const status = attendance[s.id]
            const cfg = status ? STATUS_CONFIG[status] : null
            const Icon = cfg?.icon
            return (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-slate-700">{s.fullName}</p>
                  <p className="text-xs text-slate-400">{s.grade}{s.section}</p>
                </div>
                <button onClick={() => toggle(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    cfg ? cfg.color : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                  {Icon ? <Icon size={14}/> : <Minus size={14}/>}
                  {cfg?.label || 'Sin marcar'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
