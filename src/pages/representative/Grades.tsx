import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsByRepresentative } from '@/services/db'
import { db } from '@/services/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { FileDown, BookOpen } from 'lucide-react'

const PERIODS = ['1er Lapso', '2do Lapso', '3er Lapso', 'Final']

export default function RepresentativeGrades() {
  const { appUser } = useAuth()
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('1er Lapso')

  const { data: students = [] } = useQuery({
    queryKey: ['my-students', appUser?.id],
    queryFn: () => getStudentsByRepresentative(appUser!.id),
    enabled: !!appUser?.id,
  })

  const { data: gradesData } = useQuery({
    queryKey: ['rep-grades', selectedStudentId, selectedPeriod],
    queryFn: async () => {
      const q = query(collection(db, 'grades'),
        where('studentId', '==', selectedStudentId),
        where('period', '==', selectedPeriod))
      const snap = await getDocs(q)
      return snap.docs[0]?.data() || null
    },
    enabled: !!selectedStudentId,
  })

  const student = students.find(s => s.id === selectedStudentId)

  const downloadPDF = () => {
    if (!gradesData || !student) return
    const pdf = new jsPDF()
    pdf.setFontSize(18)
    pdf.text('Boletín de Notas', 14, 22)
    pdf.setFontSize(12)
    pdf.text(`Estudiante: ${student.fullName}`, 14, 32)
    pdf.text(`Grado: ${student.grade}${student.section}`, 14, 39)
    pdf.text(`Período: ${selectedPeriod}`, 14, 46)
    pdf.text(`Año escolar: ${student.schoolYear}`, 14, 53)
    autoTable(pdf, {
      head: [['Materia', 'Nota']],
      body: Object.entries(gradesData.grades || {}).map(([subject, grade]) => [subject, grade as string]),
      startY: 60,
      headStyles: { fillColor: [124, 58, 237] },
    })
    pdf.save(`boletin-${student.fullName}-${selectedPeriod}.pdf`)
  }

  const grades = gradesData?.grades || {}
  const gradeValues = Object.values(grades).map(Number).filter(n => !isNaN(n))
  const average = gradeValues.length > 0 ? (gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length).toFixed(1) : null

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Boletín de Notas</h1>

      <div className="flex gap-2 flex-wrap">
        {students.map(s => (
          <button key={s.id} onClick={() => setSelectedStudentId(s.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              selectedStudentId === s.id ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-700'
            }`}>
            {s.fullName}
          </button>
        ))}
      </div>

      {selectedStudentId && (
        <>
          <div className="flex gap-2 flex-wrap">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  selectedPeriod === p ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 text-slate-600'
                }`}>
                {p}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-700">{selectedPeriod}</h2>
                {average && <p className="text-xs text-slate-400 mt-0.5">Promedio: <strong className="text-purple-600">{average}</strong></p>}
              </div>
              {gradesData && (
                <button onClick={downloadPDF}
                  className="flex items-center gap-2 text-sm bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700">
                  <FileDown size={14}/> Descargar PDF
                </button>
              )}
            </div>

            {!gradesData ? (
              <div className="text-center py-12 text-slate-400">
                <BookOpen size={32} className="mx-auto mb-2 opacity-30"/>
                <p className="text-sm">No hay notas cargadas para este período</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {Object.entries(grades).map(([subject, grade]) => {
                  const n = Number(grade)
                  return (
                    <div key={subject} className="flex items-center justify-between px-5 py-3">
                      <p className="text-sm text-slate-700">{subject}</p>
                      <span className={`font-bold text-lg ${n >= 10 ? 'text-green-600' : 'text-red-500'}`}>
                        {grade}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {!selectedStudentId && (
        <div className="text-center py-16 text-slate-400">
          <BookOpen size={36} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">Selecciona un estudiante para ver sus notas</p>
        </div>
      )}
    </div>
  )
}
