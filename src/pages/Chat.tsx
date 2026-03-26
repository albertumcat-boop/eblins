import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { db } from '@/services/firebase'
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDocs } from 'firebase/firestore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Send, MessageSquare } from 'lucide-react'
import clsx from 'clsx'

const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)

export default function Chat() {
  const { appUser } = useAuth()
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConv, setSelectedConv] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [newRecipient, setNewRecipient] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [showNewChat, setShowNewChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isAdmin = appUser?.role === 'admin'

  useEffect(() => {
    if (!appUser) return
    const q = isAdmin
      ? query(collection(db, 'conversations'), where('schoolId', '==', appUser.schoolId), orderBy('updatedAt', 'desc'))
      : query(collection(db, 'conversations'), where('participants', 'array-contains', appUser.id), orderBy('updatedAt', 'desc'))
    return onSnapshot(q, snap => setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [appUser?.id])

  useEffect(() => {
    if (!selectedConv) return
    const q = query(collection(db, 'conversations', selectedConv.id, 'messages'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    })
  }, [selectedConv?.id])

  useEffect(() => {
    if (!isAdmin || !appUser) return
    getDocs(query(collection(db, 'users'), where('schoolId', '==', appUser.schoolId), where('role', '==', 'representative')))
      .then(snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [isAdmin])

  const startConversation = async (repId: string) => {
    const rep = users.find(u => u.id === repId)
    if (!rep || !appUser) return
    const existing = conversations.find(c => c.participants.includes(repId))
    if (existing) { setSelectedConv(existing); setShowNewChat(false); return }
    const conv = await addDoc(collection(db, 'conversations'), {
      schoolId:     appUser.schoolId,
      participants: [appUser.id, repId],
      participantNames: { [appUser.id]: appUser.displayName, [repId]: rep.displayName },
      createdAt:    serverTimestamp(),
      updatedAt:    serverTimestamp(),
      lastMessage:  '',
    })
    const newConv = { id: conv.id, participants: [appUser.id, repId], participantNames: { [appUser.id]: appUser.displayName, [repId]: rep.displayName } }
    setSelectedConv(newConv)
    setShowNewChat(false)
  }

  const sendMessage = async () => {
    if (!text.trim() || !selectedConv || !appUser) return
    setSending(true)
    try {
      await addDoc(collection(db, 'conversations', selectedConv.id, 'messages'), {
        senderId:   appUser.id,
        senderName: appUser.displayName,
        text:       text.trim(),
        createdAt:  serverTimestamp(),
      })
      await import('firebase/firestore').then(({ updateDoc, doc }) =>
        updateDoc(doc(db, 'conversations', selectedConv.id), { lastMessage: text.trim(), updatedAt: serverTimestamp() })
      )
      setText('')
    } finally { setSending(false) }
  }

  const getOtherName = (conv: any) => {
    if (!appUser) return ''
    const otherId = conv.participants?.find((p: string) => p !== appUser.id)
    return conv.participantNames?.[otherId] || 'Usuario'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Chat</h1>
        {isAdmin && (
          <button onClick={() => setShowNewChat(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
            + Nueva conversación
          </button>
        )}
      </div>

      {showNewChat && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-800">Nueva conversación</h3>
            <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newRecipient} onChange={e => setNewRecipient(e.target.value)}>
              <option value="">Seleccionar representante</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setShowNewChat(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-sm">Cancelar</button>
              <button disabled={!newRecipient} onClick={() => startConversation(newRecipient)}
                className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm disabled:opacity-50">Iniciar</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        {/* Lista conversaciones */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 text-sm font-medium text-slate-600">
            Conversaciones ({conversations.length})
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {conversations.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <MessageSquare size={28} className="mx-auto mb-2 opacity-30"/>
                <p className="text-sm">{isAdmin ? 'Inicia una conversación' : 'Sin conversaciones aún'}</p>
              </div>
            ) : conversations.map(conv => (
              <button key={conv.id} onClick={() => setSelectedConv(conv)}
                className={clsx('w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors',
                  selectedConv?.id === conv.id && 'bg-blue-50')}>
                <p className="font-medium text-slate-700 text-sm">{getOtherName(conv)}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{conv.lastMessage || 'Sin mensajes'}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Área de mensajes */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
          {!selectedConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <MessageSquare size={40} className="mb-3 opacity-30"/>
              <p className="text-sm">Selecciona una conversación</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-slate-100">
                <p className="font-semibold text-slate-700">{getOtherName(selectedConv)}</p>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map(msg => {
                  const isMe = msg.senderId === appUser?.id
                  return (
                    <div key={msg.id} className={clsx('flex', isMe ? 'justify-end' : 'justify-start')}>
                      <div className={clsx('max-w-[75%] px-4 py-2.5 rounded-2xl text-sm',
                        isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm')}>
                        <p>{msg.text}</p>
                        <p className={clsx('text-xs mt-1', isMe ? 'text-blue-200' : 'text-slate-400')}>
                          {msg.createdAt ? format(toDate(msg.createdAt), 'HH:mm', { locale: es }) : '...'}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef}/>
              </div>
              <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
                <input
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Escribe un mensaje..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}/>
                <button onClick={sendMessage} disabled={!text.trim() || sending}
                  className="bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50">
                  <Send size={18}/>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
