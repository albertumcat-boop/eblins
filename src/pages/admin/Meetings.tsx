import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { createMeeting, getMeetingsBySchool, deleteMeeting } from '@/services/db'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { Plus, X, Trash2, Video, ExternalLink } from 'lucide-react'

export default function AdminMeetings() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', meetLink: '', date: '' })

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings', schoolId],
    queryFn: () => getMeetingsBySchool(schoolId),
    enabled: !!schoolId,
  })

  const createMut = useMutation({
    mutationFn: () => createMeeting({ ...form, schoolId, createdBy: appUser!.displayName }),
    onSuccess: () => { toast.success('Asamblea creada'); qc.invalidateQueries({ queryKey: ['meetings'] }); setShowModal(false); setForm({ title: '', description: '', meetLink: '', date: '' }) },
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteMeeting(id),
    onSuccess: () => { toast.success('Asamblea eliminada'); qc.invalidateQueries({ queryKey: ['meetings'] }) },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Asambleas Virtuales</h1>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
          <Plus size={16}/> Nueva asamblea
        </button>
      </div>

      {meetings.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Video size={36} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">No hay asambleas programadas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((m: any) => (
            <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Video size={18} className="text-blue-600"/>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{m.title}</p>
                  {m.description && <p className="text-sm text-slate-500 mt-0.5">{m.description}</p>}
                  <p className="text-xs text-slate-400 mt-1">
                    {m.date ? format(new Date(m.date + 'T12:00:00'), "d 'de' MMMM yyyy", { locale: es }) : 'Fecha por confirmar'}
                  </p>
                  {m.meetLink && (
                    <a href={m.meetLink} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 flex items-center gap-1 mt-1 hover:underline">
                      <ExternalLink size={11}/> Unirse a la reunión
                    </a>
                  )}
                </div>
              </div>
              <button onClick={() => deleteMut.mutate(m.id)} className="text-slate-400 hover:text-red-500 shrink-0">
                <Trash2 size={16}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Nueva asamblea virtual</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-slate-400"/></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Título</label>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.title} onChange={set('title')} placeholder="Ej: Asamblea de padres 1er lapso"/></div>
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Fecha</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.date} onChange={set('date')}/></div>
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Link de la reunión (Google Meet, Zoom, etc.)</label>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.meetLink} onChange={set('meetLink')} placeholder="https://meet.google.com/..."/></div>
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Descripción (opcional)</label>
                <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" value={form.description} onChange={set('description')}/></div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm">Cancelar</button>
              <button disabled={!form.title || createMut.isPending} onClick={() => createMut.mutate()}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 font-medium">
                Crear asamblea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
