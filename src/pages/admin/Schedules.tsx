import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { saveSchedule, getAllSchedules } from '@/services/db'
import toast from 'react-hot-toast'
import { Clock, Save } from 'lucide-react'

const GRADES = ['1er','2do','3er','4to','5to','6to','7mo','8vo','9no','10mo','11vo','12vo']
const SECTIONS = ['A','B','C','D','E']

export default function AdminSchedules() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''
  const qc = useQueryClient()
  const [grade, setGrade] = useState('1er')
  const [section, setSection] = useState('A')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules', schoolId],
    queryFn: () => getAllSchedules(schoolId),
    enabled: !!schoolId,
  })

  const currentSchedule = schedules.find((s: any) => s.grade === grade && s.section === section)

  const handleSave = async () => {
    if (!content.trim()) return
    setSaving(true)
    try {
      await saveSchedule(schoolId, grade, section, content)
      toast.success('Horario guardado')
      qc.invalidateQueries({ queryKey: ['schedules'] })
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800">Horarios</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Grado</label>
            <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={grade} onChange={e => { setGrade(e.target.value); setContent(schedules.find((s: any) => s.grade === e.target.value && s.section === section)?.content || '') }}>
              {GRADES.map(g => <option key={g}>{g}</option>)}
            </select></div>
          <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Sección</label>
            <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={section} onChange={e => { setSection(e.target.value); setContent(schedules.find((s: any) => s.grade === grade && s.section === e.target.value)?.content || '') }}>
              {SECTIONS.map(s => <option key={s}>{s}</option>)}
            </select></div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">
            Horario del {grade} grado sección {section}
          </label>
          <textarea rows={12} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
            placeholder={`Lunes:\n  7:00 - 8:00 Matemáticas\n  8:00 - 9:00 Lengua\n  ...\n\nMartes:\n  7:00 - 8:00 Ciencias\n  ...`}
            value={content || currentSchedule?.content || ''}
            onChange={e => setContent(e.target.value)}/>
          <p className="text-xs text-slate-400 mt-1">Puedes escribir el horario en texto libre</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          <Save size={15}/>{saving ? 'Guardando...' : 'Guardar horario'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 text-sm font-medium text-slate-600">
          Horarios configurados ({schedules.length})
        </div>
        {schedules.length === 0 ? (
          <div className="text-center py-10 text-slate-400"><Clock size={28} className="mx-auto mb-2 opacity-30"/><p className="text-sm">Sin horarios configurados</p></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {schedules.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <p className="text-sm font-medium text-slate-700">{s.grade} grado — Sección {s.section}</p>
                <button onClick={() => { setGrade(s.grade); setSection(s.section); setContent(s.content) }}
                  className="text-xs text-blue-600 hover:underline">Editar</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
