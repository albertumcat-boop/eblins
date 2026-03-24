import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsByRepresentative, getPaymentsByStudent, submitPaymentReceipt } from '@/services/db'
import { uploadReceipt } from '@/services/storage'
import toast from 'react-hot-toast'
import { format, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import { Upload, FileText, Image as ImageIcon, AlertCircle, CheckCircle, Clock, XCircle, X } from 'lucide-react'
import clsx from 'clsx'
import type { Payment } from '@/types'

const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)
const STATUS_LABELS: Record<string, { label: string; icon: any; cls: string }> = {
  pending:   { label: 'Pendiente',   icon: Clock,       cls: 'bg-slate-100 text-slate-600' },
  in_review: { label: 'En revisión', icon: Clock,       cls: 'bg-amber-100 text-amber-700' },
  approved:  { label: 'Aprobado',    icon: CheckCircle, cls: 'bg-green-100 text-green-700' },
  rejected:  { label: 'Rechazado',   icon: XCircle,     cls: 'bg-red-100 text-red-700' },
}

function ReceiptUploadModal({ payment, onClose, schoolId }: { payment: Payment; onClose: () => void; schoolId: string }) {
  const qc = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [amount, setAmount] = useState('')
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const maxAmount = payment.balance || payment.amount

  const handleSubmit = async () => {
    if (!file || !amount || parseFloat(amount) <= 0) return
    if (parseFloat(amount) > maxAmount) { toast.error(`El monto no puede superar $${maxAmount.toFixed(2)}`); return }
    setUploading(true)
    try {
      const { url, type } = await uploadReceipt(file, schoolId, payment.studentId, payment.id, setProgress)
      await submitPaymentReceipt(payment.id, url, type, parseFloat(amount))
      toast.success('Comprobante enviado. Será revisado pronto.')
      qc.invalidateQueries({ queryKey: ['student-payments'] })
      onClose()
    } catch { toast.error('Error al subir el comprobante') }
    finally { setUploading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Registrar pago</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm font-medium text-slate-700">{payment.description || payment.monthLabel}</p>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-slate-500">Total: <strong className="text-slate-700">${payment.amount?.toFixed(2)}</strong></span>
              <span className="text-slate-500">Saldo: <strong className="text-red-600">${payment.balance?.toFixed(2)}</strong></span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Monto a pagar</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
              <input type="number" step="0.01" max={maxAmount}
                className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Máx. $${maxAmount.toFixed(2)}`} value={amount} onChange={e => setAmount(e.target.value)}/>
            </div>
            {payment.balance < payment.amount && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertCircle size={12}/>Pago fraccionado. Ya pagaste ${(payment.amountPaid || 0).toFixed(2)}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Comprobante (imagen o PDF)</label>
            <label className={clsx('flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors',
              file ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-slate-50')}>
              {file ? (
                <div className="text-center">
                  {file.type.startsWith('image/') ? <ImageIcon size={28} className="mx-auto text-blue-500 mb-1"/> : <FileText size={28} className="mx-auto text-blue-500 mb-1"/>}
                  <p className="text-sm font-medium text-blue-700">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{(file.size / 1024).toFixed(0)} KB{file.type.startsWith('image/') && ' · se comprimirá automáticamente'}</p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload size={28} className="mx-auto text-slate-400 mb-2"/>
                  <p className="text-sm text-slate-600">Arrastra o toca para seleccionar</p>
                  <p className="text-xs text-slate-400 mt-1">JPG, PNG, PDF — máx 10MB</p>
                </div>
              )}
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)}/>
            </label>
          </div>
          {uploading && (
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Subiendo...</span><span>{progress}%</span></div>
              <div className="w-full bg-slate-200 rounded-full h-1.5"><div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }}/></div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50">Cancelar</button>
          <button disabled={!file || !amount || uploading} onClick={handleSubmit}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 font-medium">
            {uploading ? 'Enviando...' : 'Enviar comprobante'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RepresentativePayments() {
  const { appUser } = useAuth()
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  const { data: students = [] } = useQuery({ queryKey: ['my-students', appUser?.id], queryFn: () => getStudentsByRepresentative(appUser!.id), enabled: !!appUser?.id })
  const { data: payments = [], isLoading } = useQuery({ queryKey: ['student-payments', selectedStudentId], queryFn: () => getPaymentsByStudent(selectedStudentId), enabled: !!selectedStudentId })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Mis Pagos</h1>
      <div className="flex gap-2 flex-wrap">
        {students.map(s => (
          <button key={s.id} onClick={() => setSelectedStudentId(s.id)}
            className={clsx('px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
              selectedStudentId === s.id ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-700 hover:border-blue-300')}>
            {s.fullName}
          </button>
        ))}
      </div>
      {!selectedStudentId ? (
        <div className="text-center py-16 text-slate-400 text-sm">Selecciona un estudiante para ver sus pagos</div>
      ) : isLoading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <div className="space-y-3">
          {payments.length === 0 ? <div className="text-center py-16 text-slate-400 text-sm">No hay pagos registrados</div>
          : payments.map(p => {
            const cfg = STATUS_LABELS[p.status]; const Icon = cfg?.icon
            const isOverdue = p.status === 'pending' && p.dueDate && isAfter(new Date(), toDate(p.dueDate))
            return (
              <div key={p.id} className={clsx('bg-white rounded-xl border p-4', isOverdue ? 'border-red-200' : 'border-slate-200')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800">{p.description || p.monthLabel}</p>
                      {isOverdue && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Vencido</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-slate-500">
                      <span>Total: <strong className="text-slate-700">${p.amount?.toFixed(2)}</strong></span>
                      <span>Pagado: <strong className="text-green-600">${(p.amountPaid || 0).toFixed(2)}</strong></span>
                      <span>Saldo: <strong className="text-red-500">${(p.balance || 0).toFixed(2)}</strong></span>
                    </div>
                    {p.dueDate && <p className="text-xs text-slate-400 mt-1">Vence: {format(toDate(p.dueDate), "d 'de' MMMM yyyy", { locale: es })}</p>}
                    {p.rejectionReason && <p className="text-xs text-red-500 mt-1">Rechazado: {p.rejectionReason}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', cfg?.cls)}>
                      {Icon && <Icon size={11}/>}{cfg?.label}
                    </span>
                    {(p.status === 'pending' || p.status === 'rejected') && (
                      <button onClick={() => setSelectedPayment(p)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">Pagar</button>
                    )}
                    {p.receiptUrl && <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Ver comprobante</a>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {selectedPayment && (
        <ReceiptUploadModal payment={selectedPayment} schoolId={appUser!.schoolId} onClose={() => setSelectedPayment(null)}/>
      )}
    </div>
  )
}
