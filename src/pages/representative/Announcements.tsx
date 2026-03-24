import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getAnnouncementsBySchool, markAnnouncementRead } from '@/services/db'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Megaphone, ThumbsUp, Paperclip } from 'lucide-react'
import clsx from 'clsx'

const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)

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

  if (isLoading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Anuncios</h1>
      {announcements.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><Megaphone size={36} className="mx-auto mb-3 opacity-30"/><p className="text-sm">Sin anuncios por el momento</p></div>
      ) : (
        <div className="space-y-4">
          {announcements.map(a => {
            const hasRead = a.readBy?.includes(appUser!.id)
            return (
              <div key={a.id} className={clsx('bg-white rounded-xl border p-5 transition-colors', !hasRead ? 'border-blue-200 shadow-sm' : 'border-slate-200')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-800">{a.title}</h3>
                      {!hasRead && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Nuevo</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{a.teacherName} · {format(toDate(a.createdAt), "d 'de' MMMM yyyy", { locale: es })}</p>
                  </div>
                  <button onClick={() => !hasRead && readMut.mutate(a.id)} disabled={hasRead}
                    className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                      hasRead ? 'bg-green-50 text-green-600 cursor-default' : 'bg-blue-600 text-white hover:bg-blue-700')}>
                    <ThumbsUp size={14}/>{hasRead ? 'Leído' : 'Confirmar lectura'}
                  </button>
                </div>
                <p className="text-sm text-slate-700 mt-3 leading-relaxed whitespace-pre-wrap">{a.body}</p>
                {a.fileUrls?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {a.fileUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">
                        <Paperclip size={12}/> Adjunto {i + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
