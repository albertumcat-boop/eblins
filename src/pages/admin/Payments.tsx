import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getPaymentsBySchool, approvePayment, rejectPayment, editPaymentAmount, createNotification, getStudentsBySchool } from '@/services/db'
import { generatePaymentReceiptPDF } from '@/utils/exports'
import { getSchool } from '@/services/db'
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
          userId: p.representativeId,
          schoolId,
          title: '✅ Pago aprobado',
          body: `Tu pago de $${p.amountPaid?.toFixed(2)} ha sido aprobado.`,
          type: 'payment',
          relatedId: paymentId,
          read: false
        })
        const student = students.find(s => s.id === p.studentId)
        if (student) generatePaymentReceiptPDF(p, student.fullName, (school as any)?.name || 'EduFinance')
      }
      toast.success('Pago aprobado — recibo generado')
      qc.invalidateQueries({ queryKey: ['payments'] })
    },
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectPayment(id, reason),
    onSuccess: async (_, { id }) => {
      const p = payments.find(x => x.id === id)
      if (p) await createNotification({
        userId: p.representativeId,
        schoolId,
        title: '❌ Pago rechazado',
        body: `Tu pago fue rechazado. Motivo: ${rejectReason}`,
        type: 'payment',
        relatedId: id,
        read: false
      })
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

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {filtered.map(p => {
                const student = studentMap[p.studentId]
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">

                        {p.receiptUrl && (
                          <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                            <ExternalLink size={15}/>
                          </a>
                        )}

                        {p.status === 'approved' && (
                          <button
                            onClick={() => {
                              const student = studentMap[p.studentId]
                              if (student) generatePaymentReceiptPDF(p, student.fullName, (school as any)?.name || 'EduFinance')
                            }}
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                            title="Descargar recibo">
                            <FileText size={15}/>
                          </button>
                        )}

                        {p.status === 'in_review' && (
                          <button onClick={() => approveMut.mutate(p.id)}
                            className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg">
                            <CheckCircle size={15}/>
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
