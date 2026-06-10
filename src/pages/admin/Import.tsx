import { useCallback, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { UploadCloud, Download, CheckCircle, XCircle, Loader2, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from '@/context/AuthContext'
import clsx from 'clsx'

// ── System fields the app needs ────────────────────────────────────
interface SystemField {
  key: string
  label: string
  required: boolean
  hint: string
  keywords: string[]   // words used to auto-detect the right column
}

const SYSTEM_FIELDS: SystemField[] = [
  {
    key: 'fullName',
    label: 'Nombre completo del alumno',
    required: true,
    hint: 'Nombre y apellido del estudiante',
    // NOTE: 'nombre' keyword is intentionally NOT here to avoid colliding with rep name column
    keywords: ['alumno', 'estudiante', 'apellido', 'nombre completo', 'student', 'nombre del alumno'],
  },
  {
    key: 'grade',
    label: 'Grado / Año',
    required: true,
    hint: 'Ej: 1er, 2do, 7mo, 1°, Primero',
    keywords: ['grado', 'grade', 'nivel', 'curso', 'year', 'form'],
  },
  {
    key: 'section',
    label: 'Sección / División',
    required: true,
    hint: 'Ej: A, B, C, Única',
    keywords: ['seccion', 'secció', 'division', 'divisió', 'section', 'grupo', 'group', 'aula'],
  },
  {
    // Email MUST come before name — more specific keywords (email/correo/mail)
    key: 'representativeEmail',
    label: 'Email del representante',
    required: false,
    hint: 'Correo del padre/madre/representante (clave para vinculación automática)',
    keywords: ['email', 'correo', 'mail', 'e-mail'],
  },
  {
    key: 'representativeName',
    label: 'Nombre del representante',
    required: false,
    hint: 'Nombre completo del padre/madre/representante',
    keywords: ['del representante', 'nombre representante', 'padre nombre', 'madre nombre', 'parent name', 'guardian', 'tutor', 'representante', 'padre', 'madre'],
  },
  {
    key: 'representativePhone',
    label: 'Teléfono del representante',
    required: false,
    hint: 'Número de contacto del representante',
    keywords: ['telefono', 'teléfono', 'phone', 'celular', 'movil', 'móvil', 'contacto', 'tel'],
  },
  {
    key: 'representativeCedula',
    label: 'Cédula / ID del representante',
    required: false,
    hint: 'Número de identificación del representante',
    keywords: ['cedula', 'cédula', 'dni', 'rif', 'identificacion', 'id', 'ci', 'documento'],
  },
  {
    key: 'representativeRelation',
    label: 'Parentesco',
    required: false,
    hint: 'Relación con el alumno: Padre, Madre, Tutor, etc.',
    keywords: ['parentesco', 'relacion', 'relación', 'vinculo', 'vínculo', 'relation', 'parent type', 'tipo'],
  },
  {
    key: 'schoolYear',
    label: 'Año escolar',
    required: false,
    hint: 'Ej: 2025-2026. Si no existe, se usa el año actual.',
    keywords: ['año escolar', 'anio escolar', 'periodo', 'ciclo', 'school year', 'schoolyear'],
  },
]

type Mapping = Record<string, string>  // systemField.key → excelColumnHeader | '__none__'

// ── Auto-detect column mapping ─────────────────────────────────────
function normalize(s: string) {
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // strip accents
    .replace(/[^a-z0-9 ]/g, ' ')      // non-alphanum → space
    .replace(/\s+/g, ' ')
    .trim()
}

function autoDetect(headers: string[]): Mapping {
  const mapping: Mapping = {}
  const used = new Set<string>()

  for (const field of SYSTEM_FIELDS) {
    const match = headers.find(h => {
      if (used.has(h)) return false
      const norm = normalize(h)
      return field.keywords.some(kw => norm.includes(normalize(kw)))
    })
    mapping[field.key] = match ?? '__none__'
    if (match) used.add(match)
  }

  // Fallback for fullName: if still unmapped, pick first unused column that contains 'nombre'
  if (mapping['fullName'] === '__none__') {
    const fallback = headers.find(h => !used.has(h) && normalize(h).includes('nombre'))
    if (fallback) { mapping['fullName'] = fallback; used.add(fallback) }
  }

  return mapping
}

// ── Download example template ──────────────────────────────────────
function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Nombre del Alumno', 'Grado', 'Seccion', 'Año Escolar',
     'Nombre del Representante', 'Correo del Representante',
     'Telefono del Representante', 'Cedula del Representante', 'Parentesco'],
    ['Juan Pérez García',   '1er', 'A', '2025-2026', 'Carlos Pérez',       'carlos.perez@gmail.com',  '0412-555-0001', 'V-10.111.222', 'Padre'],
    ['María Rodríguez',     '2do', 'B', '2025-2026', 'Ana Rodríguez',      'ana.rodriguez@gmail.com', '0424-555-0002', 'V-11.333.444', 'Madre'],
    ['Carlos López Ruiz',   '7mo', 'A', '2025-2026', 'Pedro López',        'pedro.lopez@yahoo.com',   '0416-555-0003', 'V-9.555.666',  'Padre'],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes')
  XLSX.writeFile(wb, 'plantilla_estudiantes.xlsx')
}

