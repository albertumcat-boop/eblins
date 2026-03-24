import QRCode from 'qrcode'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Payment, Student } from '@/types'

const toDate = (v: any): Date => v?.toDate ? v.toDate() : new Date(v)
const statusLabel = (s: string) =>
  ({ pending: 'Pendiente', in_review: 'En revisión', approved: 'Aprobado', rejected: 'Rechazado' }[s] || s)

export async function generateStudentQR(student: Student): Promise<string> {
  return QRCode.toDataURL(
    JSON.stringify({ id: student.id, name: student.fullName, enrollment: student.enrollmentCode,
      grade: `${student.grade}${student.section}`, year: student.schoolYear }),
    { width: 300, margin: 2, color: { dark: '#1e293b' } }
  )
}

export function exportPaymentsPDF(payments: Payment[], studentName: string) {
  const doc = new jsPDF()
  doc.setFontSize(18); doc.text('Historial de Pagos', 14, 22)
  doc.setFontSize(11); doc.text(`Estudiante: ${studentName}`, 14, 32)
  doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 14, 39)
  autoTable(doc, {
    head: [['Concepto', 'Tipo', 'Monto', 'Pagado', 'Saldo', 'Estado', 'Vencimiento']],
    body: payments.map(p => [
      p.monthLabel || p.description,
      p.type === 'monthly' ? 'Mensualidad' : p.type === 'enrollment' ? 'Inscripción' : 'Adicional',
      `$${p.amount.toFixed(2)}`, `$${p.amountPaid.toFixed(2)}`, `$${p.balance.toFixed(2)}`,
      statusLabel(p.status),
      p.dueDate ? format(toDate(p.dueDate), 'dd/MM/yyyy', { locale: es }) : '-',
    ]),
    startY: 48, styles: { fontSize: 9 }, headStyles: { fillColor: [30, 64, 175] },
  })
  doc.save(`pagos-${studentName.replace(/\s/g, '_')}.pdf`)
}

export function exportDebtorsPDF(debtors: Array<{ student: Student; balance: number; payments: Payment[] }>) {
  const doc = new jsPDF()
  doc.setFontSize(18); doc.text('Reporte de Deudores', 14, 22)
  doc.setFontSize(11); doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 14, 32)
  autoTable(doc, {
    head: [['Estudiante', 'Grado', 'Matrícula', 'Deuda Total', 'Pendientes']],
    body: debtors.map(d => [
      d.student.fullName, `${d.student.grade}${d.student.section}`,
      d.student.enrollmentCode, `$${d.balance.toFixed(2)}`,
      d.payments.filter(p => p.status === 'pending' || p.status === 'rejected').length.toString(),
    ]),
    startY: 42, styles: { fontSize: 9 }, headStyles: { fillColor: [220, 38, 38] },
  })
  doc.save(`deudores-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

export function exportReportExcel(payments: Payment[], month: string) {
  const map: Record<string, number> = {}
  payments.filter(p => p.status === 'approved').forEach(p => {
    const key = format(toDate(p.paidAt || p.createdAt), 'yyyy-MM', { locale: es })
    map[key] = (map[key] || 0) + p.amountPaid
  })
  const ws = XLSX.utils.json_to_sheet(Object.entries(map).map(([Mes, total]) => ({ Mes, 'Ingresos ($)': total })))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Ingresos')
  XLSX.writeFile(wb, `ingresos-${month}.xlsx`)
}

export function exportPaymentsExcel(payments: Payment[], studentName: string) {
  const ws = XLSX.utils.json_to_sheet(payments.map(p => ({
    Concepto: p.monthLabel || p.description, Tipo: p.type,
    Monto: p.amount, Pagado: p.amountPaid, Saldo: p.balance,
    Estado: statusLabel(p.status),
    Vencimiento: p.dueDate ? format(toDate(p.dueDate), 'dd/MM/yyyy', { locale: es }) : '',
  })))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Pagos')
  XLSX.writeFile(wb, `pagos-${studentName.replace(/\s/g, '_')}.xlsx`)
}
