import React, { useCallback, useRef, useState } from 'react'
import { UploadCloud, Download, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from '@/context/AuthContext'
import { parseStudentsCSV, type StudentCSVRow } from '@/utils/csvImport'

const TEMPLATE_CONTENT =
  'nombre_completo,grado,seccion,representante_email\n' +
  'Juan Pérez,1ro,A,juan.padre@email.com\n' +
  'María García,2do,B,maria.madre@email.com\n'

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CONTENT], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla_estudiantes.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function Import() {
  const { appUser } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validRows, setValidRows] = useState<StudentCSVRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [summary, setSummary] = useState<{ imported: number; failed: number } | null>(null)

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor selecciona un archivo .csv')
      return
    }
    setFileName(file.name)
    setSummary(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const result = parseStudentsCSV(text)
      setValidRows(result.valid)
      setErrors(result.errors)
      if (result.valid.length === 0 && result.errors.length > 0) {
        toast.error('El archivo tiene errores. Revisa los detalles.')
      } else if (result.valid.length > 0) {
        toast.success(`${result.valid.length} filas válidas encontradas.`)
      }
    }
    reader.readAsText(file)
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleImport = async () => {
    if (!appUser?.schoolId || validRows.length === 0) return
    setImporting(true)
    setProgress(0)
    setSummary(null)

    let imported = 0
    let failed = 0

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]
      try {
        // Find representative user by email
        const q = query(collection(db, 'users'), where('email', '==', row.representativeEmail))
        const snap = await getDocs(q)
        const repId = snap.empty ? '' : snap.docs[0].id

        await addDoc(collection(db, 'students'), {
          schoolId: appUser.schoolId,
          representativeId: repId,
          fullName: row.fullName,
          grade: row.grade,
          section: row.section,
          representativeEmail: row.representativeEmail,
          enrollmentCode: '',
          schoolYear: new Date().getFullYear().toString(),
          createdAt: serverTimestamp(),
        })
        imported++
      } catch {
        failed++
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100))
    }

    setImporting(false)
    setSummary({ imported, failed })
    if (failed === 0) {
      toast.success(`${imported} estudiantes importados correctamente.`)
    } else {
      toast.error(`${imported} importados, ${failed} fallaron.`)
    }
  }

  const previewRows = validRows.slice(0, 10)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importar Estudiantes</h1>
          <p className="text-gray-500 text-sm mt-1">Carga masiva desde archivo CSV</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Descargar plantilla
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <UploadCloud className="w-10 h-10 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600 font-medium">
          {fileName ? fileName : 'Arrastra tu CSV aquí o haz clic para seleccionar'}
        </p>
        <p className="text-gray-400 text-sm mt-1">Solo archivos .csv</p>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-700 font-semibold flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4" /> {errors.length} error{errors.length !== 1 ? 'es' : ''} encontrado{errors.length !== 1 ? 's' : ''}
          </h3>
          <ul className="space-y-1">
            {errors.map((err, i) => (
              <li key={i} className="text-red-600 text-sm">{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview table */}
      {validRows.length > 0 && (
        <div>
          <h3 className="text-gray-700 font-semibold flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Vista previa — {validRows.length} fila{validRows.length !== 1 ? 's' : ''} válida{validRows.length !== 1 ? 's' : ''}
            {validRows.length > 10 && <span className="text-gray-400 text-sm font-normal">(mostrando primeras 10)</span>}
          </h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-green-50">
                <tr>
                  <th className="px-4 py-2 text-left text-green-800 font-medium">#</th>
                  <th className="px-4 py-2 text-left text-green-800 font-medium">Nombre completo</th>
                  <th className="px-4 py-2 text-left text-green-800 font-medium">Grado</th>
                  <th className="px-4 py-2 text-left text-green-800 font-medium">Sección</th>
                  <th className="px-4 py-2 text-left text-green-800 font-medium">Email representante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewRows.map((row, i) => (
                  <tr key={i} className="bg-white hover:bg-green-50 transition-colors">
                    <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2 font-medium text-gray-800">{row.fullName}</td>
                    <td className="px-4 py-2 text-gray-600">{row.grade}</td>
                    <td className="px-4 py-2 text-gray-600">{row.section}</td>
                    <td className="px-4 py-2 text-gray-600">{row.representativeEmail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {importing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Importando...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className={`rounded-lg p-4 flex items-center gap-3 ${summary.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <CheckCircle className={`w-5 h-5 ${summary.failed === 0 ? 'text-green-500' : 'text-yellow-500'}`} />
          <span className="font-medium text-gray-800">
            {summary.imported} estudiante{summary.imported !== 1 ? 's' : ''} importado{summary.imported !== 1 ? 's' : ''} correctamente
            {summary.failed > 0 && `, ${summary.failed} con error`}
          </span>
        </div>
      )}

      {/* Import button */}
      {validRows.length > 0 && !importing && !summary && (
        <button
          onClick={handleImport}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-base transition-colors flex items-center justify-center gap-2"
        >
          <UploadCloud className="w-5 h-5" />
          Importar {validRows.length} estudiante{validRows.length !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}
