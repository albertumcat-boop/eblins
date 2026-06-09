import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsByRepresentative, getPaymentsByStudent, getSchool } from '@/services/db'
import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { FileText, Download } from 'lucide-react'
import clsx from 'clsx'

const DOCUMENTS = [
  { id: 'inscripcion',   label: 'Constancia de Inscripción',   icon: '📋', desc: 'Certifica que el estudiante está inscrito en la institución' },
  { id: 'solvencia',     label: 'Constancia de Solvencia',     icon: '✅', desc: 'Certifica que no tiene deudas pendientes con la institución' },
  { id: 'buena_conducta',label: 'Constancia de Buena Conducta',icon: '🏆', desc: 'Certifica el buen comportamiento del estudiante' },
  { id: 'estudios',      label: 'Constancia de Estudios',      icon: '📚', desc: 'Certifica que el estudiante cursa estudios en la institución' },
  { id: 'retiro',        label: 'Constancia de Retiro',        icon: '📤', desc: 'Documento de retiro del estudiante de la institución' },
]

export default function RepresentativeDocuments() {
  const { appUser } = useAuth()
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [generating, setGenerating] = useState<string | null>(null)

  const { data: students = [] } = useQuery({
    queryKey: ['my-students', appUser?.id],
    queryFn: () => getStudentsByRepresentative(appUser!.id, appUser!.schoolId),
    enabled: !!appUser?.id,
  })
  const { data: school } = useQuery({
    queryKey: ['school', appUser?.schoolId],
    queryFn: () => getSchool(appUser!.schoolId),
    enabled: !!appUser?.schoolId,
  })
  const { data: payments = [] } = useQuery({
    queryKey: ['student-payments', selectedStudentId],
    queryFn: () => getPaymentsByStudent(selectedStudentId),
    enabled: !!selectedStudentId,
  })

  const student = students.find(s => s.id === selectedStudentId)
  const hasPendingPayments = payments.some(p => p.status === 'pending' || p.status === 'rejected')
  const schoolName = (school as any)?.name || 'Institución Educativa'

  const generatePDF = async (docType: string) => {
    if (!student) return
    setGenerating(docType)
    try {
      const pdf = new jsPDF()
      const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })
      const docInfo = DOCUMENTS.find(d => d.id === docType)

      // Header
      pdf.setFillColor(29, 111, 244)
      pdf.rect(0, 0, 210, 40, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(20)
      pdf.setFont('helvetica', 'bold')
      pdf.text(schoolName.toUpperCase(), 105, 18, { align: 'center' })
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      pdf.text(docInfo?.label?.toUpperCase() || '', 105, 30, { align: 'center' })

      // Body
      pdf.setTextColor(30, 30, 30)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')

      let body = ''
      if (docType === 'inscripcion') {
        body = `Quien suscribe, en su carácter de autoridad de la institución "${schoolName}", hace constar por medio de la presente que el/la estudiante ${student.fullName.toUpperCase()}, titular de la matrícula N° ${student.enrollmentCode}, se encuentra debidamente inscrito/a en esta institución educativa para el año escolar ${student.schoolYear}, cursando el ${student.grade} grado, sección "${student.section}".`
      } else if (docType === 'solvencia') {
        if (hasPendingPayments) {
          body = `Quien suscribe hace constar que el/la estudiante ${student.fullName.toUpperCase()}, matrícula N° ${student.enrollmentCode}, presenta compromisos de pago pendientes con esta institución, por lo que NO se otorga solvencia económica en esta fecha.`
        } else {
          body = `Quien suscribe hace constar que el/la estudiante ${student.fullName.toUpperCase()}, matrícula N° ${student.enrollmentCode}, se encuentra SOLVENTE con todos sus compromisos económicos ante esta institución educativa a la fecha de emisión del presente documento.`
        }
      } else if (docType === 'buena_conducta') {
        body = `Quien suscribe hace constar que el/la estudiante ${student.fullName.toUpperCase()}, matrícula N° ${student.enrollmentCode}, cursante del ${student.grade} grado, sección "${student.section}", ha demostrado durante su permanencia en esta institución un comportamiento acorde con las normas de convivencia escolar, por lo que se le expide la presente constancia de buena conducta.`
      } else if (docType === 'estudios') {
        body = `Quien suscribe hace constar que el/la estudiante ${student.fullName.toUpperCase()}, matrícula N° ${student.enrollmentCode}, cursa estudios regularmente en esta institución educativa en el ${student.grade} grado, sección "${student.section}", correspondiente al año escolar ${student.schoolYear}.`
      } else if (docType === 'retiro') {
        body = `Quien suscribe hace constar que el/la estudiante ${student.fullName.toUpperCase()}, matrícula N° ${student.enrollmentCode}, ha sido retirado/a de esta institución educativa. La presente constancia se expide a solicitud de la parte interesada para los fines legales que considere convenientes.`
      }

      // Text wrapping
      pdf.setFontSize(12)
      const lines = pdf.splitTextToSize(body, 170)
      pdf.text(lines, 20, 65)

      // Date and signature
      const textHeight = lines.length * 7
      const sigY = Math.max(65 + textHeight + 30, 160)

      pdf.setFontSize(11)
      pdf.text(`Constancia expedida en fecha: ${today}`, 20, sigY)
      pdf.text('Esta constancia es válida con el sello y firma autorizada de la institución.', 20, sigY + 10)

      // Signature line
      pdf.line(60, sigY + 50, 150, sigY + 50)
      pdf.setFontSize(10)
      pdf.text('Firma y Sello de la Institución', 105, sigY + 58, { align: 'center' })
      pdf.text(schoolName, 105, sigY + 65, { align: 'center' })

      // Footer
      pdf.setFillColor(240, 245, 255)
      pdf.rect(0, 275, 210, 22, 'F')
      pdf.setFontSize(9)
      pdf.setTextColor(100, 100, 100)
      pdf.text(`Generado por EduFinance · ${today} · Matrícula: ${student.enrollmentCode}`, 105, 285, { align: 'center' })

      pdf.save(`${docType}-${student.fullName.replace(/\s/g, '_')}.pdf`)
    } finally { setGenerating(null) }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Constancias</h1>

      <div className="flex gap-2 flex-wrap">
        {students.map(s => (
          <button key={s.id} onClick={() => setSelectedStudentId(s.id)}
            className={clsx('px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
              selectedStudentId === s.id ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-700')}>
            {s.fullName}
          </button>
        ))}
      </div>

      {!selectedStudentId ? (
        <div className="text-center py-16 text-slate-400">
          <FileText size={36} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">Selecciona un estudiante para generar constancias</p>
        </div>
      ) : (
        <>
          {hasPendingPayments && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
              ⚠️ Este estudiante tiene pagos pendientes. La constancia de solvencia reflejará esta situación.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DOCUMENTS.map(doc => (
              <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{doc.icon}</span>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{doc.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{doc.desc}</p>
                    {doc.id === 'solvencia' && (
                      <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block',
                        hasPendingPayments ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600')}>
                        {hasPendingPayments ? 'No solvente' : 'Solvente'}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => generatePDF(doc.id)} disabled={generating === doc.id}
                  className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 shrink-0">
                  {generating === doc.id ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                  ) : <Download size={13}/>}
                  PDF
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
