import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getAnnouncementsBySchool, markAnnouncementRead } from '@/services/db'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Megaphone, ThumbsUp, FileText, Image as ImageIcon, File } from 'lucide-react'
import clsx from 'clsx'

const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500',
  'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-orange-500',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function AttachmentLink({ url, index }: { url: string; index: number }) {
  const lower = url.toLowerCase()
  const isPdf = lower.includes('.pdf') || lower.includes('application/pdf')
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)/.test(lower)

  let Icon = File
  let colorCls = 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100'
  let label = `Adjunto ${index + 1}`

  if (isPdf) {
    Icon = FileText
    colorCls = 'text-red-600 bg-red-50 border-red-100 hover:bg-red-100'
    label = `PDF ${index + 1}`
  } else if (isImage) {
    Icon = ImageIcon
    colorCls = 'text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100'
    label = `Imagen ${index + 1}`
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className={clsx('inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors', colorCls)}>
      <Icon size={13}/>{label}
    </a>
  )
}

export default function RepresentativeAnnouncements() {
  const { appUser } = useAuth()
  const qc = useQueryClient()
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements', appUser?.schoolId],
    queryFn: () => getAnnouncementsBySchool(appUser!.schoolId),
    enabled: !!appUser?.schoolId,
  })
  const readMut = useMutation({
    mutationFn: (id: string) => markAnnouncementRead(id, appUser!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  })

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  // Sort: unread first
  const sorted = [...announcements].sort((a, b) => {
    const aRead = a.readBy?.includes(appUser!.id) ? 1 : 0
    const bRead = b.readBy?.includes(appUser!.id) ? 1 : 0
    return aRead - bRead
  })

  const unreadCount = announcements.filter(a => !a.readBy?.includes(appUser!.id)).length

  return (
    <div className="space-y-5 pb-24 sm:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Anuncios</h1>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {unreadCount} nuevo{unreadCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Megaphone size={36} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">Sin anuncios por el momento</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map(a => {
            const hasRead = a.readBy?.includes(appUser!.id)
            const teacherName = a.teacherName || 'Profesor'
            const avatarColor = getAvatarColor(teacherName)

            return (
              <div key={a.id} className={clsx(
                'bg-white rounded-xl border transition-all w-full',
                !hasRead
                  ? 'border-blue-200 shadow-sm ring-1 ring-blue-100'
                  : 'border-slate-200'
              )}>
                {/* Card header */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={clsx(
                      'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0',
                      avatarColor
                    )}>
                      {getInitials(teacherName)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-800 leading-snug">{a.title}</h3>
                          {!hasRead && (
                            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-semibold">
                              Nuevo
                            </span>
                          )}
                        </div>
                        {/* Read button — desktop */}
                        <button
                          onClick={() => !hasRead && readMut.mutate(a.id)}
                          disabled={hasRead}
                          className={clsx(
                            'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors shrink-0',
                            hasRead
                              ? 'bg-green-50 text-green-600 cursor-default'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          )}>
                          <ThumbsUp size={14}/>{hasRead ? 'Leído' : 'Confirmar lectura'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-600">{teacherName}</span>
                        {' · '}
                        {format(toDate(a.createdAt), "d 'de' MMMM yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 mt-3 leading-relaxed whitespace-pre-wrap">{a.body}</p>

                  {/* Attachments */}
                  {a.fileUrls?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {a.fileUrls.map((url, i) => (
                        <AttachmentLink key={i} url={url} index={i}/>
                      ))}
                    </div>
                  )}

                  {/* Read button — mobile */}
                  {!hasRead && (
                    <button
                      onClick={() => readMut.mutate(a.id)}
                      className="sm:hidden mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                      <ThumbsUp size={15}/> Confirmar lectura
                    </button>
                  )}
                  {hasRead && (
                    <div className="sm:hidden mt-3 flex items-center gap-1.5 text-xs text-green-600">
                      <ThumbsUp size={12}/> Leído
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
