import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getMessagesByUser, sendMessage } from '@/services/db'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Send, MessageSquare, CheckCheck, Clock } from 'lucide-react'
import clsx from 'clsx'
import type { MessageCategory } from '@/types'

const CATEGORIES = [
  { value: 'payment_query' as MessageCategory,  label: 'Consulta de pago' },
  { value: 'administrative' as MessageCategory, label: 'Administrativo' },
  { value: 'general' as MessageCategory,        label: 'General' },
  { value: 'complaint' as MessageCategory,      label: 'Queja / Reclamo' },
]
const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)

export default function RepresentativeMessages() {
  const { appUser } = useAuth()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category: 'general' as MessageCategory, subject: '', body: '' })

  const { data: messages = [] } = useQuery({ queryKey: ['my-messages', appUser?.id], queryFn: () => getMessagesByUser(appUser!.id), enabled: !!appUser?.id })
  const sendMut = useMutation({
    mutationFn: () => sendMessage({ schoolId: appUser!.schoolId, fromUserId: appUser!.id, fromUserName: appUser!.displayName, ...form, readByAdmin: false, status: 'open' }),
    onSuccess: () => { toast.success('Mensaje enviado'); setForm({ category: 'general', subject: '', body: '' }); setShowForm(false); qc.invalidateQueries({ queryKey: ['my-messages'] }) },
    onError: () => toast.error('Error al enviar el mensaje'),
  })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Mensajes</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
          <Send size={15}/> Nuevo mensaje
        </button>
      </div>
      <p className="text-sm text-slate-500 bg-blue-50 border border-blue-100 rounded-xl p-3">Puedes enviar mensajes al equipo administrativo.</p>
      {messages.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><MessageSquare size={36} className="mx-auto mb-3 opacity-30"/><p className="text-sm">No has enviado mensajes aún</p></div>
      ) : (
        <div className="space-y-3">
          {messages.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">{m.subject}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{format(toDate(m.createdAt), "d 'de' MMMM yyyy, HH:mm", { locale: es })}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', m.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700')}>
                    {m.status === 'open' ? 'Abierto' : 'Resuelto'}
                  </span>
                  {m.readByAdmin
                    ? <span className="text-xs text-green-600 flex items-center gap-1"><CheckCheck size={12}/> Leído</span>
                    : <span className="text-xs text-slate-400 flex items-center gap-1"><Clock size={12}/> Pendiente</span>}
                </div>
              </div>
              <p className="text-sm text-slate-600 mt-2 line-clamp-2">{m.body}</p>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-slate-100"><h3 className="font-bold text-slate-800">Nuevo mensaje</h3></div>
            <div className="px-6 py-5 space-y-4">
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Categoría</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.category} onChange={set('category')}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select></div>
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Asunto</label>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Breve descripción del motivo" value={form.subject} onChange={set('subject')}/></div>
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Mensaje</label>
                <textarea rows={5} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Describe tu consulta con detalle..." value={form.body} onChange={set('body')}/></div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50">Cancelar</button>
              <button disabled={!form.subject || !form.body || sendMut.isPending} onClick={() => sendMut.mutate()}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 font-medium">
                {sendMut.isPending ? 'Enviando...' : 'Enviar mensaje'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
