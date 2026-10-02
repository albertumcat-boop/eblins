import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getSchedule, saveScheduleBlocks } from '@/services/db'
import toast from 'react-hot-toast'
import { Plus, Trash2, Save, Clock, GripVertical } from 'lucide-react'
import clsx from 'clsx'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
const DAYS_SAT = [...DAYS, 'Sábado']

const SUBJECT_PALETTE = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-violet-100 text-violet-800 border-violet-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-lime-100 text-lime-800 border-lime-200',
  'bg-red-100 text-red-800 border-red-200',
]

function buildColorMap(blocks: Block[]): Record<string, string> {
  const map: Record<string, string> = {}
  let idx = 0
  for (const b of blocks) {
    for (const subj of Object.values(b.subjects)) {
      const s = subj.trim()
      if (s && !map[s] && s.toLowerCase() !== 'receso') {
        map[s] = SUBJECT_PALETTE[idx % SUBJECT_PALETTE.length]
        idx++
      }
    }
  }
  return map
}

interface Block {
  startTime: string
  endTime: string
  subjects: Record<string, string>
}

const DEFAULT_SLOTS: Array<[string, string]> = [
  ['07:00', '08:00'], ['08:00', '09:00'], ['09:00', '09:30'],
  ['09:30', '10:30'], ['10:30', '11:30'], ['11:30', '12:30'], ['12:30', '13:30'],
]

function makeBlocks(slots: Array<[string, string]>, days: string[]): Block[] {
  return slots.map(([s, e]) => ({ startTime: s, endTime: e, subjects: Object.fromEntries(days.map(d => [d, ''])) }))
}

