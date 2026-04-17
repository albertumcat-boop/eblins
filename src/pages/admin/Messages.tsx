import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { markMessageRead, closeMessage } from '@/services/db'
import { db } from '@/services/firebase'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MessageSquare, CheckCheck } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import type { Message } from '@/types'

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  payment_query:  { label: 'Consulta de pago',  color: 'bg-blue-100 text-blue-700' },
  administrative: { label: 'Administrativo',    color: 'bg-purple-100 text-purple-700' },
  general:        { label: 'General',           color: 'bg-slate-100 text-slate-600' },
  complaint:      { label: 'Queja / Reclamo',   color: 'bg-red-100 text-red-700' },
}
const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)

export default function AdminMessages() {
  const { appUser } = useAuth()
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Message | null>(null)

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', appUser?.schoolId],
    queryFn: async () => {
      const q = query(
        collection(db, 'messages'),
        where('schoolId', '==', appUser!.schoolId),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Message))
    },
    enabled: !!appUser?.schoolId,
  })

  const readMut = useMutation({
    mutationFn: (id: string) => markMessageRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] })
  })
  const closeMut = useMutation({
    mutationFn: (id: string) => closeMessage(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['messages'] }); setSelected(null) }
  })

  const handleSelect = (m: Message) => {
    setSelected(m)
    if (!m.readByAdmin) readMut.mutate(m.id)
  }

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Mensajes</h1>
        <span className="text-sm text-slate-500">
          {messages.filter(m => !m.readByAdmin).length} sin leer
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-96">
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-sm font-medium text-slate-600">
            Bandeja ({messages.length})
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px]">
            {messages.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-10">Sin mensajes</p>
            )}
            {messages.map(m => {
              const cat = CATEGORY_LABELS[m.category]
              return (
                <button key={m.id} onClick={() => handleSelect(m)} className={clsx(
                  'w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors',
                  selected?.id === m.id && 'bg-blue-50',
                  !m.readByAdmin && m.status === 'open' && 'border-l-2 border-blue-500',
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={clsx('text-sm font-medium truncate', !m.readByAdmin ? 'text-slate-800' : 'text-slate-600')}>
                        {m.fromUserName}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{m.subject}</p>
                    </div>
                    <span className={clsx('text-xs px-1.5 py-0.5 rounded-full shrink-0', cat?.color)}>
                      {cat?.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {format(toDate(m.createdAt), 'dd MMM HH:mm', { locale: es })}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16">
              <MessageSquare size={36} className="mb-3 opacity-30"/>
              <p className="text-sm">Selecciona un mensaje para verlo</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800">{selected.subject}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    De: <strong>{selected.fromUserName}</strong> · {format(toDate(selected.createdAt), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                  </p>
                </div>
                <span className={clsx('text-xs px-2 py-1 rounded-full', CATEGORY_LABELS[selected.category]?.color)}>
                  {CATEGORY_LABELS[selected.category]?.label}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {selected.body}
              </div>
              {selected.attachmentUrl && (
                <a href={selected.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  Ver adjunto
                </a>
              )}
              {selected.status === 'open' ? (
                <button onClick={() => closeMut.mutate(selected.id)} disabled={closeMut.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm hover:bg-slate-200">
                  <CheckCheck size={16}/> Marcar como resuelto
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-sm text-green-600">
                  <CheckCheck size={14}/> Resuelto
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