// ── Parse Excel/CSV file → rows ─────────────────────────────────────
function parseFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const wb = XLSX.read(data, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        if (raw.length < 2) { reject(new Error('El archivo está vacío o solo tiene encabezados.')); return }

        // First non-empty row = headers
        const headers = (raw[0] as any[]).map(h => String(h ?? '').trim()).filter(Boolean)
        if (headers.length === 0) { reject(new Error('No se encontraron encabezados en la primera fila.')); return }

        const rows: Record<string, string>[] = []
        for (let i = 1; i < raw.length; i++) {
          const row = raw[i] as any[]
          // Skip completely empty rows
          if (row.every(cell => !String(cell ?? '').trim())) continue
          const obj: Record<string, string> = {}
          headers.forEach((h, idx) => { obj[h] = String(row[idx] ?? '').trim() })
          rows.push(obj)
        }

        resolve({ headers, rows })
      } catch (err) {
        reject(new Error('No se pudo leer el archivo. Asegúrate de que sea Excel (.xlsx/.xls) o CSV.'))
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo.'))
    reader.readAsBinaryString(file)
  })
}

// ── Main component ─────────────────────────────────────────────────
type Step = 'upload' | 'map' | 'preview' | 'done'

export default function Import() {
  const { appUser } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Mapping>({})
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [summary, setSummary] = useState<{ imported: number; failed: number; skipped: number } | null>(null)

  // ── Step 1: Load file ──────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      toast.error('Formato no soportado. Usa .xlsx, .xls o .csv')
      return
    }
    try {
      const { headers: h, rows: r } = await parseFile(file)
      setFileName(file.name)
      setHeaders(h)
      setRows(r)
      setMapping(autoDetect(h))
      setStep('map')
      toast.success(`Archivo cargado: ${r.length} filas detectadas`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  // ── Step 2: Validate mapping ───────────────────────────────────
  const missingRequired = SYSTEM_FIELDS.filter(f => f.required && (!mapping[f.key] || mapping[f.key] === '__none__'))

  const getMappedValue = (row: Record<string, string>, fieldKey: string): string => {
    const col = mapping[fieldKey]
    if (!col || col === '__none__') return ''
    return row[col] ?? ''
  }

  // Build preview rows applying the mapping
  const previewRows = rows.slice(0, 5).map(row => ({
    fullName:               getMappedValue(row, 'fullName'),
    grade:                  getMappedValue(row, 'grade'),
    section:                getMappedValue(row, 'section'),
    representativeEmail:    getMappedValue(row, 'representativeEmail'),
    representativeName:     getMappedValue(row, 'representativeName'),
    representativePhone:    getMappedValue(row, 'representativePhone'),
    representativeCedula:   getMappedValue(row, 'representativeCedula'),
    representativeRelation: getMappedValue(row, 'representativeRelation'),
    schoolYear:             getMappedValue(row, 'schoolYear') || new Date().getFullYear().toString(),
  }))

  // ── Step 3: Import ─────────────────────────────────────────────
  const handleImport = async () => {
    if (!appUser?.schoolId) return
    setImporting(true)
    setProgress(0)
    let imported = 0, failed = 0, skipped = 0
    const defaultYear = new Date().getFullYear().toString()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const fullName                = getMappedValue(row, 'fullName').trim()
        const grade                   = getMappedValue(row, 'grade').trim()
        const section                 = getMappedValue(row, 'section').trim()
        const representativeEmail     = getMappedValue(row, 'representativeEmail').trim().toLowerCase()
        const representativeName      = getMappedValue(row, 'representativeName').trim()
        const representativePhone     = getMappedValue(row, 'representativePhone').trim()
        const representativeCedula    = getMappedValue(row, 'representativeCedula').trim()
        const representativeRelation  = getMappedValue(row, 'representativeRelation').trim()
        const schoolYear              = getMappedValue(row, 'schoolYear').trim() || defaultYear

        if (!fullName || !grade || !section) { skipped++; continue }

        // Try to link representative (by email if already registered)
        let repId = ''
        if (representativeEmail) {
          const q = query(collection(db, 'users'), where('email', '==', representativeEmail))
          const snap = await getDocs(q)
          if (!snap.empty) repId = snap.docs[0].id
        }

        // Generate simple enrollment code
        const enrollmentCode = `${grade}${section}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

        await addDoc(collection(db, 'students'), {
          schoolId:               appUser.schoolId,
          representativeId:       repId,
          representativeEmail:    representativeEmail   || '',
          representativeName:     representativeName    || '',
          representativePhone:    representativePhone   || '',
          representativeCedula:   representativeCedula  || '',
          representativeRelation: representativeRelation|| '',
          fullName,
          grade,
          section,
          schoolYear,
          enrollmentCode,
          createdAt: serverTimestamp(),
        })
        imported++
      } catch { failed++ }
      setProgress(Math.round(((i + 1) / rows.length) * 100))
    }

    setImporting(false)
    setSummary({ imported, failed, skipped })
    setStep('done')
    if (failed === 0 && skipped === 0) toast.success(`${imported} estudiantes importados.`)
    else toast(`${imported} importados · ${skipped} omitidos · ${failed} fallaron`)
  }

  const reset = () => {
    setStep('upload'); setFileName(''); setHeaders([]); setRows([])
    setMapping({}); setSummary(null); setProgress(0)
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Importar Estudiantes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Carga masiva desde Excel o CSV — cualquier formato</p>
        </div>
        <button onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">
          <Download size={15}/> Descargar plantilla de ejemplo
        </button>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 text-sm">
        {(['upload', 'map', 'preview', 'done'] as Step[]).map((s, i) => {
          const labels = ['Cargar archivo', 'Mapear columnas', 'Vista previa', 'Completado']
          const current = step === s
          const done = ['upload','map','preview','done'].indexOf(step) > i
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={clsx(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                current ? 'bg-blue-600 text-white' : done ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'
              )}>
                {done ? '✓' : i + 1}
              </div>
              <span className={clsx('hidden sm:inline', current ? 'text-blue-600 font-semibold' : done ? 'text-green-600' : 'text-slate-400')}>
                {labels[i]}
              </span>
              {i < 3 && <ArrowRight size={14} className="text-slate-300"/>}
            </div>
          )
        })}
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === 'upload' && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={clsx(
            'border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all',
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
          )}>
          <UploadCloud size={44} className="mx-auto text-slate-400 mb-4"/>
          <p className="text-slate-600 font-semibold text-lg mb-1">
            Arrastra tu archivo aquí o haz clic para seleccionar
          </p>
          <p className="text-slate-400 text-sm">Compatible con <strong>.xlsx</strong>, <strong>.xls</strong> y <strong>.csv</strong> — cualquier estructura</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}/>
        </div>
      )}

      {/* ── STEP 2: Map columns ── */}
      {step === 'map' && (
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center gap-3">
            <CheckCircle size={18} className="text-blue-500 shrink-0"/>
            <div>
              <p className="text-blue-800 font-semibold text-sm">{fileName}</p>
              <p className="text-blue-600 text-xs">{rows.length} filas · {headers.length} columnas detectadas</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-800">¿Qué columna es cada campo?</h2>
              <p className="text-slate-500 text-sm mt-0.5">
                El sistema intentó adivinar automáticamente. Corrige donde sea necesario.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {SYSTEM_FIELDS.map(field => {
                const isOk = mapping[field.key] && mapping[field.key] !== '__none__'
                return (
                  <div key={field.key} className="px-5 py-4 flex items-center gap-4 flex-wrap">
                    {/* Field info */}
                    <div className="flex-1 min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">{field.label}</span>
                        {field.required
                          ? <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Requerido</span>
                          : <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Opcional</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{field.hint}</p>
                    </div>

                    {/* Arrow */}
                    <ArrowRight size={16} className="text-slate-300 shrink-0 hidden sm:block"/>

                    {/* Column selector */}
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={mapping[field.key] ?? '__none__'}
                        onChange={e => setMapping(m => ({ ...m, [field.key]: e.target.value }))}
                        className={clsx(
                          'border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]',
                          isOk ? 'border-green-300 bg-green-50' : field.required ? 'border-red-300 bg-red-50' : 'border-slate-200'
                        )}>
                        <option value="__none__">{field.required ? '— Seleccionar columna —' : '— No incluido —'}</option>
                        {headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      {isOk
                        ? <CheckCircle size={16} className="text-green-500 shrink-0"/>
                        : field.required
                          ? <XCircle size={16} className="text-red-400 shrink-0"/>
                          : <span className="w-4"/>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Detected columns list */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">COLUMNAS EN TU ARCHIVO</p>
            <div className="flex flex-wrap gap-2">
              {headers.map(h => {
                const isUsed = Object.values(mapping).includes(h)
                return (
                  <span key={h} className={clsx(
                    'text-xs px-2.5 py-1 rounded-lg font-medium border',
                    isUsed
                      ? 'bg-blue-100 text-blue-700 border-blue-300'
                      : 'bg-white text-slate-400 border-slate-200'
                  )}>
                    {h}
                  </span>
                )
              })}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Las columnas <span className="text-blue-600 font-medium">azules</span> están asignadas a un campo.{' '}
              Las <span className="text-slate-500 font-medium">grises</span> no se importarán —{' '}
              puedes asignarlas arriba usando el selector de cada campo.
            </p>
          </div>

          {missingRequired.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500 shrink-0"/>
              <p className="text-sm text-red-700">
                Faltan campos requeridos: <strong>{missingRequired.map(f => f.label).join(', ')}</strong>
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={reset} className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm hover:bg-slate-50">
              <RefreshCw size={14}/> Cambiar archivo
            </button>
            <button
              onClick={() => setStep('preview')}
              disabled={missingRequired.length > 0}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
              Ver vista previa <ArrowRight size={15}/>
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Preview ── */}
      {step === 'preview' && (
        <div className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500 shrink-0"/>
            <p className="text-sm text-amber-800">
              Mostrando los primeros 5 alumnos. Verifica que los datos se vean correctos antes de importar los <strong>{rows.length}</strong> registros.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 text-sm">Vista previa del mapeo</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 border-b border-blue-100">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-blue-700 font-semibold text-xs">#</th>
                    <th className="px-4 py-2.5 text-left text-blue-700 font-semibold text-xs">NOMBRE COMPLETO</th>
                    <th className="px-4 py-2.5 text-left text-blue-700 font-semibold text-xs">GRADO</th>
                    <th className="px-4 py-2.5 text-left text-blue-700 font-semibold text-xs">SECCIÓN</th>
                    <th className="px-4 py-2.5 text-left text-blue-700 font-semibold text-xs">REPRESENTANTE</th>
                    <th className="px-4 py-2.5 text-left text-blue-700 font-semibold text-xs">EMAIL REP.</th>
                    <th className="px-4 py-2.5 text-left text-blue-700 font-semibold text-xs">TELÉFONO</th>
                    <th className="px-4 py-2.5 text-left text-blue-700 font-semibold text-xs">CÉDULA</th>
                    <th className="px-4 py-2.5 text-left text-blue-700 font-semibold text-xs">PARENTESCO</th>
                    <th className="px-4 py-2.5 text-left text-blue-700 font-semibold text-xs">AÑO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.map((row, i) => {
                    const hasIssue = !row.fullName || !row.grade || !row.section
                    const empty = (v: string) => v || <span className="text-slate-300">—</span>
                    return (
                      <tr key={i} className={hasIssue ? 'bg-red-50' : 'hover:bg-slate-50'}>
                        <td className="px-4 py-2.5 text-slate-400 text-xs">{i + 1}</td>
                        <td className={clsx('px-4 py-2.5 font-medium', row.fullName ? 'text-slate-800' : 'text-red-500 italic')}>
                          {row.fullName || '— vacío —'}
                        </td>
                        <td className={clsx('px-4 py-2.5', row.grade ? 'text-slate-600' : 'text-red-500 italic')}>
                          {row.grade || '— vacío —'}
                        </td>
                        <td className={clsx('px-4 py-2.5', row.section ? 'text-slate-600' : 'text-red-500 italic')}>
                          {row.section || '— vacío —'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 text-xs">{empty(row.representativeName)}</td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">{empty(row.representativeEmail)}</td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">{empty(row.representativePhone)}</td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">{empty(row.representativeCedula)}</td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">{empty(row.representativeRelation)}</td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">{row.schoolYear}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {rows.length > 5 && (
              <div className="px-5 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
                + {rows.length - 5} filas más que no se muestran aquí
              </div>
            )}
          </div>

          {/* Progress bar */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin"/> Importando {rows.length} estudiantes...</span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div className="bg-blue-500 h-3 rounded-full transition-all duration-200" style={{ width: `${progress}%` }}/>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep('map')} disabled={importing}
              className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm hover:bg-slate-50 disabled:opacity-50">
              ← Ajustar mapeo
            </button>
            <button onClick={handleImport} disabled={importing}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {importing
                ? <><Loader2 size={15} className="animate-spin"/> Importando...</>
                : <><UploadCloud size={15}/> Importar {rows.length} estudiantes</>}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Done ── */}
      {step === 'done' && summary && (
        <div className="space-y-5">
          <div className={clsx(
            'rounded-2xl p-8 text-center border',
            summary.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
          )}>
            <div className="text-5xl mb-3">{summary.failed === 0 ? '🎉' : '⚠️'}</div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Importación completada</h2>
            <div className="flex justify-center gap-6 mt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{summary.imported}</p>
                <p className="text-xs text-slate-500 mt-0.5">Importados</p>
              </div>
              {summary.skipped > 0 && (
                <div className="text-center">
                  <p className="text-3xl font-bold text-amber-500">{summary.skipped}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Omitidos (sin datos)</p>
                </div>
              )}
              {summary.failed > 0 && (
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-500">{summary.failed}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Fallaron</p>
                </div>
              )}
            </div>
          </div>

          <button onClick={reset}
            className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-700 py-3 rounded-xl text-sm font-semibold hover:bg-slate-50">
            <RefreshCw size={15}/> Importar otro archivo
          </button>
        </div>
      )}
    </div>
  )
}
