import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getMeetingsBySchool } from '@/services/db'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Video, ExternalLink } from 'lucide-react'
import clsx from 'clsx'

export default function RepresentativeMeetings() {
  const { appUser } = useAuth()
  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings', appUser?.schoolId],
    queryFn: () => getMeetingsBySchool(appUser!.schoolId),
    enabled: !!appUser?.schoolId,
  })

  const upcoming = meetings.filter((m: any) => !m.date || new Date(m.date + 'T23:59:59') >= new Date())
  const past = meetings.filter((m: any) => m.date && new Date(m.date + 'T23:59:59') < new Date())

  const renderMeeting = (m: any, isPast = false) => (
    <div key={m.id} className={clsx('bg-white rounded-xl border p-5', isPast ? 'border-slate-200 opacity-60' : 'border-blue-200')}>
      <div className="flex items-start gap-3">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', isPast ? 'bg-slate-50' : 'bg-blue-50')}>
          <Video size={18} className={isPast ? 'text-slate-400' : 'text-blue-600'}/>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-800">{m.title}</p>
          {m.description && <p className="text-sm text-slate-500 mt-0.5">{m.description}</p>}
          {m.date && <p className="text-xs text-slate-400 mt-1">{format(new Date(m.date + 'T12:00:00'), "EEEE d 'de' MMMM yyyy", { locale: es })}</p>}
          {m.meetLink && !isPast && (
            <a href={m.meetLink} target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700">
              <ExternalLink size={12}/> Unirse a la reunión
            </a>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Asambleas Virtuales</h1>
      {meetings.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Video size={36} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">No hay asambleas programadas</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-3">Próximas</h2>
              <div className="space-y-3">{upcoming.map(m => renderMeeting(m))}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">Anteriores</h2>
              <div className="space-y-3">{past.map(m => renderMeeting(m, true))}</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
