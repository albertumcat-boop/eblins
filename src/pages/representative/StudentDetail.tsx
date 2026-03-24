import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getStudent, getPaymentsByStudent } from '@/services/db'
import { generateStudentQR, exportPaymentsPDF } from '@/utils/exports'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, QrCode, FileDown, GraduationCap } from 'lucide-react'
import clsx from 'clsx'

const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)
const STATUS = {
  pending:   { label: 'Pendiente',   cls: 'bg-slate-100 text-slate-600' },
  in_review: { label: 'En revisión', cls: 'bg-amber-100 text-amber-700' },
  approved:  { label: 'Aprobado',    cls: 'bg-green-100 text-green-700' },
  rejected:  { label: 'Rechazado',   cls: 'bg-red-100 text-red-700' },
}

export default function RepStudentDetail() {
  const { id } = useParams<{ id: string }>()
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)

  const { data: student } = useQuery({ queryKey: ['student', id], queryFn: () => getStudent(id!), enabled: !!id })
  const { data: payments = [] } = useQuery({ queryKey: ['student-payments', id], queryFn: () => getPaymentsByStudent(id!), enabled: !!id })

  const handleQR = async () => { if (!student) return; setQrUrl(await generateStudentQR(student)); setShowQr(true) }
  const totalDebt = payments.filter(p => p.status !== 'approved').reduce((s, p) => s + (p.balance || 0), 0)
  const totalPaid = payments.filter(p => p.status === 'approved').reduce((s, p) => s + (p.amountPaid || 0), 0)

  if (!student) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/" className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><ArrowLeft size={18}/></Link>
        <h1 className="text-xl font-bold text-slate-800">{student.fullName}</h1>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center"><GraduationCap size={26} className="text-blue-600"/></div>
            <div>
              <h2 className="font-bold text-slate-800">{student.fullName}</h2>
              <p className="text-sm text-slate-500">{student.grade}{student.section} · {student.schoolYear}</p>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">#{student.enrollmentCode}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleQR} className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs hover:bg-slate-50"><QrCode size={14}/> QR</button>
            <button onClick={() => exportPaymentsPDF(payments, student.fullName)} className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs hover:bg-slate-50"><FileDown size={14}/> PDF</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Total pagado</p><p className="text-lg font-bold text-green-600">${totalPaid.toFixed(2)}</p></div>
          <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Deuda pendiente</p><p className={`text-lg font-bold ${totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>${totalDebt.toFixed(2)}</p></div>
          <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Total pagos</p><p className="text-lg font-bold text-slate-700">{payments.length}</p></div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-semibold text-slate-700">Historial de pagos</h3></div>
        {payments.length === 0 ? <p className="text-center text-slate-400 text-sm py-10">Sin pagos registrados</p>
        : <div className="divide-y divide-slate-100">
            {payments.map(p => {
              const cfg = STATUS[p.status as keyof typeof STATUS]
              return (
                <div key={p.id} className="px-5 py-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{p.description || p.monthLabel}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.dueDate ? format(toDate(p.dueDate), "d MMM yyyy", { locale: es }) : '—'}{p.isFractioned && ' · Pago fraccionado'}</p>
                    {p.rejectionReason && <p className="text-xs text-red-500 mt-0.5">Motivo: {p.rejectionReason}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', cfg?.cls)}>{cfg?.label}</span>
                    <p className="text-sm font-bold text-slate-700">${p.amount?.toFixed(2)}</p>
                    {p.amountPaid > 0 && p.amountPaid < p.amount && <p className="text-xs text-slate-400">Pagado: ${p.amountPaid.toFixed(2)}</p>}
                  </div>
                </div>
              )
            })}
          </div>}
      </div>
      {showQr && qrUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col items-center gap-4">
            <h3 className="font-bold text-slate-800">Código QR — {student.fullName}</h3>
            <img src={qrUrl} alt="QR" className="w-52 h-52"/>
            <div className="flex gap-2">
              <button onClick={() => setShowQr(false)} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm">Cerrar</button>
              <a href={qrUrl} download={`qr-${student.fullName}.png`} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700">Descargar</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
