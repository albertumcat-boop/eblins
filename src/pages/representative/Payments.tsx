import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsByRepresentative, getPaymentsByStudent, getSchool } from '@/services/db'
import { uploadReceipt } from '@/services/storage'
import { db } from '@/services/firebase'
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore'
import toast from 'react-hot-toast'
import { format, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import { Upload, FileText, Image as ImageIcon, AlertCircle, CheckCircle, Clock, XCircle, X, Plus, CreditCard } from 'lucide-react'
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

const METHOD_LABELS: Record<string, string> = {
  pago_movil:    'Pago Móvil',
  transferencia: 'Transferencia Bancaria',
  zelle:         'Zelle',
  efectivo:      'Efectivo',
}

const FIELD_LABELS: Record<string, string> = {
  banco:          'Banco',
  telefono:       'Teléfono',
  cedula:         'Cédula',
  cuenta:         'Número de cuenta',
  titular:        'Titular',
  cedula_rif:     'Cédula / RIF',
  email_telefono: 'Email / Teléfono',
  instrucciones:  'Instrucciones',
}

function PaymentMethodCard({ method }: { method: any }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{method.icon}</span>
        <p className="font-semibold text-slate-700">{method.label}</p>
      </div>
      <div className="space-y-1">
        {Object.entries(method)
          .filter(([k]) => !['type','label','icon'].includes(k))
          .map(([k, v]) => (
            <div key={k} className="flex gap-2 text-sm">
              <span className="text-slate-500 min-w-24">{FIELD_LABELS[k] || k}:</span>
              <span className="font-medium text-slate-800 font-mono">{v as string}</span>
            </div>
          ))}
      </div>
    </div>
  )
}

