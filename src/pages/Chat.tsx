import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { db } from '@/services/firebase'
import {
  collection, addDoc, query, where, orderBy, onSnapshot,
  serverTimestamp, getDocs, updateDoc, doc, setDoc, limit
} from 'firebase/firestore'
import { format, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'
import { Send, MessageSquare, Search, Plus, X, Check, CheckCheck } from 'lucide-react'
import clsx from 'clsx'

const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)

function formatConvTime(v: any) {
  if (!v) return ''
  const d = toDate(v)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Ayer'
  return format(d, 'd MMM', { locale: es })
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-pink-500', 'bg-teal-500']
  const color = colors[name?.charCodeAt(0) % colors.length] || 'bg-slate-400'
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className={clsx('rounded-full flex items-center justify-center font-bold text-white flex-shrink-0', color, sz)}>
      {initials}
    </div>
  )
}

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
  const [search, setSearch] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isAdmin = appUser?.role === 'admin'

  // Load conversations
  useEffect(() => {
    if (!appUser) return
    const q = isAdmin
      ? query(collection(db, 'conversations'), where('schoolId', '==', appUser.schoolId), orderBy('updatedAt', 'desc'), limit(50))
      : query(collection(db, 'conversations'), where('participants', 'array-contains', appUser.id), orderBy('updatedAt', 'desc'), limit(50))
    return onSnapshot(q, snap => setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [appUser?.id])

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConv) return
    const q = query(collection(db, 'conversations', selectedConv.id, 'messages'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    })
  }, [selectedConv?.id])

  // Listen for other person typing
  useEffect(() => {
    if (!selectedConv || !appUser) return
    const otherId = selectedConv.participants?.find((p: string) => p !== appUser.id)
    if (!otherId) return
    const typingKey = `typing_${otherId}`
    return onSnapshot(doc(db, 'conversations', selectedConv.id), snap => {
      const data = snap.data()
      setOtherTyping(data?.[typingKey] === true)
    })
  }, [selectedConv?.id, appUser?.id])

  // Load users for admin new chat
  useEffect(() => {
    if (!isAdmin || !appUser) return
    getDocs(query(
      collection(db, 'users'),
      where('schoolId', '==', appUser.schoolId),
      where('role', 'in', ['representative', 'teacher'])
    )).then(snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [isAdmin, appUser?.schoolId])

  const updateTypingStatus = async (typing: boolean) => {
    if (!selectedConv || !appUser) return
    const typingKey = `typing_${appUser.id}`
    await updateDoc(doc(db, 'conversations', selectedConv.id), { [typingKey]: typing })
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value)
    if (!isTyping) {
      setIsTyping(true)
      updateTypingStatus(true).catch(() => {})
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      updateTypingStatus(false).catch(() => {})
    }, 2000)
  }

  const startConversation = async (repId: string) => {
    const rep = users.find(u => u.id === repId)
    if (!rep || !appUser) return
    const existing = conversations.find(c => c.participants?.includes(repId))
    if (existing) { setSelectedConv(existing); setShowNewChat(false); return }
    const convRef = await addDoc(collection(db, 'conversations'), {
      schoolId: appUser.schoolId,
      participants: [appUser.id, repId],
      participantNames: { [appUser.id]: appUser.displayName, [repId]: rep.displayName },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: '',
      unreadCount: 0,
    })
    const newConv = {
      id: convRef.id,
      participants: [appUser.id, repId],
      participantNames: { [appUser.id]: appUser.displayName, [repId]: rep.displayName },
    }
    setSelectedConv(newConv)
    setShowNewChat(false)
  }

  const sendMessage = async () => {
    if (!text.trim() || !selectedConv || !appUser) return
    setSending(true)
    const msgText = text.trim()
    setText('')
    updateTypingStatus(false)
    try {
      await addDoc(collection(db, 'conversations', selectedConv.id, 'messages'), {
        senderId: appUser.id,
        senderName: appUser.displayName,
        text: msgText,
        createdAt: serverTimestamp(),
        read: false,
      })
      await updateDoc(doc(db, 'conversations', selectedConv.id), {
        lastMessage: msgText,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } finally { setSending(false) }
  }

  const getOtherName = (conv: any) => {
    if (!appUser) return ''
    const otherId = conv.participants?.find((p: string) => p !== appUser.id)
    return conv.participantNames?.[otherId] || 'Usuario'
  }

  const filteredConvs = conversations.filter(c =>
    !search || getOtherName(c).toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage?.toLowerCase().includes(search.toLowerCase())
  )

  // Group messages by date
  const groupedMessages: Record<string, any[]> = messages.reduce((groups: Record<string, any[]>, msg) => {
    if (!msg.createdAt) return groups
    const date = format(toDate(msg.createdAt), 'yyyy-MM-dd')
    if (!groups[date]) groups[date] = []
    groups[date].push(msg)
    return groups
  }, {})

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr)
    if (isToday(d)) return 'Hoy'
    if (isYesterday(d)) return 'Ayer'
    return format(d, "d 'de' MMMM", { locale: es })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Chat</h1>
        {isAdmin && (
          <button onClick={() => setShowNewChat(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={16}/> Nueva conversación
          </button>
        )}
      </div>

      {/* New chat modal */}
      {showNewChat && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Nueva conversación</h3>
              <button onClick={() => setShowNewChat(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input
                className="w-full pl-9 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Buscar usuario..."
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {users
                .filter(u => !search || u.displayName?.toLowerCase().includes(search.toLowerCase()))
                .map(u => (
                  <button key={u.id} onClick={() => startConversation(u.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors">
                    <Avatar name={u.displayName} size="sm"/>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{u.displayName}</p>
                      <p className="text-xs text-slate-400">{u.role === 'representative' ? 'Representante' : 'Profesor'}</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        {/* Conversations list */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                placeholder="Buscar conversación..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {filteredConvs.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <MessageSquare size={32} className="mx-auto mb-3 opacity-30"/>
                <p className="text-sm">{isAdmin ? 'Inicia una conversación' : 'Sin conversaciones aún'}</p>
              </div>
            ) : filteredConvs.map(conv => (
              <button key={conv.id} onClick={() => setSelectedConv(conv)}
                className={clsx(
                  'w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors flex items-center gap-3',
                  selectedConv?.id === conv.id && 'bg-blue-50 border-l-2 border-blue-500'
                )}>
                <Avatar name={getOtherName(conv)} size="md"/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-700 text-sm truncate">{getOtherName(conv)}</p>
                    <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                      {formatConvTime(conv.updatedAt || conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{conv.lastMessage || 'Sin mensajes aún'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Messages area */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden">
          {!selectedConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <MessageSquare size={28} className="opacity-50"/>
              </div>
              <div className="text-center">
                <p className="font-medium text-slate-600">Selecciona una conversación</p>
                <p className="text-sm mt-1">O inicia una nueva con un representante</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <Avatar name={getOtherName(selectedConv)}/>
                <div>
                  <p className="font-semibold text-slate-800">{getOtherName(selectedConv)}</p>
                  <p className="text-xs text-green-500 font-medium">
                    {otherTyping ? '✍️ Escribiendo...' : 'En línea'}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={{ background: '#f8fafc' }}>
                {Object.entries(groupedMessages).map(([date, msgs]) => (
                  <div key={date}>
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-slate-200"/>
                      <span className="text-xs text-slate-400 font-medium px-2">{formatDateLabel(date)}</span>
                      <div className="flex-1 h-px bg-slate-200"/>
                    </div>
                    {msgs.map((msg, i) => {
                      const isMe = msg.senderId === appUser?.id
                      const prevMsg = msgs[i - 1]
                      const showAvatar = !isMe && (!prevMsg || prevMsg.senderId !== msg.senderId)
                      return (
                        <div key={msg.id} className={clsx('flex items-end gap-2 mb-1', isMe ? 'justify-end' : 'justify-start')}>
                          {!isMe && <div className="w-6 flex-shrink-0">{showAvatar && <Avatar name={msg.senderName} size="sm"/>}</div>}
                          <div className={clsx(
                            'max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-sm',
                            isMe
                              ? 'bg-blue-600 text-white rounded-br-sm'
                              : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100'
                          )}>
                            <p className="leading-relaxed">{msg.text}</p>
                            <div className={clsx('flex items-center gap-1 justify-end mt-1', isMe ? 'text-blue-200' : 'text-slate-400')}>
                              <span className="text-xs">
                                {msg.createdAt ? format(toDate(msg.createdAt), 'HH:mm') : '...'}
                              </span>
                              {isMe && <CheckCheck size={12}/>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}

                {/* Typing indicator */}
                {otherTyping && (
                  <div className="flex items-end gap-2 justify-start mt-2">
                    <div className="w-6"/>
                    <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                      <div className="flex gap-1 items-center">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }}/>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef}/>
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-slate-100 bg-white flex gap-2 items-center">
                <input
                  className="flex-1 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  placeholder="Escribe un mensaje..."
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!text.trim() || sending}
                  className="w-11 h-11 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0">
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
