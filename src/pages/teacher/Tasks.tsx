import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { createTask, getTasksBySchool, deleteTask } from '@/services/db'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { Plus, X, Trash2, BookOpen, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

const GRADES = ['1er','2do','3er','4to','5to','6to','7mo','8vo','9no','10mo','11vo','12vo']
const SECTIONS = ['A','B','C','D','E']
const SUBJECTS = ['Matemáticas','Lengua y Literatura','Ciencias Naturales','Ciencias Sociales','Inglés','Educación Física','Arte','Computación','Otras']

export default function TeacherTasks() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', subject: 'Matemáticas', grade: '1er', section: 'A', dueDate: '' })

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', schoolId],
    queryFn: () => getTasksBySchool(schoolId),
    enabled: !!schoolId,
  })
  const myTasks = tasks.filter((t: any) => t.teacherId === appUser?.id)

  const createMut = useMutation({
    mutationFn: () => createTask({ ...form, schoolId, teacherId: appUser!.id, teacherName: appUser!.displayName }),
    onSuccess: () => { toast.success('Tarea creada'); qc.invalidateQueries({ queryKey: ['tasks'] }); setShowModal(false); setForm({ title: '', description: '', subject: 'Matemáticas', grade: '1er', section: 'A', dueDate: '' }) },
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => { toast.success('Tarea eliminada'); qc.invalidateQueries({ queryKey: ['tasks'] }) },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const isOverdue = (date: string) => date && new Date(date + 'T23:59:59') < new Date()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Tareas</h1>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700">
          <Plus size={16}/> Nueva tarea
        </button>
      </div>

      {myTasks.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BookOpen size={36} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">No has asignado tareas aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myTasks.map((t: any) => (
            <div key={t.id} className={clsx('bg-white rounded-xl border p-4', isOverdue(t.dueDate) ? 'border-red-200' : 'border-slate-200')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">{t.title}</p>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{t.subject}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{t.grade}{t.section}</span>
                    {isOverdue(t.dueDate) && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Vencida</span>}
                  </div>
                  {t.description && <p className="text-sm text-slate-500 mt-1">{t.description}</p>}
                  {t.dueDate && <p className="text-xs text-slate-400 mt-1">Entrega: {format(new Date(t.dueDate + 'T12:00:00'), "d 'de' MMMM yyyy", { locale: es })}</p>}
                </div>
                <button onClick={() => deleteMut.mutate(t.id)} className="text-slate-400 hover:text-red-500">
                  <Trash2 size={16}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-bold text-slate-800">Nueva tarea</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-slate-400"/></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Título de la tarea</label>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" value={form.title} onChange={set('title')} placeholder="Ej: Ejercicios p. 45-48"/></div>
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Materia</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" value={form.subject} onChange={set('subject')}>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Grado</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" value={form.grade} onChange={set('grade')}>
                    {GRADES.map(g => <option key={g}>{g}</option>)}
                  </select></div>
                <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Sección</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" value={form.section} onChange={set('section')}>
                    {SECTIONS.map(s => <option key={s}>{s}</option>)}
                  </select></div>
              </div>
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Fecha de entrega</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" value={form.dueDate} onChange={set('dueDate')}/></div>
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Descripción (opcional)</label>
                <textarea rows={3} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" placeholder="Instrucciones detalladas..." value={form.description} onChange={set('description')}/></div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm">Cancelar</button>
              <button disabled={!form.title || !form.dueDate || createMut.isPending} onClick={() => createMut.mutate()}
                className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50 font-medium">
                Asignar tarea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
