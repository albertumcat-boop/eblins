export interface StudentCSVRow {
  fullName: string
  grade: string
  section: string
  representativeEmail: string
}

export interface ParseCSVResult {
  valid: StudentCSVRow[]
  errors: string[]
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Parsea CSV con columnas: nombre_completo, grado, seccion, representante_email
 * Retorna array de objetos validados o errores por fila.
 */
export function parseStudentsCSV(csvText: string): ParseCSVResult {
  const valid: StudentCSVRow[] = []
  const errors: string[] = []

  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length === 0) {
    errors.push('El archivo está vacío.')
    return { valid, errors }
  }

  // Parse header
  const headerLine = lines[0].trim()
  if (!headerLine) {
    errors.push('El archivo no tiene encabezados.')
    return { valid, errors }
  }

  const headers = headerLine.split(',').map(h => h.trim().toLowerCase())
  const requiredColumns = ['nombre_completo', 'grado', 'seccion', 'representante_email']

  for (const col of requiredColumns) {
    if (!headers.includes(col)) {
      errors.push(`Columna requerida faltante: "${col}". Se esperan: ${requiredColumns.join(', ')}`)
    }
  }
  if (errors.length > 0) return { valid, errors }

  const idxName = headers.indexOf('nombre_completo')
  const idxGrade = headers.indexOf('grado')
  const idxSection = headers.indexOf('seccion')
  const idxEmail = headers.indexOf('representante_email')

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = parseCSVLine(line)
    const rowNum = i + 1

    const fullName = cols[idxName]?.trim() ?? ''
    const grade = cols[idxGrade]?.trim() ?? ''
    const section = cols[idxSection]?.trim() ?? ''
    const representativeEmail = cols[idxEmail]?.trim() ?? ''

    const rowErrors: string[] = []

    if (!fullName) rowErrors.push('nombre_completo es requerido')
    if (!grade) rowErrors.push('grado es requerido')
    if (!section) rowErrors.push('seccion es requerida')
    if (!representativeEmail) {
      rowErrors.push('representante_email es requerido')
    } else if (!EMAIL_RE.test(representativeEmail)) {
      rowErrors.push(`representante_email inválido: "${representativeEmail}"`)
    }

    if (rowErrors.length > 0) {
      errors.push(`Fila ${rowNum}: ${rowErrors.join('; ')}`)
    } else {
      valid.push({ fullName, grade, section, representativeEmail })
    }
  }

  return { valid, errors }
}

/** Maneja campos entre comillas dobles y comas dentro de valores. */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}
