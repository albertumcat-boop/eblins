import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsBySchool, createStudent, updateStudent, getUsersBySchool } from '@/services/db'
import { generateStudentQR } from '@/utils/exports'
import toast from 'react-hot-toast'
import { Plus, QrCode, Search, Edit2, X, Download } from 'lucide-react'
import type { Student } from '@/types'

const GRADES = ['1er','2do','3er','4to','5to','6to','7mo','8vo','9no','10mo','11vo','12vo']
const SECTIONS = ['A','B','C','D','E']
const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()

export default function AdminStudents() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [qrStudent, setQrStudent] = useState<{ name: string; url: string } | null>(null)
  const [form, setForm] = useState({ fullName: '', grade: '1er', section: 'A', schoolYear: '2024-2025', representativeId: '' })

  const { data: students = [], isLoading } = useQuery({ queryKey: ['students', schoolId], queryFn: () => getStudentsBySchool(schoolId), enabled: !!schoolId })
  const { data: users = [] } = useQuery({ queryKey: ['users', schoolId], queryFn: () => getUsersBySchool(schoolId), enabled: !!schoolId })
  const representatives = users.filter(u => u.role === 'representative')

  const createMut = useMutation({
    mutationFn: () => createStudent({ ...form, schoolId, enrollmentCode: generateCode() }),
    onSuccess: () => { toast.success('Estudiante registrado'); qc.invalidateQueries({ queryKey: ['students'] }); setShowModal(false) },
    onError: () => toast.error('Error al registrar estudiante'),
  })
  const updateMut = useMutation({
    mutationFn: () => updateStudent(editing!.id, form),
    onSuccess: () => { toast.success('Estudiante actualizado'); qc.invalidateQueries({ queryKey: ['students'] }); setShowModal(false); setEditing(null) },
  })

  const openCreate = () => { setEditing(null); setForm({ fullName: '', grade: '1er', section: 'A', schoolYear: '2024-2025', representativeId: '' }); setShowModal(true) }
  const openEdit = (s: Student) => { setEditing(s); setForm({ fullName: s.fullName, grade: s.grade, section: s.section, schoolYear: s.schoolYear, representativeId: s.representativeId }); setShowModal(true) }
  const handleQR = async (s: Student) => { try { setQrStudent({ name: s.fullName, url: await generateStudentQR(s) }) } catch { toast.error('Error generando QR') } }

  const filtered = students.filter(s => !search || s.fullName.toLowerCase().includes(search.toLowerCase()) || s.enrollmentCode.toLowerCase().includes(search.toLowerCase()))
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-slate-800">Estudiantes</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
          <Plus size={16}/> Nuevo estudiante
        </button>
      </div>
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Buscar por nombre o matrícula..." value={search} onChange={e => setSearch(e.target.value)}/>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>
        : filtered.length === 0 ? <div className="text-center py-16 text-slate-400 text-sm">Sin estudiantes</div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Nombre','Matrícula','Grado','Sección','Año','Representante','Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => {
                const rep = users.find(u => u.id === s.representativeId)
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{s.fullName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.enrollmentCode}</td>
                    <td className="px-4 py-3 text-slate-600">{s.grade}</td>
                    <td className="px-4 py-3 text-slate-600">{s.section}</td>
                    <td className="px-4 py-3 text-slate-500">{s.schoolYear}</td>
                    <td className="px-4 py-3 text-slate-600">{rep?.displayName || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14}/></button>
                        <button onClick={() => handleQR(s)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"><QrCode size={14}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{editing ? 'Editar estudiante' : 'Nuevo estudiante'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Nombre completo</label>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.fullName} onChange={set('fullName')} placeholder="Nombre del estudiante"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Grado</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.grade} onChange={set('grade')}>
                    {GRADES.map(g => <option key={g}>{g}</option>)}</select></div>
                <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Sección</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.section} onChange={set('section')}>
                    {SECTIONS.map(s => <option key={s}>{s}</option>)}</select></div>
              </div>
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Año escolar</label>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.schoolYear} onChange={set('schoolYear')} placeholder="2024-2025"/></div>
              <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Representante</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.representativeId} onChange={set('representativeId')}>
                  <option value="">— Seleccionar representante —</option>
                  {representatives.map(r => <option key={r.id} value={r.id}>{r.displayName} ({r.email})</option>)}
                </select></div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50">Cancelar</button>
              <button disabled={!form.fullName || createMut.isPending || updateMut.isPending} onClick={() => editing ? updateMut.mutate() : createMut.mutate()}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 font-medium">
                {editing ? 'Guardar cambios' : 'Crear estudiante'}
              </button>
            </div>
          </div>
        </div>
      )}

      {qrStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col items-center gap-4 w-72">
            <h3 className="font-bold text-slate-800">Código QR</h3>
            <p className="text-sm text-slate-500 text-center">{qrStudent.name}</p>
            <img src={qrStudent.url} alt="QR" className="w-48 h-48"/>
            <div className="flex gap-2 w-full">
              <button onClick={() => setQrStudent(null)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-sm">Cerrar</button>
              <a href={qrStudent.url} download={`qr-${qrStudent.name}.png`} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm text-center flex items-center justify-center gap-1 hover:bg-blue-700">
                <Download size={14}/> Descargar
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
