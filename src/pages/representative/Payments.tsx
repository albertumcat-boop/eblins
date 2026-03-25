import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsByRepresentative, getPaymentsByStudent, createPayment } from '@/services/db'
import { uploadReceipt } from '@/services/storage'
import { db } from '@/services/firebase'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import toast from 'react-hot-toast'
import { format, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import { Upload, FileText, Image as ImageIcon, AlertCircle, CheckCircle, Clock, XCircle, X, Plus } from 'lucide-react'
import clsx from 'clsx'
import type { Payment } from '@/types'

const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)
const STATUS_LABELS: Record<string, { label: string; icon: any; cls: string }> = {
  pending:   { label: 'Pendiente',   icon: Clock,       cls: 'bg-slate-100 text-slate-600' },
  in_review: { label: 'En revisión', icon: Clock,       cls: 'bg-amber-100 text-amber-700' },
  approved:  { label: 'Aprobado',    icon: CheckCircle, cls: 'bg-green-100 text-green-700' },
  rejected:  { label: 'Rechazado',   icon: XCircle,     cls: 'bg-red-100 text-red-700' },
}

const PAYMENT_TYPES = [
  { value: 'monthly',    label: 'Mensualidad' },
  { value: 'enrollment', label: 'Inscripción' },
  { value: 'additional', label: 'Pago adicional' },
]

const CURRENCIES = [
  { value: 'USD', label: 'Dólares ($)' },
  { value: 'VES', label: 'Bolívares (Bs)' },
]

function NewPaymentModal({ onClose, schoolId, representativeId, students }: {
  onClose: () => void; schoolId: string; representativeId: string
  students: any[]
}) {
  const qc = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    studentId: students[0]?.id || '',
    type: 'monthly',
    description: '',
    amount: '',
    currency: 'USD',
    reference: '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!file || !form.amount || !form.reference || !form.studentId) {
      toast.error('Completa todos los campos y adjunta el comprobante')
      return
    }
    if (form.reference.length !== 4) {
      toast.error('El número de referencia debe tener exactamente 4 dígitos')
      return
    }
    setUploading(true)
    try {
      const paymentRef = await addDoc(collection(db, 'payments'), {
        studentId: form.studentId,
        schoolId,
        representativeId,
        type: form.type,
        description: form.description || PAYMENT_TYPES.find(t => t.value === form.type)?.label,
        amount: parseFloat(form.amount),
        amountPaid: 0,
        balance: parseFloat(form.amount),
        currency: form.currency,
        reference: form.reference,
        status: 'pending',
        isFractioned: false,
        createdAt: serverTimestamp(),
      })
      const { url, type } = await uploadReceipt(file, schoolId, form.studentId, paymentRef.id, setProgress)
      const { updateDoc, doc } = await import('firebase/firestore')
      const { db: firedb } = await import('@/services/firebase')
      await updateDoc(doc(firedb, 'payments', paymentRef.id), {
        receiptUrl: url,
        receiptType: type,
        status: 'in_review',
        amountPaid: parseFloat(form.amount),
        balance: 0,
        paidAt: serverTimestamp(),
      })
      toast.success('Pago registrado y enviado para revisión')
      qc.invalidateQueries({ queryKey: ['student-payments'] })
      onClose()
    } catch (err) {
      toast.error('Error al registrar el pago')
    } finally { setUploading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="font-bold text-slate-800">Registrar pago</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        <div className="px-6 py-4 space-y-4">

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Estudiante</label>
            <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.studentId} onChange={set('studentId')}>
              {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Tipo de pago</label>
            <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.type} onChange={set('type')}>
              {PAYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Descripción (opcional)</label>
            <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Mensualidad Enero 2025" value={form.description} onChange={set('description')}/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Monto</label>
              <input type="number" step="0.01"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00" value={form.amount} onChange={set('amount')}/>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Moneda</label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.currency} onChange={set('currency')}>
                {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Últimos 4 dígitos de la referencia
            </label>
            <input maxLength={4}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest"
              placeholder="1234" value={form.reference} onChange={set('reference')}
              onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault() }}/>
            <p className="text-xs text-slate-400 mt-1">Solo números, exactamente 4 dígitos</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Comprobante de pago</label>
            <label className={clsx('flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 cursor-pointer transition-colors',
              file ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-300 bg-slate-50')}>
              {file ? (
                <div className="text-center">
                  {file.type.startsWith('image/') ? <ImageIcon size={28} className="mx-auto text-blue-500 mb-1"/> : <FileText size={28} className="mx-auto text-blue-500 mb-1"/>}
                  <p className="text-sm font-medium text-blue-700">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{(file.size / 1024).toFixed(0)} KB
                    {file.type.startsWith('image/') && ' · se comprimirá automáticamente'}</p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload size={28} className="mx-auto text-slate-400 mb-2"/>
                  <p className="text-sm text-slate-600">Toca para seleccionar imagen o PDF</p>
                  <p className="text-xs text-slate-400 mt-1">JPG, PNG, PDF — máx 10MB</p>
                </div>
              )}
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)}/>
            </label>
          </div>

          {uploading && (
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Subiendo comprobante...</span><span>{progress}%</span></div>
              <div className="w-full bg-slate-200 rounded-full h-1.5"><div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }}/></div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50">Cancelar</button>
          <button disabled={!file || !form.amount || !form.reference || uploading} onClick={handleSubmit}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 font-medium">
            {uploading ? 'Enviando...' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RepresentativePayments() {
  const { appUser } = useAuth()
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [showNewPayment, setShowNewPayment] = useState(false)

  const { data: students = [] } = useQuery({
    queryKey: ['my-students', appUser?.id],
    queryFn: () => getStudentsByRepresentative(appUser!.id),
    enabled: !!appUser?.id,
  })

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['student-payments', selectedStudentId],
    queryFn: () => getPaymentsByStudent(selectedStudentId),
    enabled: !!selectedStudentId,
  })

  const totalDebt = payments.filter(p => p.status !== 'approved').reduce((s, p) => s + (p.balance || 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Mis Pagos</h1>
        <button onClick={() => setShowNewPayment(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
          <Plus size={16}/> Nuevo pago
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setSelectedStudentId('')}
          className={clsx('px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
            !selectedStudentId ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-700 hover:border-blue-300')}>
          Todos
        </button>
        {students.map(s => (
          <button key={s.id} onClick={() => setSelectedStudentId(s.id)}
            className={clsx('px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
              selectedStudentId === s.id ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-700 hover:border-blue-300')}>
            {s.fullName}
          </button>
        ))}
      </div>

      {selectedStudentId && totalDebt > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500 shrink-0"/>
          <div>
            <p className="font-semibold text-red-700">Deuda pendiente</p>
            <p className="text-sm text-red-600">Este estudiante tiene una deuda de <strong>${totalDe
