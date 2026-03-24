import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getAnnouncementsBySchool, createAnnouncement } from '@/services/db'
import { uploadAnnouncementFile } from '@/services/storage'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Paperclip, X, Megaphone, Eye } from 'lucide-react'

const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)

export default function TeacherAnnouncements() {
  const { appUser } = useAuth()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [form, setForm] = useState({ title: '', body: '', targetGrades: '' })

  const { data: announcements = [] } = useQuery({ queryKey: ['announcements', appUser?.schoolId], queryFn: () => getAnnouncementsBySchool(appUser!.schoolId), enabled: !!appUser?.schoolId })
  const myAnnouncements = announcements.filter(a => a.teacherId === appUser?.id)

  const createMut = useMutation({
    mutationFn: async () => {
      const fileUrls: string[] = []
      for (const file of files) { fileUrls.push(await uploadAnnouncementFile(file, appUser!.schoolId, appUser!.id, setUploadProgress)) }
      await createAnnouncement({ schoolId: appUser!.schoolId, teacherId: appUser!.id, teacherName: appUser!.displayName, title: form.title, body: form.body, targetGrades: form.targetGrades ? form.targetGrades.split(',').map(s => s.trim()) : [], fileUrls })
    },
    onSuccess: () => { toast.success('Anuncio publicado'); setForm({ title: '', body: '', targetGrades: '' }); setFiles([]); setShowForm(false); qc.invalidateQueries({ queryKey: ['announcements'] }) },
    onError: () => toast.error('Error al publicar el anuncio'),
  })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Mis Anuncios</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
          <Plus size={16}/> Nuevo anuncio
        </button>
      </div>
      {myAnnouncements.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><Megaphone size={36} className="mx-auto mb-3 opacity-30"/><p className="text-sm">No has publicado anuncios aún</p></div>
      ) : (
        <div className="space-y-4">
          {myAnnouncements.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800">{a.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{format(toDate(a.createdAt), "d 'de' MMMM yyyy, HH:mm", { locale: es })}{a.targetGrades?.length > 0 && ` · Para: ${a.targetGrades.join(', ')}`}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
                  <Eye size={12}/>{a.readBy?.length || 0} leído{a.readBy?.length !== 1 ? 's' : ''}
                </div>
              </div>
              <p className="text-sm text-slate-700 mt-3 leading-relaxed whitespace-pre-wrap line-clamp-3">{a.body}</p>
              {a.fileUrls?.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {a.fileUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
                      <Paperclip size={12}/> Adjunto {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Nuevo anuncio</h3>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-slate-400"/></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Título</label>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Título del anuncio" value={form.title} onChange={set('title')}/></div>
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Mensaje</label>
                <textarea rows={5} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Escribe el contenido del anuncio..." value={form.body} onChange={set('body')}/></div>
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Grados (opcional, separados por coma)</label>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: 5to, 6to — vacío = todos" value={form.targetGrades} onChange={set('targetGrades')}/></div>
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Archivos adjuntos (opcional)</label>
                <label className="flex items-center gap-2 border border-dashed border-slate-200 rounded-xl p-3 cursor-pointer hover:border-blue-300 transition-colors">
                  <Paperclip size={16} className="text-slate-400"/>
                  <span className="text-sm text-slate-500">{files.length > 0 ? `${files.length} archivo(s) seleccionado(s)` : 'Seleccionar archivos'}</span>
                  <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={e => setFiles(Array.from(e.target.files || []))}/>
                </label></div>
              {createMut.isPending && uploadProgress > 0 && (
                <div><p className="text-xs text-slate-500 mb-1">Subiendo archivos... {uploadProgress}%</p>
                  <div className="w-full bg-slate-200 rounded-full h-1.5"><div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}/></div></div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50">Cancelar</button>
              <button disabled={!form.title || !form.body || createMut.isPending} onClick={() => createMut.mutate()}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 font-medium">
                {createMut.isPending ? 'Publicando...' : 'Publicar anuncio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
