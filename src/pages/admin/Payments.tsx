import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getPaymentsBySchool, approvePayment, rejectPayment, editPaymentAmount, createNotification, getStudentsBySchool, getSchool, createAuditLog } from '@/services/db'
import { generatePaymentReceiptPDF } from '@/utils/exports'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle, XCircle, Edit2, Search, ExternalLink, AlertCircle, Clock, FileText } from 'lucide-react'
import clsx from 'clsx'
import type { Payment } from '@/types'

const STATUS_CONFIG = {
  pending:   { label: 'Pendiente',   color: 'bg-slate-100 text-slate-700',  icon: Clock },
  in_review: { label: 'En revisión', color: 'bg-amber-100 text-amber-700',  icon: Clock },
  approved:  { label: 'Aprobado',    color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  rejected:  { label: 'Rechazado',   color: 'bg-red-100 text-red-700',      icon: XCircle },
}

const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
  if (!cfg) return null
  const Icon = cfg.icon
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', cfg.color)}>
      <Icon size={12}/>{cfg.label}
    </span>
  )
}

export default function AdminPayments() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', schoolId],
    queryFn: () => getPaymentsBySchool(schoolId, 200),
    enabled: !!schoolId,
  })
  const { data: students = [] } = useQuery({
    queryKey: ['students', schoolId],
    queryFn: () => getStudentsBySchool(schoolId),
    enabled: !!schoolId,
  })
  const { data: school } = useQuery({
    queryKey: ['school', schoolId],
    queryFn: () => getSchool(schoolId),
    enabled: !!schoolId,
  })
  const studentMap = Object.fromEntries(students.map(s => [s.id, s]))

  const approveMut = useMutation({
    mutationFn: (paymentId: string) => approvePayment(paymentId, appUser!.id),
    onSuccess: async (_, paymentId) => {
      const p = payments.find(x => x.id === paymentId)
      if (p) {
        await createNotification({
          userId: p.representativeId, schoolId, title: '✅ Pago aprobado',
          body: `Tu pago de $${p.amountPaid?.toFixed(2)} ha sido aprobado.`,
          type: 'payment', relatedId: paymentId, read: false
        })
        const student = students.find(s => s.id === p.studentId)
        if (student) generatePaymentReceiptPDF(p, student.fullName, (school as any)?.name || 'EduFinance')
        await createAuditLog({
          schoolId,
          action: 'payment_approved',
          description: `Pago aprobado: ${p.description || p.monthLabel} — $${p.amountPaid?.toFixed(2)}`,
          performedBy: appUser!.id,
          performedByName: appUser!.displayName,
          metadata: { paymentId },
        })
      }
      toast.success('Pago aprobado — recibo generado')
      qc.invalidateQueries({ queryKey: ['payments'] })
    },
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectPayment(id, reason),
    onSuccess: async (_, { id }) => {
      const p = payments.find(x => x.id === id)
      if (p) {
        await createNotification({
          userId: p.representativeId, schoolId, title: '❌ Pago rechazado',
          body: `Tu pago fue rechazado. Motivo: ${rejectReason}`,
          type: 'payment', relatedId: id, read: false
        })
        await createAuditLog({
          schoolId,
          action: 'payment_rejected',
          description: `Pago rechazado: motivo "${rejectReason}"`,
          performedBy: appUser!.id,
          performedByName: appUser!.displayName,
          metadata: { paymentId: id },
        })
      }
      toast.error('Pago rechazado')
      setShowRejectModal(false)
      setRejectReason('')
      qc.invalidateQueries({ queryKey: ['payments'] })
    },
  })

  const editMut = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => editPaymentAmount(id, amount),
    onSuccess: () => {
      toast.success('Monto actualizado')
      setShowEditModal(false)
      qc.invalidateQueries({ queryKey: ['payments'] })
    },
  })

  const filtered = payments.filter(p => {
    const student = studentMap[p.studentId]
    const matchSearch = !search || student?.fullName?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Gestión de Pagos</h1>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar por estudiante o concepto..." value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="in_review">En revisión</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
        </select>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400"><AlertCircle size={32} className="mx-auto mb-2 opacity-40"/><p className="text-sm">No se encontraron pagos</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{['Estudiante','Concepto','Monto','Pagado','Saldo','Estado','Método','Ref.','Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => {
                  const student = studentMap[p.studentId]
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3"><p className="font-medium text-slate-700">{student?.fullName || '—'}</p><p className="text-xs text-slate-400">{student?.grade}{student?.section}</p></td>
                      <td className="px-4 py-3 text-slate-600">{p.description || p.monthLabel}</td>
                      <td className="px-4 py-3 font-medium">${p.amount?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-green-700">${(p.amountPaid || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-red-600">${(p.balance || 0).toFixed(2)}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.status}/></td>
                      <td className="px-4 py-3 text-xs text-slate-500">{(p as any).paymentMethod || '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono">{(p as any).reference ? `****${(p as any).reference}` : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {p.receiptUrl && <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><ExternalLink size={15}/></a>}
                          {p.status === 'approved' && (
                            <button onClick={() => { const s = studentMap[p.studentId]; if (s) generatePaymentReceiptPDF(p, s.fullName, (school as any)?.name || 'EduFinance') }}
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg" title="Descargar recibo">
                              <FileText size={15}/>
                            </button>
                          )}
                          {p.status === 'in_review' && <button onClick={() => approveMut.mutate(p.id)} disabled={approveMut.isPending} className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg"><CheckCircle size={15}/></button>}
                          {p.status === 'in_review' && <button onClick={() => { setSelectedPayment(p); setShowRejectModal(true) }} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"><XCircle size={15}/></button>}
                          {p.status !== 'approved' && <button onClick={() => { setSelectedPayment(p); setEditAmount(String(p.amount)); setShowEditModal(true) }} className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"><Edit2 size={15}/></button>}
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

      {showRejectModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Rechazar pago</h3>
            <p className="text-sm text-slate-500 mb-4">Indica el motivo para notificar al representante.</p>
            <textarea className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={3} placeholder="Motivo de rechazo..." value={rejectReason} onChange={e => setRejectReason(e.target.value)}/>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
              <button disabled={!rejectReason.trim() || rejectMut.isPending} onClick={() => rejectMut.mutate({ id: selectedPayment.id, reason: rejectReason })}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">Rechazar</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Editar monto</h3>
            <label className="text-sm text-slate-600 block mb-1">Nuevo monto</label>
            <input type="number" className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={editAmount} onChange={e => setEditAmount(e.target.value)}/>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowEditModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm">Cancelar</button>
              <button disabled={!editAmount || editMut.isPending} onClick={() => editMut.mutate({ id: selectedPayment.id, amount: parseFloat(editAmount) })}
                className="flex-1 bg-amber-500 text-white py-2 rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