function NewPaymentModal({ onClose, schoolId, representativeId, students, paymentMethods }: {
  onClose: () => void
  schoolId: string
  representativeId: string
  students: any[]
  paymentMethods: any[]
}) {
  const qc = useQueryClient()
  const [step, setStep] = useState<'method' | 'form'>('method')
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    studentId:   students[0]?.id || '',
    type:        'monthly',
    description: '',
    amount:      '',
    currency:    'USD',
    reference:   '',
    paymentMethod: '',
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
        studentId:       form.studentId,
        schoolId,
        representativeId,
        type:            form.type,
        description:     form.description || PAYMENT_TYPES.find(t => t.value === form.type)?.label,
        amount:          parseFloat(form.amount),
        amountPaid:      0,
        balance:         parseFloat(form.amount),
        currency:        form.currency,
        reference:       form.reference,
        paymentMethod:   form.paymentMethod,
        status:          'pending',
        isFractioned:    false,
        createdAt:       serverTimestamp(),
      })
      const { url, type } = await uploadReceipt(file, schoolId, form.studentId, paymentRef.id, setProgress)
      await updateDoc(doc(db, 'payments', paymentRef.id), {
        receiptUrl:  url,
        receiptType: type,
        status:      'in_review',
        amountPaid:  parseFloat(form.amount),
        balance:     0,
        paidAt:      serverTimestamp(),
      })
      toast.success('Pago registrado y enviado para revisión')
      qc.invalidateQueries({ queryKey: ['student-payments'] })
      onClose()
    } catch {
      toast.error('Error al registrar el pago')
    } finally { setUploading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <h3 className="font-bold text-slate-800">Registrar pago</h3>
            <p className="text-xs text-slate-400">{step === 'method' ? 'Paso 1 — Elige método de pago' : 'Paso 2 — Completa los datos'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>

        {step === 'method' ? (
          <div className="px-6 py-4 space-y-4">
            <p className="text-sm text-slate-600 bg-blue-50 border border-blue-100 rounded-xl p-3">
              Realiza tu pago usando uno de estos métodos y luego sube el comprobante en el siguiente paso.
            </p>
            {paymentMethods.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <CreditCard size={32} className="mx-auto mb-2 opacity-30"/>
                <p className="text-sm">El administrador aún no ha configurado métodos de pago</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((m, i) => (
                  <button key={i} onClick={() => { setForm(f => ({ ...f, paymentMethod: m.type })); setStep('form') }}
                    className="w-full text-left">
                    <PaymentMethodCard method={m}/>
                  </button>
                ))}
              </div>
            )}
            <div className="pt-2">
              <button onClick={() => setStep('form')}
                className="w-full border border-slate-200 text-slate-500 py-2.5 rounded-xl text-sm hover:bg-slate-50">
                Continuar sin seleccionar método
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 space-y-4">
            {form.paymentMethod && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500"/>
                <p className="text-sm text-green-700">Método seleccionado: <strong>{METHOD_LABELS[form.paymentMethod]}</strong></p>
                <button onClick={() => setStep('method')} className="ml-auto text-xs text-blue-600 hover:underline">Cambiar</button>
              </div>
            )}

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
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Monto pagado</label>
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
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest text-center text-lg"
                placeholder="1234" value={form.reference} onChange={set('reference')}
                onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault() }}/>
              <p className="text-xs text-slate-400 mt-1">Solo números, exactamente 4 dígitos</p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                Comprobante de pago
              </label>
              <label className={clsx(
                'flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 cursor-pointer transition-colors',
                file ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-300 bg-slate-50'
              )}>
                {file ? (
                  <div className="text-center">
                    {file.type.startsWith('image/') ? <ImageIcon size={28} className="mx-auto text-blue-500 mb-1"/> : <FileText size={28} className="mx-auto text-blue-500 mb-1"/>}
                    <p className="text-sm font-medium text-blue-700">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(file.size / 1024).toFixed(0)} KB
                      {file.type.startsWith('image/') && ' · se comprimirá automáticamente'}
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload size={28} className="mx-auto text-slate-400 mb-2"/>
                    <p className="text-sm text-slate-600">Toca para adjuntar comprobante</p>
                    <p className="text-xs text-slate-400 mt-1">JPG, PNG, PDF — máx 10MB</p>
                  </div>
                )}
                <input type="file" accept="image/*,.pdf" className="hidden"
                  onChange={e => setFile(e.target.files?.[0] || null)}/>
              </label>
            </div>

            {uploading && (
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Subiendo comprobante...</span><span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }}/>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          {step === 'form' && (
            <button onClick={() => setStep('method')}
              className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50">
              Atrás
            </button>
          )}
          {step === 'method' ? (
            <button onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50">
              Cancelar
            </button>
          ) : (
            <button disabled={!file || !form.amount || !form.reference || uploading} onClick={handleSubmit}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 font-medium">
              {uploading ? `Subiendo... ${progress}%` : 'Registrar pago'}
            </button>
          )}
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

  const { data: school } = useQuery({
    queryKey: ['school', appUser?.schoolId],
    queryFn: () => getSchool(appUser!.schoolId),
    enabled: !!appUser?.schoolId,
  })

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['student-payments', selectedStudentId],
    queryFn: () => getPaymentsByStudent(selectedStudentId),
    enabled: !!selectedStudentId,
  })

  const paymentMethods = (school as any)?.paymentMethods || []
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
            <p className="text-sm text-red-600">Deuda total: <strong>${totalDebt.toFixed(2)}</strong></p>
          </div>
        </div>
      )}

      {!selectedStudentId ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">Selecciona un estudiante para ver sus pagos</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">No hay pagos registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map(p => {
            const cfg = STATUS_LABELS[p.status]
            const Icon = cfg?.icon
            return (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{p.description}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-slate-500">
                      <span>Monto: <strong className="text-slate-700">
                        {(p as any).currency === 'VES' ? 'Bs. ' : '$ '}{p.amount?.toFixed(2)}
                      </strong></span>
                      {(p as any).currency && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{(p as any).currency}</span>}
                      {(p as any).paymentMethod && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{METHOD_LABELS[(p as any).paymentMethod] || (p as any).paymentMethod}</span>}
                      {(p as any).reference && <span>Ref: <strong className="font-mono">****{(p as any).reference}</strong></span>}
                    </div>
                    {p.rejectionReason && <p className="text-xs text-red-500 mt-1">Rechazado: {p.rejectionReason}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', cfg?.cls)}>
                      {Icon && <Icon size={11}/>}{cfg?.label}
                    </span>
                    {p.receiptUrl && (
                      <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline">
                        Ver comprobante
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showNewPayment && appUser && (
        <NewPaymentModal
          onClose={() => setShowNewPayment(false)}
          schoolId={appUser.schoolId}
          representativeId={appUser.id}
          students={students}
          paymentMethods={paymentMethods}
        />
      )}
    </div>
  )
}