export default function TeacherSchedules() {
  const { appUser } = useAuth()
  const qc = useQueryClient()
  const [withSat, setWithSat] = useState(false)
  const days = withSat ? DAYS_SAT : DAYS
  const [blocks, setBlocks] = useState<Block[]>([])
  const [saving, setSaving] = useState(false)
  const [editingCell, setEditingCell] = useState<{ row: number; day: string } | null>(null)
  const [loaded, setLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const grade = appUser?.assignedGrade || ''
  const section = appUser?.assignedSection || ''

  const { data: schedule } = useQuery({
    queryKey: ['schedule', appUser?.schoolId, grade, section],
    queryFn: () => getSchedule(appUser!.schoolId, grade, section),
    enabled: !!appUser?.schoolId && !!grade,
  })

  // Load existing schedule into grid state
  useEffect(() => {
    if (schedule === undefined || loaded) return
    setLoaded(true)
    const s = schedule as any
    if (s?.blocks?.length) {
      const savedDays = s.days || DAYS
      if (savedDays.includes('Sábado')) setWithSat(true)
      setBlocks(s.blocks)
    } else {
      setBlocks(makeBlocks(DEFAULT_SLOTS, days))
    }
  }, [schedule, loaded])

  // When toggling Saturday, add/remove column without losing data
  useEffect(() => {
    if (!loaded) return
    setBlocks(prev => prev.map(b => {
      const next = { ...b, subjects: { ...b.subjects } }
      if (withSat && !next.subjects['Sábado']) next.subjects['Sábado'] = ''
      if (!withSat) delete next.subjects['Sábado']
      return next
    }))
  }, [withSat])

  useEffect(() => {
    if (editingCell) inputRef.current?.focus()
  }, [editingCell])

  const setSubject = (row: number, day: string, value: string) => {
    setBlocks(prev => prev.map((b, i) => i === row ? { ...b, subjects: { ...b.subjects, [day]: value } } : b))
  }

  const addSlot = () => {
    const last = blocks[blocks.length - 1]
    const newStart = last?.endTime || '07:00'
    const [h, m] = newStart.split(':').map(Number)
    const newEnd = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    setBlocks(prev => [...prev, { startTime: newStart, endTime: newEnd, subjects: Object.fromEntries(days.map(d => [d, ''])) }])
  }

  const removeSlot = (row: number) => {
    if (blocks.length <= 1) return
    setBlocks(prev => prev.filter((_, i) => i !== row))
  }

  const updateTime = (row: number, field: 'startTime' | 'endTime', value: string) => {
    setBlocks(prev => prev.map((b, i) => i === row ? { ...b, [field]: value } : b))
  }

  const handleSave = async () => {
    if (!appUser?.schoolId || !grade || !section) { toast.error('Sin clase asignada'); return }
    setSaving(true)
    try {
      await saveScheduleBlocks(appUser.schoolId, grade, section, blocks, days)
      toast.success('Horario guardado')
      qc.invalidateQueries({ queryKey: ['schedule'] })
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const colorMap = buildColorMap(blocks)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mi Horario</h1>
          {grade && <p className="text-sm text-slate-500 mt-0.5">{grade} — Sección {section}</p>}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
            <div onClick={() => setWithSat(v => !v)}
              className={clsx('w-9 h-5 rounded-full transition-colors relative', withSat ? 'bg-purple-600' : 'bg-slate-200')}>
              <span className={clsx('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', withSat ? 'left-4' : 'left-0.5')}/>
            </div>
            Incluir Sábado
          </label>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">
            <Save size={15}/>{saving ? 'Guardando...' : 'Guardar horario'}
          </button>
        </div>
      </div>

      {!grade && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          Debes asignar tu clase primero (usa el botón en la barra superior).
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28 whitespace-nowrap">
                  <Clock size={13} className="inline mr-1 opacity-60"/>Hora
                </th>
                {days.map(d => (
                  <th key={d} className="text-center px-2 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide min-w-[130px]">{d}</th>
                ))}
                <th className="w-10"/>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block, row) => (
                <tr key={row} className="border-b border-slate-100 hover:bg-slate-50/50 group">
                  {/* Time cell */}
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <GripVertical size={12} className="text-slate-300 shrink-0"/>
                      <div className="flex items-center gap-1">
                        <input type="time" value={block.startTime}
                          onChange={e => updateTime(row, 'startTime', e.target.value)}
                          className="w-20 text-xs text-slate-600 border border-slate-200 rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"/>
                        <span className="text-slate-300 text-xs">–</span>
                        <input type="time" value={block.endTime}
                          onChange={e => updateTime(row, 'endTime', e.target.value)}
                          className="w-20 text-xs text-slate-600 border border-slate-200 rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"/>
                      </div>
                    </div>
                  </td>

                  {/* Subject cells */}
                  {days.map(day => {
                    const subj = block.subjects[day] || ''
                    const isEditing = editingCell?.row === row && editingCell?.day === day
                    const isReceso = subj.toLowerCase() === 'receso'
                    const color = colorMap[subj.trim()] || ''
                    return (
                      <td key={day} className="px-1.5 py-1.5 text-center">
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            value={subj}
                            onChange={e => setSubject(row, day, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingCell(null) }}
                            className="w-full text-xs text-center border border-purple-400 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                            placeholder="Materia..."
                          />
                        ) : (
                          <button
                            onClick={() => setEditingCell({ row, day })}
                            className={clsx(
                              'w-full min-h-[32px] text-xs font-medium rounded-lg px-2 py-1.5 border transition-all text-center',
                              isReceso
                                ? 'bg-slate-100 text-slate-400 border-slate-200 italic'
                                : subj
                                ? clsx(color, 'border')
                                : 'bg-transparent text-slate-300 border-dashed border-slate-200 hover:border-purple-300 hover:text-slate-400'
                            )}>
                            {subj || '+'}
                          </button>
                        )}
                      </td>
                    )
                  })}

                  {/* Delete row */}
                  <td className="px-1 text-center">
                    <button onClick={() => removeSlot(row)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-400 transition-all rounded">
                      <Trash2 size={13}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add slot */}
        <button onClick={addSlot}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors border-t border-dashed border-slate-200">
          <Plus size={15}/>Agregar bloque horario
        </button>
      </div>

      {/* Subject color legend */}
      {Object.keys(colorMap).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(colorMap).map(([subj, cls]) => (
            <span key={subj} className={clsx('text-xs px-2.5 py-1 rounded-full border font-medium', cls)}>{subj}</span>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400">
        Haz clic en cualquier celda para escribir la materia. Escribe "Receso" para marcar un descanso.
      </p>
    </div>
  )
}
