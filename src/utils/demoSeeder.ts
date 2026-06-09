import { db } from '@/services/firebase'
import {
  collection,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { format } from 'date-fns'

export const DEMO_SCHOOL_ID = 'demo_school_2024'

// ─── Static demo data ───────────────────────────────────────────────────────

const STUDENTS = [
  { fullName: 'Valentina Rodríguez Pérez',    grade: '1er', section: 'A', repName: 'Carlos Rodríguez',    repEmail: 'carlos.rodriguez@demo.com',   repPhone: '+58 412-1230001' },
  { fullName: 'Diego Martínez López',          grade: '1er', section: 'A', repName: 'María López',          repEmail: 'maria.lopez@demo.com',        repPhone: '+58 414-2340002' },
  { fullName: 'Sofía García Hernández',        grade: '2do', section: 'B', repName: 'Pedro García',         repEmail: 'pedro.garcia@demo.com',       repPhone: '+58 416-3450003' },
  { fullName: 'Andrés Jiménez Rojas',          grade: '2do', section: 'A', repName: 'Ana Jiménez',          repEmail: 'ana.jimenez@demo.com',        repPhone: '+58 424-4560004' },
  { fullName: 'Isabella Torres Méndez',        grade: '3er', section: 'A', repName: 'Luis Torres',          repEmail: 'luis.torres@demo.com',        repPhone: '+58 412-5670005' },
  { fullName: 'Samuel Flores Castro',          grade: '3er', section: 'B', repName: 'Carmen Castro',        repEmail: 'carmen.castro@demo.com',      repPhone: '+58 414-6780006' },
  { fullName: 'Camila Reyes Vega',             grade: '4to', section: 'A', repName: 'Roberto Vega',         repEmail: 'roberto.vega@demo.com',       repPhone: '+58 416-7890007' },
  { fullName: 'Mateo Vargas Silva',            grade: '5to', section: 'A', repName: 'Elena Silva',          repEmail: 'elena.silva@demo.com',        repPhone: '+58 424-8900008' },
  { fullName: 'Luciana Moreno Castillo',       grade: '4to', section: 'B', repName: 'José Moreno',          repEmail: 'jose.moreno@demo.com',        repPhone: '+58 412-9010009' },
  { fullName: 'Sebastián Gutiérrez Ramos',     grade: '5to', section: 'B', repName: 'Patricia Ramos',       repEmail: 'patricia.ramos@demo.com',     repPhone: '+58 414-0120010' },
]

const TEACHERS = [
  { fullName: 'Prof. Ana Beatriz Salcedo',  email: 'ana.salcedo@demo.com',  subject: 'Matemáticas' },
  { fullName: 'Prof. Ricardo Blanco',       email: 'ricardo.blanco@demo.com', subject: 'Lengua y Literatura' },
  { fullName: 'Prof. Mónica Varela',        email: 'monica.varela@demo.com',  subject: 'Ciencias Naturales' },
]

const SUBJECTS = ['Matemáticas', 'Lengua y Literatura', 'Ciencias Naturales', 'Historia', 'Inglés', 'Educación Física']

// ─── Helper ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function daysFromNow(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

function ts(date: Date) {
  return Timestamp.fromDate(date)
}

// ─── Main seeder ─────────────────────────────────────────────────────────────

export async function seedDemoData(_adminUserId: string): Promise<{
  schoolId: string
  adminEmail: string
  adminPassword: string
  message: string
}> {
  // 1. School document
  await setDoc(doc(db, 'schools', DEMO_SCHOOL_ID), {
    name: 'Unidad Educativa San Simón',
    address: 'Av. Bolívar #45, Caracas',
    phone: '+58 212-5551234',
    city: 'Caracas, Venezuela',
    logoUrl: '',
    settings: {
      currency: 'USD',
      monthlyFee: 80,
      enrollmentFee: 150,
      lateFeeEnabled: true,
      lateFeePercent: 5,
      lateFeeGraceDays: 5,
      currentSchoolYear: '2024-2025',
      grades: ['1er', '2do', '3er', '4to', '5to', '6to'],
      subjects: SUBJECTS,
    },
    billingConfig: {
      enabled: true,
      billingDay: 1,
      dueDay: 10,
      amount: 80,
      currency: 'USD',
    },
    acceptedMethods: ['pago_movil', 'zelle', 'transferencia', 'efectivo'],
    plan: 'pro',
    active: true,
    createdAt: serverTimestamp(),
  })

  // 2. Admin user for demo school
  const adminRef = doc(collection(db, 'users'))
  const adminId = adminRef.id
  await setDoc(adminRef, {
    fullName: 'Directora Carmen López',
    displayName: 'Directora Carmen López',
    email: 'admin@demo-sansimón.com',
    role: 'admin',
    schoolId: DEMO_SCHOOL_ID,
    active: true,
    createdAt: serverTimestamp(),
  })

  // 3. Teacher users
  const teacherIds: string[] = []
  for (const t of TEACHERS) {
    const tRef = doc(collection(db, 'users'))
    teacherIds.push(tRef.id)
    await setDoc(tRef, {
      fullName: t.fullName,
      email: t.email,
      role: 'teacher',
      schoolId: DEMO_SCHOOL_ID,
      subject: t.subject,
      active: true,
      createdAt: serverTimestamp(),
    })
  }

  // 4. Students + representative users
  const studentIds: string[] = []
  const repIds: string[] = []
  for (const s of STUDENTS) {
    // Representative user
    const repRef = doc(collection(db, 'users'))
    repIds.push(repRef.id)
    await setDoc(repRef, {
      fullName: s.repName,
      email: s.repEmail,
      phone: s.repPhone,
      role: 'representative',
      schoolId: DEMO_SCHOOL_ID,
      active: true,
      createdAt: serverTimestamp(),
    })

    // Student
    const sRef = doc(collection(db, 'students'))
    studentIds.push(sRef.id)
    await setDoc(sRef, {
      fullName: s.fullName,
      grade: s.grade,
      section: s.section,
      representativeId: repRef.id,
      representativeName: s.repName,
      representativeEmail: s.repEmail,
      representativePhone: s.repPhone,
      schoolId: DEMO_SCHOOL_ID,
      enrollmentFee: 150,
      monthlyFee: 80,
      balance: 0,
      active: true,
      enrolledAt: ts(daysAgo(90)),
      createdAt: serverTimestamp(),
    })
  }

  // 5. Payments — varied statuses
  const paymentData = [
    // Approved payments (last 3 months)
    { studentIdx: 0, month: 'Octubre 2024',   amount: 80,  status: 'approved', method: 'pago_movil',    daysAgoVal: 65 },
    { studentIdx: 0, month: 'Noviembre 2024',  amount: 80,  status: 'approved', method: 'zelle',         daysAgoVal: 35 },
    { studentIdx: 0, month: 'Diciembre 2024',  amount: 80,  status: 'pending',  method: 'pago_movil',    daysAgoVal: 3  },
    { studentIdx: 1, month: 'Octubre 2024',   amount: 80,  status: 'approved', method: 'transferencia', daysAgoVal: 63 },
    { studentIdx: 1, month: 'Noviembre 2024',  amount: 80,  status: 'approved', method: 'efectivo',      daysAgoVal: 32 },
    { studentIdx: 1, month: 'Diciembre 2024',  amount: 80,  status: 'overdue',  method: 'pago_movil',    daysAgoVal: 12 },
    { studentIdx: 2, month: 'Octubre 2024',   amount: 80,  status: 'approved', method: 'zelle',         daysAgoVal: 62 },
    { studentIdx: 2, month: 'Noviembre 2024',  amount: 80,  status: 'pending',  method: 'pago_movil',    daysAgoVal: 2  },
    { studentIdx: 3, month: 'Octubre 2024',   amount: 80,  status: 'approved', method: 'efectivo',      daysAgoVal: 61 },
    { studentIdx: 3, month: 'Noviembre 2024',  amount: 80,  status: 'overdue',  method: 'transferencia', daysAgoVal: 20 },
    { studentIdx: 4, month: 'Octubre 2024',   amount: 80,  status: 'approved', method: 'pago_movil',    daysAgoVal: 60 },
    { studentIdx: 4, month: 'Noviembre 2024',  amount: 80,  status: 'approved', method: 'pago_movil',    daysAgoVal: 30 },
    { studentIdx: 4, month: 'Diciembre 2024',  amount: 80,  status: 'approved', method: 'zelle',         daysAgoVal: 5  },
    { studentIdx: 5, month: 'Octubre 2024',   amount: 80,  status: 'approved', method: 'transferencia', daysAgoVal: 59 },
    { studentIdx: 5, month: 'Noviembre 2024',  amount: 80,  status: 'overdue',  method: 'efectivo',      daysAgoVal: 25 },
    { studentIdx: 6, month: 'Octubre 2024',   amount: 80,  status: 'approved', method: 'pago_movil',    daysAgoVal: 58 },
    { studentIdx: 6, month: 'Noviembre 2024',  amount: 80,  status: 'approved', method: 'zelle',         daysAgoVal: 28 },
    { studentIdx: 7, month: 'Octubre 2024',   amount: 80,  status: 'approved', method: 'pago_movil',    daysAgoVal: 57 },
    { studentIdx: 7, month: 'Noviembre 2024',  amount: 80,  status: 'pending',  method: 'transferencia', daysAgoVal: 1  },
    { studentIdx: 8, month: 'Octubre 2024',   amount: 80,  status: 'approved', method: 'efectivo',      daysAgoVal: 56 },
    { studentIdx: 8, month: 'Noviembre 2024',  amount: 80,  status: 'overdue',  method: 'pago_movil',    daysAgoVal: 18 },
    { studentIdx: 9, month: 'Octubre 2024',   amount: 80,  status: 'approved', method: 'zelle',         daysAgoVal: 55 },
    { studentIdx: 9, month: 'Noviembre 2024',  amount: 80,  status: 'approved', method: 'pago_movil',    daysAgoVal: 27 },
    // Enrollment fees
    { studentIdx: 0, month: 'Inscripción 2024', amount: 150, status: 'approved', method: 'transferencia', daysAgoVal: 90 },
    { studentIdx: 3, month: 'Inscripción 2024', amount: 150, status: 'approved', method: 'zelle',         daysAgoVal: 88 },
    { studentIdx: 7, month: 'Inscripción 2024', amount: 150, status: 'approved', method: 'pago_movil',    daysAgoVal: 86 },
  ]

  for (const p of paymentData) {
    const student = STUDENTS[p.studentIdx]
    const submittedDate = daysAgo(p.daysAgoVal)
    const reviewedDate = new Date(submittedDate)
    reviewedDate.setHours(reviewedDate.getHours() + 4)
    // dueDate: 10th of the current month for pending/overdue, same as submission for approved
    const dueDate = new Date(submittedDate)
    dueDate.setDate(10)
    const amountPaid = p.status === 'approved' ? p.amount : 0
    const balance = p.amount - amountPaid

    await addDoc(collection(db, 'payments'), {
      schoolId: DEMO_SCHOOL_ID,
      studentId: studentIds[p.studentIdx],
      studentName: student.fullName,
      representativeId: repIds[p.studentIdx],
      representativeName: student.repName,
      month: p.month,
      amount: p.amount,
      amountPaid,
      balance,
      isFractioned: false,
      currency: 'USD',
      method: p.method,
      status: p.status,
      dueDate: ts(dueDate),
      receiptUrl: p.status !== 'overdue' ? 'https://via.placeholder.com/400x600?text=Comprobante' : '',
      notes: p.status === 'overdue' ? 'Pago vencido — sin comprobante recibido' : '',
      submittedAt: ts(submittedDate),
      reviewedAt: p.status === 'approved' ? ts(reviewedDate) : null,
      reviewedBy: p.status === 'approved' ? adminId : null,
      grade: student.grade,
      section: student.section,
      createdAt: ts(submittedDate),
    })
  }

  // 6. Announcements
  const announcements = [
    {
      title: 'Reunión de representantes — 1er Lapso',
      content: 'Se convoca a todos los representantes a la reunión del primer lapso que se realizará el próximo viernes 13 de diciembre en el Aula Magna. Hora: 5:00 PM. Es obligatoria la asistencia de al menos un representante por familia. Se abordarán temas académicos y administrativos del año escolar 2024-2025.',
      author: 'Dirección General',
      daysAgoVal: 10,
      pinned: true,
    },
    {
      title: 'Actualización del menú del comedor escolar',
      content: 'Estimados representantes, les informamos que a partir del lunes próximo el comedor escolar ofrecerá un nuevo menú balanceado. El costo mensual del servicio es de $25 adicionales a la mensualidad regular. Para inscribir a su representado, comuníquese con administración antes del viernes.',
      author: 'Coordinación Administrativa',
      daysAgoVal: 6,
      pinned: false,
    },
    {
      title: 'Cierre administrativo — 20 de diciembre',
      content: 'Les comunicamos que el día viernes 20 de diciembre la administración cerrará a las 12:00 PM por motivo de las festividades navideñas. El último día para cancelar la mensualidad de diciembre sin recargo será el miércoles 18 de diciembre. Felices fiestas a toda la comunidad San Simón.',
      author: 'Dirección General',
      daysAgoVal: 3,
      pinned: true,
    },
    {
      title: 'Entrega de boletines — Primer Lapso',
      content: 'Los boletines del primer lapso ya están disponibles en la plataforma. Los representantes pueden descargarlos directamente desde su panel en la sección "Boletines". Las notas fueron cargadas por cada docente y revisadas por coordinación académica. Ante cualquier discrepancia, comunicarse con la coordinadora Lic. Sofía Herrera.',
      author: 'Coordinación Académica',
      daysAgoVal: 1,
      pinned: false,
    },
  ]

  for (const a of announcements) {
    await addDoc(collection(db, 'announcements'), {
      schoolId: DEMO_SCHOOL_ID,
      title: a.title,
      body: a.content,       // field name used by the app is 'body'
      author: a.author,
      pinned: a.pinned,
      fileUrls: [],
      targetGrades: [],
      readBy: [],
      imageUrl: '',
      createdAt: ts(daysAgo(a.daysAgoVal)),
      updatedAt: ts(daysAgo(a.daysAgoVal)),
    })
  }

  // 7. Notifications
  const notifData = [
    { repIdx: 0, title: 'Pago aprobado', body: 'Tu pago de Noviembre 2024 fue aprobado. ¡Gracias!', type: 'payment_approved', read: true,  daysAgoVal: 35 },
    { repIdx: 1, title: 'Pago aprobado', body: 'Tu pago de Noviembre 2024 fue aprobado.',            type: 'payment_approved', read: true,  daysAgoVal: 32 },
    { repIdx: 2, title: 'Pago pendiente', body: 'Tu comprobante de pago está en revisión.',          type: 'payment_pending',  read: false, daysAgoVal: 2  },
    { repIdx: 3, title: 'Pago vencido',  body: 'El pago de Noviembre 2024 está vencido.',            type: 'payment_overdue',  read: false, daysAgoVal: 8  },
    { repIdx: 4, title: 'Nuevo anuncio', body: 'Reunión de representantes el 13 de diciembre.',      type: 'announcement',     read: true,  daysAgoVal: 10 },
    { repIdx: 5, title: 'Pago vencido',  body: 'El pago de Noviembre 2024 está vencido.',            type: 'payment_overdue',  read: false, daysAgoVal: 5  },
    { repIdx: 7, title: 'Pago pendiente', body: 'Tu comprobante está en revisión.',                  type: 'payment_pending',  read: false, daysAgoVal: 1  },
    { repIdx: 8, title: 'Pago vencido',  body: 'El pago de Noviembre 2024 está vencido.',            type: 'payment_overdue',  read: false, daysAgoVal: 7  },
  ]

  for (const n of notifData) {
    await addDoc(collection(db, 'notifications'), {
      schoolId: DEMO_SCHOOL_ID,
      userId: repIds[n.repIdx],
      title: n.title,
      body: n.body,
      type: n.type,
      read: n.read,
      createdAt: ts(daysAgo(n.daysAgoVal)),
    })
  }

  // 8. Calendar events
  const events = [
    { title: 'Inicio del 2do Lapso',             date: daysFromNow(7),  type: 'academic',      color: '#1d6ff4', description: 'Inicio oficial del segundo lapso académico 2024-2025.' },
    { title: 'Reunión de representantes 1er Lap', date: daysFromNow(5), type: 'meeting',       color: '#06c8f0', description: 'Reunión obligatoria. Aula Magna, 5:00 PM.' },
    { title: 'Día de Navidad — Sin clases',       date: daysFromNow(17), type: 'holiday',      color: '#00e5a0', description: 'Feriado nacional. No hay actividades escolares.' },
    { title: 'Entrega de notas 1er Lapso',        date: daysAgo(1),      type: 'academic',     color: '#a78bfa', description: 'Carga de calificaciones del primer lapso.' },
    { title: 'Simulacro de evacuación',           date: daysFromNow(14), type: 'institutional', color: '#fbbf24', description: 'Simulacro anual de seguridad. Toda la institución.' },
    { title: 'Acto cultural diciembre',           date: daysFromNow(20), type: 'cultural',      color: '#f97316', description: 'Acto cultural de fin de año. Padres y representantes invitados.' },
  ]

  for (const e of events) {
    await addDoc(collection(db, 'events'), {
      schoolId: DEMO_SCHOOL_ID,
      title: e.title,
      date: ts(e.date),
      type: e.type,
      color: e.color,
      description: e.description,
      createdAt: serverTimestamp(),
    })
  }

  // 9. Attendance — last 5 school days
  const attendanceStatuses = ['present', 'present', 'present', 'absent', 'late'] // realistic distribution
  for (let day = 1; day <= 5; day++) {
    // Store date as string 'yyyy-MM-dd' so queries can compare with === correctly
    const dateStr = format(daysAgo(day), 'yyyy-MM-dd')
    for (let si = 0; si < studentIds.length; si++) {
      const statusIdx = (si + day) % attendanceStatuses.length
      await addDoc(collection(db, 'attendance'), {
        schoolId: DEMO_SCHOOL_ID,
        studentId: studentIds[si],
        studentName: STUDENTS[si].fullName,
        grade: STUDENTS[si].grade,
        section: STUDENTS[si].section,
        date: dateStr,        // string 'yyyy-MM-dd' — matches attendance query comparisons
        status: attendanceStatuses[statusIdx],
        notes: attendanceStatuses[statusIdx] === 'absent' ? 'Sin justificación' : '',
        markedBy: teacherIds[0],
        createdAt: ts(daysAgo(day)),
      })
    }
  }

  // 10. Behavior records
  const behaviorData = [
    { studentIdx: 0, type: 'positive', description: 'Excelente participación en clase de Matemáticas. Resolvió problemas complejos en la pizarra.', teacherIdx: 0, daysAgoVal: 8 },
    { studentIdx: 1, type: 'negative', description: 'Interrumpió la clase en tres ocasiones. Se habló con el alumno al finalizar la sesión.',       teacherIdx: 1, daysAgoVal: 5 },
    { studentIdx: 2, type: 'positive', description: 'Ganó el concurso de ciencias del grado. Presentó un proyecto sobre energías renovables.',       teacherIdx: 2, daysAgoVal: 12 },
    { studentIdx: 4, type: 'negative', description: 'No trajo el material escolar por segunda vez esta semana.',                                     teacherIdx: 0, daysAgoVal: 3 },
    { studentIdx: 5, type: 'positive', description: 'Ayudó a un compañero con dificultades sin que se lo pidieran. Actitud solidaria ejemplar.',     teacherIdx: 1, daysAgoVal: 7 },
    { studentIdx: 7, type: 'positive', description: 'Obtuvo el mejor puntaje en la evaluación del 1er lapso de Historia.',                           teacherIdx: 2, daysAgoVal: 6 },
    { studentIdx: 9, type: 'negative', description: 'Llegó tarde a clases tres días consecutivos sin justificación del representante.',              teacherIdx: 0, daysAgoVal: 4 },
  ]

  for (const b of behaviorData) {
    await addDoc(collection(db, 'behavior'), {
      schoolId: DEMO_SCHOOL_ID,
      studentId: studentIds[b.studentIdx],
      studentName: STUDENTS[b.studentIdx].fullName,
      grade: STUDENTS[b.studentIdx].grade,
      section: STUDENTS[b.studentIdx].section,
      type: b.type,
      description: b.description,
      teacherId: teacherIds[b.teacherIdx],
      teacherName: TEACHERS[b.teacherIdx].fullName,
      date: ts(daysAgo(b.daysAgoVal)),
      createdAt: ts(daysAgo(b.daysAgoVal)),
    })
  }

  // 11. Grades — 1st lapso for all students
  const gradeValues: Record<string, number[]> = {
    'Matemáticas':         [18, 15, 17, 14, 19, 16, 18, 20, 13, 17],
    'Lengua y Literatura': [17, 16, 18, 15, 17, 19, 16, 18, 14, 15],
    'Ciencias Naturales':  [16, 17, 15, 18, 18, 17, 19, 16, 15, 18],
    'Historia':            [15, 14, 16, 17, 16, 18, 15, 17, 16, 14],
    'Inglés':              [19, 18, 17, 15, 16, 14, 18, 19, 17, 16],
    'Educación Física':    [20, 19, 20, 18, 19, 20, 19, 18, 20, 17],
  }

  for (let si = 0; si < studentIds.length; si++) {
    for (const [subject, values] of Object.entries(gradeValues)) {
      await addDoc(collection(db, 'grades'), {
        schoolId: DEMO_SCHOOL_ID,
        studentId: studentIds[si],
        studentName: STUDENTS[si].fullName,
        grade: STUDENTS[si].grade,
        section: STUDENTS[si].section,
        subject,
        lapso: '1',
        score: values[si],
        maxScore: 20,
        teacherId: teacherIds[0],
        schoolYear: '2024-2025',
        createdAt: ts(daysAgo(2)),
        updatedAt: ts(daysAgo(2)),
      })
    }
  }

  return {
    schoolId: DEMO_SCHOOL_ID,
    adminEmail: 'admin@demo-sansimón.com',
    adminPassword: 'Demo2024!',
    message: 'Demo creado exitosamente',
  }
}

// ─── Delete demo data ─────────────────────────────────────────────────────────

async function deleteCollection(collectionName: string, fieldPath: string, value: string) {
  const q = query(collection(db, collectionName), where(fieldPath, '==', value))
  const snap = await getDocs(q)
  const batchSize = 400
  let batch = writeBatch(db)
  let count = 0
  for (const d of snap.docs) {
    batch.delete(d.ref)
    count++
    if (count === batchSize) {
      await batch.commit()
      batch = writeBatch(db)
      count = 0
    }
  }
  if (count > 0) await batch.commit()
}

export async function deleteDemoData(): Promise<void> {
  const collections = [
    'payments', 'announcements', 'notifications',
    'events', 'attendance', 'behavior', 'grades',
    'students',
  ]
  for (const col of collections) {
    await deleteCollection(col, 'schoolId', DEMO_SCHOOL_ID)
  }
  // Users
  await deleteCollection('users', 'schoolId', DEMO_SCHOOL_ID)
  // School doc
  const batch = writeBatch(db)
  batch.delete(doc(db, 'schools', DEMO_SCHOOL_ID))
  await batch.commit()
}
