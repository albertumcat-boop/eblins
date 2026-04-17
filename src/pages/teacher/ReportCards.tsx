import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsBySchool } from '@/services/db'
import { db } from '@/services/firebase'
import { storage } from '@/services/firebase'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { Upload, FileText, X, Plus } from 'lucide-react'

const PERIODS = ['1er Lapso', '2do Lapso', '3er Lapso', 'Final']

export default function TeacherReportCards() {
  const { appUser } = useAuth()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ studentId: '', period: '1er Lapso', schoolYear: '2024-2025', notes: '' })

  const { data: students = [] } = useQuery({
    queryKey: ['students', appUser?.schoolId],
    queryFn: () => getStudentsBySchool(appUser!.schoolId),
    enabled: !!appUser?.schoolId,
  })

  const { data: reportCards = [] } = useQuery({
    queryKey: ['reportcards', appUser?.schoolId],
    queryFn: async () => {
      const q = query(collection(db, 'reportCards'),
        where('schoolId', '==', appUser!.schoolId),
        orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
    enabled: !!appUser?.schoolId,
  })

  const handleUpload = async () => {
    if (!file || !form.studentId) { toast.error('Selecciona un estudiante y un archivo'); return }
    setUploading(true)
    try {
      const student = students.find(s => s.id === form.studentId)
      const path = `reportcards/${appUser!.schoolId}/${form.studentId}/${Date.now()}-${file.name}`
      const storageRef = ref(storage, path)
      const task = uploadBytesResumable(storageRef, file)
      await new Promise<void>((resolve, reject) => {
        task.on('state_changed',
          s => setProgress(Math.round(s.bytesTransferred / s.totalBytes * 100)),
          reject,
          async () => {
            const url = await getDownloadURL(task.snapshot.ref)
            await addDoc(collection(db, 'reportCards'), {
              studentId:    form.studentId,
              studentName:  student?.fullName,
              schoolId:     appUser!.schoolId,
              teacherId:    appUser!.id,
              teacherName:  appUser!.displayName,
              period:       form.period,
              schoolYear:   form.schoolYear,
              notes:        form.notes,
              fileUrl:      url,
              fileName:     file.name,
              createdAt:    serverTimestamp(),
            })
            await addDoc(collection(db, 'notifications'), {
              userId:    student?.representativeId,
              schoolId:  appUser!.schoolId,
              title:     '📄 Nueva boleta disponible',
              body:      `La boleta de ${student?.fullName} del ${form.period} está disponible`,
              type:      'announcement',
              read:      false,
              createdAt: serverTimestamp(),
            })
            resolve()
          }
        )
      })
      toast.success('Boleta subida y representante notificado')
      qc.invalidateQueries({ queryKey: ['reportcards'] })
      setShowModal(false)
      setFile(null)
      setProgress(0)
      setForm({ studentId: '', period: '1er Lapso', schoolYear: '2024-2025', notes: '' })
    } catch { toast.error('Error al subir la boleta') }
    finally { setUploading(false) }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Boletas</h1>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700">
          <Plus size={16}/> Subir boleta
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 text-sm font-medium text-slate-600">
          Boletas subidas ({reportCards.length})
        </div>
        {reportCards.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FileText size={32} className="mx-auto mb-2 opacity-30"/>
            <p className="text-sm">No hay boletas subidas aún</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(reportCards as any[]).map(r => (
              <div key={r.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-slate-800">{r.studentName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{r.period} · {r.schoolYear}</p>
                  {r.notes && <p className="text-xs text-slate-400 mt-0.5">{r.notes}</p>}
                  <p className="text-xs text-slate-400">{format(r.createdAt?.toDate?.() || new Date(), "d 'de' MMMM yyyy", { locale: es })}</p>
                </div>
                <a href={r.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700">
                  <FileText size={14}/> Ver boleta
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Subir boleta</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-slate-400"/></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Estudiante</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={form.studentId} onChange={set('studentId')}>
                  <option value="">Seleccionar estudiante</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Período</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={form.period} onChange={set('period')}>
                    {PERIODS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Año escolar</label>
                  <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={form.schoolYear} onChange={set('schoolYear')}/>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Notas adicionales (opcional)</label>
                <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder="Observaciones..." value={form.notes} onChange={set('notes')}/>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Archivo de boleta</label>
                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 cursor-pointer transition-colors ${file ? 'border-purple-300 bg-purple-50' : 'border-slate-200 hover:border-purple-300'}`}>
                  {file ? (
                    <div className="text-center">
                      <FileText size={28} className="mx-auto text-purple-500 mb-1"/>
                      <p className="text-sm font-medium text-purple-700">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload size={28} className="mx-auto text-slate-400 mb-2"/>
                      <p className="text-sm text-slate-600">PDF o imagen de la boleta</p>
                    </div>
                  )}
                  <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)}/>
                </label>
              </div>
              {uploading && (
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Subiendo...</span><span>{progress}%</span></div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5"><div className="bg-purple-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }}/></div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm">Cancelar</button>
              <button disabled={!file || !form.studentId || uploading} onClick={handleUpload}
                className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50 font-medium">
                {uploading ? 'Subiendo...' : 'Subir boleta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
