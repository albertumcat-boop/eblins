import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsBySchool, createStudent, updateStudent, deleteStudent, getUsersBySchool } from '@/services/db'
import { generateStudentQR } from '@/utils/exports'
import toast from 'react-hot-toast'
import { Plus, QrCode, Search, Edit2, X, Download, Copy, Filter, Trash2, AlertTriangle } from 'lucide-react'
import type { Student } from '@/types'

const GRADES = ['1er','2do','3er','4to','5to','6to','7mo','8vo','9no','10mo','11vo','12vo']
const SECTIONS = ['A','B','C','D','E']
const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()

const AVATAR_COLORS = [
  'bg-blue-500','bg-purple-500','bg-green-500','bg-amber-500',
  'bg-rose-500','bg-teal-500','bg-indigo-500','bg-orange-500',
]
function avatarColor(name: string) {
  let h = 0; for (let c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function initials(name: string) { return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() }

function exportCSV(students: Student[], users: any[]) {
  const header = ['Nombre','Matrícula','Grado','Sección','Año','Representante']
  const rows = students.map(s => {
    const rep = users.find(u => u.id === s.representativeId)
    const repLabel = rep?.displayName || s.representativeName || s.representativeEmail || ''
    return [s.fullName, s.enrollmentCode, s.grade, s.section, s.schoolYear, repLabel]
  })
  const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'estudiantes.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function AdminStudents() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [qrStudent, setQrStudent] = useState<{ name: string; url: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Student | null>(null)
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
  const deleteMut = useMutation({
    mutationFn: (studentId: string) => deleteStudent(studentId),
    onSuccess: () => {
      toast.success('Estudiante eliminado')
      qc.invalidateQueries({ queryKey: ['students'] })
      setConfirmDelete(null)
    },
    onError: () => toast.error('Error al eliminar estudiante'),
  })

  const openCreate = () => { setEditing(null); setForm({ fullName: '', grade: '1er', section: 'A', schoolYear: '2024-2025', representativeId: '' }); setShowModal(true) }
  const openEdit = (s: Student) => { setEditing(s); setForm({ fullName: s.fullName, grade: s.grade, section: s.section, schoolYear: s.schoolYear, representativeId: s.representativeId }); setShowModal(true) }
  const handleQR = async (s: Student) => { try { setQrStudent({ name: s.fullName, url: await generateStudentQR(s) }) } catch { toast.error('Error generando QR') } }
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const filtered = students.filter(s => {
    const matchSearch = !search || s.fullName.toLowerCase().includes(search.toLowerCase()) || s.enrollmentCode.toLowerCase().includes(search.toLowerCase())
    const matchGrade = !filterGrade || s.grade === filterGrade
    const matchSection = !filterSection || s.section === filterSection
    return matchSearch && matchGrade && matchSection
  })

  // Grade counters
  const gradeCounts: Record<string, number> = {}
  for (const s of students) {
    const key = `${s.grade} ${s.section}`
    gradeCounts[key] = (gradeCounts[key] || 0) + 1
  }
  const gradeChips = Object.entries(gradeCounts).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-slate-800">Estudiantes</h1>
        <div className="flex items-center gap-2">
          {students.length > 0 && (
            <button
              onClick={() => exportCSV(filtered, users)}
              className="flex items-center gap-2 border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-50">
              <Download size={15}/> <span className="hidden sm:inline">Exportar CSV</span>
            </button>
          )}
          <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
            <Plus size={16}/> Nuevo estudiante
          </button>
        </div>
      </div>

      {/* Grade counter chips */}
      {gradeChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {gradeChips.map(([key, count]) => (
            <span key={key} className="bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold px-3 py-1 rounded-full">
              {key}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar por nombre o matrícula..." value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400"/>
          <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">Todos los grados</option>
            {GRADES.map(g => <option key={g}>{g}</option>)}
          </select>
          <select value={filterSection} onChange={e => setFilterSection(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">Todas las secciones</option>
            {SECTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">Sin estudiantes</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
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
                      <td className="px-4 py-3 font-medium text-slate-700">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(s.fullName)}`}>
                            {initials(s.fullName)}
                          </div>
                          {s.fullName}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-slate-500">{s.enrollmentCode}</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(s.enrollmentCode); toast.success('Código copiado') }}
                            className="p-1 text-slate-300 hover:text-blue-500 transition-colors rounded">
                            <Copy size={12}/>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.grade}</td>
                      <td className="px-4 py-3 text-slate-600">{s.section}</td>
                      <td className="px-4 py-3 text-slate-500">{s.schoolYear}</td>
                      <td className="px-4 py-3">
                        {rep?.displayName ? (
                          <div>
                            <span className="text-slate-700 font-medium">{rep.displayName}</span>
                            {(s as any).representativeRelation && <span className="ml-1.5 text-xs text-slate-400">{(s as any).representativeRelation}</span>}
                            {(s as any).representativePhone && <p className="text-xs text-slate-400 mt-0.5">{(s as any).representativePhone}</p>}
                          </div>
                        ) : (s as any).representativeName ? (
                          <div>
                            <span className="text-amber-700 font-medium">{(s as any).representativeName}</span>
                            {(s as any).representativeRelation && <span className="ml-1.5 text-xs text-slate-400">{(s as any).representativeRelation}</span>}
                            <span className="ml-1.5 text-xs text-slate-400">(sin cuenta)</span>
                            {(s as any).representativePhone && <p className="text-xs text-slate-400 mt-0.5">{(s as any).representativePhone}</p>}
                            {(s as any).representativeEmail && <p className="text-xs text-slate-400 mt-0.5">{(s as any).representativeEmail}</p>}
                          </div>
                        ) : (s as any).representativeEmail ? (
                          <span className="text-xs text-slate-400 italic">{(s as any).representativeEmail}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar"><Edit2 size={14}/></button>
                          <button onClick={() => handleQR(s)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg" title="Ver QR"><QrCode size={14}/></button>
                          <button onClick={() => setConfirmDelete(s)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Eliminar estudiante"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">Sin estudiantes</div>
        ) : filtered.map(s => {
          const rep = users.find(u => u.id === s.representativeId)
          return (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${avatarColor(s.fullName)}`}>
                  {initials(s.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{s.fullName}</p>
                  <p className="text-xs text-slate-500">{s.grade} — Sección {s.section} · {s.schoolYear}</p>
                  {rep
                    ? <p className="text-xs text-slate-400 mt-0.5">Rep: {rep.displayName}</p>
                    : s.representativeName
                    ? <p className="text-xs text-amber-600 mt-0.5">Rep: {s.representativeName} <span className="text-slate-400">(sin cuenta)</span></p>
                    : s.representativeEmail
                    ? <p className="text-xs text-slate-400 mt-0.5 italic">{s.representativeEmail}</p>
                    : null}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{s.enrollmentCode}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(s.enrollmentCode); toast.success('Código copiado') }}
                      className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded hover:bg-blue-100 border border-blue-100">
                      <Copy size={11}/> Copiar
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => handleQR(s)}
                  className="shrink-0 w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 hover:bg-purple-100 border border-purple-100 transition-colors">
                  <QrCode size={18}/>
                </button>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <button onClick={() => openEdit(s)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-600 border border-slate-200 py-2 rounded-lg hover:bg-slate-50">
                  <Edit2 size={13}/> Editar
                </button>
                <button onClick={() => handleQR(s)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-purple-600 border border-purple-200 py-2 rounded-lg hover:bg-purple-50">
                  <QrCode size={13}/> Ver QR
                </button>
                <button onClick={() => setConfirmDelete(s)}
                  className="flex items-center justify-center gap-1.5 text-xs text-red-500 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-50">
                  <Trash2 size={13}/>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create/Edit modal */}
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

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500"/> Eliminar estudiante
              </h3>
              <button onClick={() => setConfirmDelete(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 mb-1">
                Vas a eliminar a <strong>{confirmDelete.fullName}</strong> del sistema.
              </p>
              <p className="text-xs text-slate-400">{confirmDelete.grade} &mdash; Sección {confirmDelete.section} · Matrícula: {confirmDelete.enrollmentCode}</p>
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <strong>Atención:</strong> Esta acción elimina al alumno y no puede deshacerse. Los registros de asistencia y notas asociados permanecerán.
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={() => deleteMut.mutate(confirmDelete.id)}
                disabled={deleteMut.isPending}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm hover:bg-red-700 disabled:opacity-50 font-medium">
                {deleteMut.isPending ? 'Eliminando...' : 'Si, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR modal */}
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
