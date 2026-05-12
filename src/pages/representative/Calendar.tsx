import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getEventsBySchool } from '@/services/db'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays } from 'lucide-react'
import clsx from 'clsx'

const EVENT_TYPES: Record<string, { label: string; color: string; emoji: string }> = {
  event:    { label: 'Evento',     color: 'bg-blue-100 text-blue-700',   emoji: '📅' },
  holiday:  { label: 'Feriado',   color: 'bg-green-100 text-green-700', emoji: '🎉' },
  exam:     { label: 'Evaluación',color: 'bg-red-100 text-red-700',     emoji: '📝' },
  meeting:  { label: 'Reunión',   color: 'bg-purple-100 text-purple-700',emoji: '👥' },
  activity: { label: 'Actividad', color: 'bg-amber-100 text-amber-700', emoji: '⭐' },
}

export default function RepresentativeCalendar() {
  const { appUser } = useAuth()
  const { data: events = [] } = useQuery({
    queryKey: ['events', appUser?.schoolId],
    queryFn: () => getEventsBySchool(appUser!.schoolId),
    enabled: !!appUser?.schoolId,
  })

  const upcoming = events.filter((ev: any) => new Date(ev.date + 'T12:00:00') >= new Date())
  const past = events.filter((ev: any) => new Date(ev.date + 'T12:00:00') < new Date())

  const renderEvent = (ev: any) => {
    const type = EVENT_TYPES[ev.type] || EVENT_TYPES.event
    return (
      <div key={ev.id} className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-start gap-4">
        <div className="text-center min-w-12 bg-slate-50 rounded-xl p-2">
          <p className="text-xl font-bold text-slate-800">{format(new Date(ev.date + 'T12:00:00'), 'd')}</p>
          <p className="text-xs text-slate-400 capitalize">{format(new Date(ev.date + 'T12:00:00'), 'MMM', { locale: es })}</p>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span>{type.emoji}</span>
            <p className="font-semibold text-slate-800">{ev.title}</p>
            <span className={clsx('text-xs px-2 py-0.5 rounded-full', type.color)}>{type.label}</span>
          </div>
          {ev.description && <p className="text-sm text-slate-500 mt-1">{ev.description}</p>}
          <p className="text-xs text-slate-400 mt-1 capitalize">{format(new Date(ev.date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Calendario Escolar</h1>
      {events.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CalendarDays size={36} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">No hay eventos publicados</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Próximos eventos</h2>
              <div className="space-y-2">{upcoming.map(renderEvent)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">Eventos pasados</h2>
              <div className="space-y-2 opacity-60">{past.slice(0, 5).map(renderEvent)}</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
