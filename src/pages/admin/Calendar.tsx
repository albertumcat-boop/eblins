import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { createEvent, getEventsBySchool, deleteEvent } from '@/services/db'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { Plus, X, Trash2, CalendarDays } from 'lucide-react'
import clsx from 'clsx'

const EVENT_TYPES = [
  { value: 'event',    label: 'Evento',      color: 'bg-blue-100 text-blue-700' },
  { value: 'holiday',  label: 'Feriado',     color: 'bg-green-100 text-green-700' },
  { value: 'exam',     label: 'Evaluación',  color: 'bg-red-100 text-red-700' },
  { value: 'meeting',  label: 'Reunión',     color: 'bg-purple-100 text-purple-700' },
  { value: 'activity', label: 'Actividad',   color: 'bg-amber-100 text-amber-700' },
]

export default function AdminCalendar() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', date: '', type: 'event' })

  const { data: events = [] } = useQuery({
    queryKey: ['events', schoolId],
    queryFn: () => getEventsBySchool(schoolId),
    enabled: !!schoolId,
  })

  const createMut = useMutation({
    mutationFn: () => createEvent({ ...form, schoolId, createdBy: appUser!.displayName }),
    onSuccess: () => { toast.success('Evento creado'); qc.invalidateQueries({ queryKey: ['events'] }); setShowModal(false); setForm({ title: '', description: '', date: '', type: 'event' }) },
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => { toast.success('Evento eliminado'); qc.invalidateQueries({ queryKey: ['events'] }) },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const grouped = events.reduce((acc: any, ev: any) => {
    const month = format(new Date(ev.date + 'T12:00:00'), 'MMMM yyyy', { locale: es })
    if (!acc[month]) acc[month] = []
    acc[month].push(ev)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Calendario Escolar</h1>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
          <Plus size={16}/> Agregar evento
        </button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CalendarDays size={36} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">No hay eventos registrados</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, evs]: any) => (
            <div key={month}>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 capitalize">{month}</h3>
              <div className="space-y-2">
                {evs.map((ev: any) => {
                  const type = EVENT_TYPES.find(t => t.value === ev.type)
                  return (
                    <div key={ev.id} className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="text-center min-w-10">
                          <p className="text-lg font-bold text-slate-800">{format(new Date(ev.date + 'T12:00:00'), 'd')}</p>
                          <p className="text-xs text-slate-400 capitalize">{format(new Date(ev.date + 'T12:00:00'), 'EEE', { locale: es })}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-800">{ev.title}</p>
                            <span className={clsx('text-xs px-2 py-0.5 rounded-full', type?.color)}>{type?.label}</span>
                          </div>
                          {ev.description && <p className="text-sm text-slate-500 mt-0.5">{ev.description}</p>}
                        </div>
                      </div>
                      <button onClick={() => deleteMut.mutate(ev.id)} className="text-slate-400 hover:text-red-500">
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Nuevo evento</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-slate-400"/></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Título</label>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.title} onChange={set('title')} placeholder="Nombre del evento"/></div>
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Tipo</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.type} onChange={set('type')}>
                  {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select></div>
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Fecha</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.date} onChange={set('date')}/></div>
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Descripción (opcional)</label>
                <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" value={form.description} onChange={set('description')}/></div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm">Cancelar</button>
              <button disabled={!form.title || !form.date || createMut.isPending} onClick={() => createMut.mutate()}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 font-medium">
                Guardar evento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
