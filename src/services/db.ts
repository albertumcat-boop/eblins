import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, onSnapshot, increment,
} from 'firebase/firestore'
import { db } from './firebase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { AppUser, Student, Payment, Message, Announcement, Notification, School } from '@/types'

const fromDoc = <T>(snap: any): T => ({ id: snap.id, ...snap.data() } as T)

export const getSchool = async (schoolId: string) => {
  const s = await getDoc(doc(db, 'schools', schoolId)); return s.exists() ? fromDoc<School>(s) : null
}
export const updateSchoolSettings = (schoolId: string, settings: any) =>
  updateDoc(doc(db, 'schools', schoolId), { settings })

export const getUser = async (uid: string) => {
  const s = await getDoc(doc(db, 'users', uid)); return s.exists() ? fromDoc<AppUser>(s) : null
}
export const getUsersBySchool = async (schoolId: string) => {
  const q = query(collection(db, 'users'), where('schoolId', '==', schoolId))
  return (await getDocs(q)).docs.map(d => fromDoc<AppUser>(d))
}
export const updateUserRole = (uid: string, role: string, schoolId: string) =>
  updateDoc(doc(db, 'users', uid), { role, schoolId })

export const createStudent = async (data: Omit<Student, 'id' | 'createdAt'>) => {
  const r = await addDoc(collection(db, 'students'), { ...data, createdAt: serverTimestamp() })
  return r.id
}
export const getStudent = async (id: string) => {
  const s = await getDoc(doc(db, 'students', id)); return s.exists() ? fromDoc<Student>(s) : null
}
export const getStudentsByRepresentative = async (repId: string) => {
  const q = query(collection(db, 'students'), where('representativeId', '==', repId))
  return (await getDocs(q)).docs.map(d => fromDoc<Student>(d))
}
export const getStudentsBySchool = async (schoolId: string) => {
  const q = query(collection(db, 'students'), where('schoolId', '==', schoolId))
  return (await getDocs(q)).docs.map(d => fromDoc<Student>(d))
}
export const updateStudent = (id: string, data: Partial<Student>) =>
  updateDoc(doc(db, 'students', id), data)

export const createPayment = async (data: Omit<Payment, 'id' | 'createdAt'>) => {
  const r = await addDoc(collection(db, 'payments'), {
    ...data, status: 'pending', amountPaid: 0, balance: data.amount, createdAt: serverTimestamp()
  })
  return r.id
}
export const getPaymentsByStudent = async (studentId: string) => {
  const q = query(collection(db, 'payments'), where('studentId', '==', studentId), orderBy('createdAt', 'desc'))
  return (await getDocs(q)).docs.map(d => fromDoc<Payment>(d))
}
export const getPaymentsBySchool = async (schoolId: string, lim = 500) => {
  const q = query(collection(db, 'payments'), where('schoolId', '==', schoolId), orderBy('createdAt', 'desc'), limit(lim))
  return (await getDocs(q)).docs.map(d => fromDoc<Payment>(d))
}
export const getPendingPayments = async (schoolId: string) => {
  const q = query(collection(db, 'payments'),
    where('schoolId', '==', schoolId), where('status', '==', 'in_review'), orderBy('createdAt', 'asc'))
  return (await getDocs(q)).docs.map(d => fromDoc<Payment>(d))
}
export const submitPaymentReceipt = (paymentId: string, receiptUrl: string, receiptType: string, amountPaid: number) =>
  updateDoc(doc(db, 'payments', paymentId), {
    receiptUrl, receiptType, amountPaid: increment(amountPaid),
    balance: increment(-amountPaid), status: 'in_review', paidAt: serverTimestamp()
  })
export const approvePayment = (paymentId: string, adminId: string) =>
  updateDoc(doc(db, 'payments', paymentId), { status: 'approved', approvedBy: adminId, approvedAt: serverTimestamp() })
export const rejectPayment = (paymentId: string, reason: string) =>
  updateDoc(doc(db, 'payments', paymentId), {
    status: 'rejected', rejectionReason: reason, receiptUrl: null, amountPaid: 0
  })
export const editPaymentAmount = async (paymentId: string, newAmount: number) => {
  const s = await getDoc(doc(db, 'payments', paymentId))
  if (!s.exists()) return
  const p = s.data() as Payment
  await updateDoc(doc(db, 'payments', paymentId), { amount: newAmount, balance: newAmount - (p.amountPaid || 0) })
}

export const sendMessage = async (data: Omit<Message, 'id' | 'createdAt'>) => {
  const r = await addDoc(collection(db, 'messages'), { ...data, createdAt: serverTimestamp() }); return r.id
}
export const getMessagesBySchool = async (schoolId: string) => {
  const q = query(collection(db, 'messages'), where('schoolId', '==', schoolId), orderBy('createdAt', 'desc'))
  return (await getDocs(q)).docs.map(d => fromDoc<Message>(d))
}
export const getMessagesByUser = async (userId: string) => {
  const q = query(collection(db, 'messages'), where('fromUserId', '==', userId), orderBy('createdAt', 'desc'))
  return (await getDocs(q)).docs.map(d => fromDoc<Message>(d))
}
export const markMessageRead = (id: string) => updateDoc(doc(db, 'messages', id), { readByAdmin: true })
export const closeMessage = (id: string) => updateDoc(doc(db, 'messages', id), { status: 'closed' })

export const createAnnouncement = async (data: Omit<Announcement, 'id' | 'createdAt' | 'readBy'>) => {
  const r = await addDoc(collection(db, 'announcements'), { ...data, readBy: [], createdAt: serverTimestamp() }); return r.id
}
export const getAnnouncementsBySchool = async (schoolId: string) => {
  const q = query(collection(db, 'announcements'), where('schoolId', '==', schoolId), orderBy('createdAt', 'desc'), limit(50))
  return (await getDocs(q)).docs.map(d => fromDoc<Announcement>(d))
}
export const markAnnouncementRead = async (id: string, repId: string) => {
  const ref = doc(db, 'announcements', id)
  const s = await getDoc(ref)
  if (!s.exists()) return
  const cur: string[] = s.data().readBy || []
  if (!cur.includes(repId)) await updateDoc(ref, { readBy: [...cur, repId] })
}

export const createNotification = (data: Omit<Notification, 'id' | 'createdAt'>) =>
  addDoc(collection(db, 'notifications'), { ...data, read: false, createdAt: serverTimestamp() })
export const getNotificationsByUser = async (userId: string) => {
  const q = query(collection(db, 'notifications'),
    where('userId', '==', userId), where('read', '==', false), orderBy('createdAt', 'desc'), limit(20))
  return (await getDocs(q)).docs.map(d => fromDoc<Notification>(d))
}
export const markNotificationRead = (id: string) => updateDoc(doc(db, 'notifications', id), { read: true })

export const subscribeToPayments = (studentId: string, cb: (p: Payment[]) => void) =>
  onSnapshot(query(collection(db, 'payments'), where('studentId', '==', studentId), orderBy('createdAt', 'desc')),
    s => cb(s.docs.map(d => fromDoc<Payment>(d))))

export const subscribeToNotifications = (userId: string, cb: (n: Notification[]) => void) =>
  onSnapshot(query(collection(db, 'notifications'),
    where('userId', '==', userId), where('read', '==', false), orderBy('createdAt', 'desc')),
    s => cb(s.docs.map(d => fromDoc<Notification>(d))))

export const generateMonthlyPayments = async (schoolId: string) => {
  const now = new Date()
  const monthLabel = format(now, 'MMMM yyyy', { locale: es })
  const monthKey = format(now, 'yyyy-MM')
  const school = await getSchool(schoolId)
  if (!school) return
  const billing = (school as any).billingConfig
  if (!billing?.enabled) return
  const today = now.getDate()
  if (today < billing.billingDay) return
  const students = await getStudentsBySchool(schoolId)
  for (const student of students) {
    const q = query(collection(db, 'payments'),
      where('studentId', '==', student.id),
      where('monthKey', '==', monthKey),
      where('type', '==', 'monthly'))
    const existing = await getDocs(q)
    if (!existing.empty) continue
    const rep = await getDoc(doc(db, 'users', student.representativeId))
    if (!rep.exists()) continue
    await addDoc(collection(db, 'payments'), {
      studentId: student.id, schoolId,
      representativeId: student.representativeId,
      type: 'monthly',
      description: `${billing.description || 'Mensualidad'} ${monthLabel}`,
      monthLabel: `${billing.description || 'Mensualidad'} ${monthLabel}`,
      monthKey, amount: billing.amount, amountPaid: 0, balance: billing.amount,
      currency: billing.currency || 'USD', status: 'pending', isFractioned: false,
      dueDate: new Date(now.getFullYear(), now.getMonth(), billing.dueDay || 15),
      createdAt: serverTimestamp(),
    })
  }
}

export const checkAndCreatePaymentReminders = async (schoolId: string, userId: string) => {
  const now = new Date()
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const q = query(collection(db, 'payments'),
    where('schoolId', '==', schoolId),
    where('representativeId', '==', userId),
    where('status', '==', 'pending'))
  const payments = await getDocs(q)
  for (const p of payments.docs) {
    const data = p.data()
    if (!data.dueDate) continue
    const due = data.dueDate.toDate ? data.dueDate.toDate() : new Date(data.dueDate)
    if (due <= in3days && due >= now) {
      const existingQ = query(collection(db, 'notifications'),
        where('relatedId', '==', p.id), where('type', '==', 'payment'), where('userId', '==', userId))
      const existing = await getDocs(existingQ)
      if (!existing.empty) continue
      await addDoc(collection(db, 'notifications'), {
        userId, schoolId, title: '⚠️ Pago próximo a vencer',
        body: `El pago "${data.description || data.monthLabel}" vence el ${format(due, "d 'de' MMMM", { locale: es })}`,
        type: 'payment', relatedId: p.id, read: false, createdAt: serverTimestamp(),
      })
    }
    if (due < now) {
      const existingQ = query(collection(db, 'notifications'),
        where('relatedId', '==', p.id), where('title', '==', '🔴 Pago vencido'), where('userId', '==', userId))
      const existing = await getDocs(existingQ)
      if (!existing.empty) continue
      await addDoc(collection(db, 'notifications'), {
        userId, schoolId, title: '🔴 Pago vencido',
        body: `El pago "${data.description || data.monthLabel}" venció el ${format(due, "d 'de' MMMM", { locale: es })}`,
        type: 'payment', relatedId: p.id, read: false, createdAt: serverTimestamp(),
      })
    }
  }
}

export const createAuditLog = async (data: {
  schoolId: string; action: string; description: string
  performedBy: string; performedByName: string; metadata?: any
}) => {
  await addDoc(collection(db, 'auditLogs'), { ...data, createdAt: serverTimestamp() })
}

// ── EVENTOS / CALENDARIO ──────────────────────────────────────────
export const createEvent = (data: any) =>
  addDoc(collection(db, 'events'), { ...data, createdAt: serverTimestamp() })
export const getEventsBySchool = async (schoolId: string) => {
  const q = query(collection(db, 'events'), where('schoolId', '==', schoolId), orderBy('date', 'asc'))
  return (await getDocs(q)).docs.map(d => ({ id: d.id, ...d.data() }))
}
export const deleteEvent = (id: string) => deleteDoc(doc(db, 'events', id))

// ── TAREAS ────────────────────────────────────────────────────────
export const createTask = (data: any) =>
  addDoc(collection(db, 'tasks'), { ...data, createdAt: serverTimestamp() })
export const getTasksBySchool = async (schoolId: string) => {
  const q = query(collection(db, 'tasks'), where('schoolId', '==', schoolId), orderBy('dueDate', 'asc'))
  return (await getDocs(q)).docs.map(d => ({ id: d.id, ...d.data() }))
}
export const getTasksByGrade = async (schoolId: string, grade: string, section: string) => {
  const q = query(collection(db, 'tasks'),
    where('schoolId', '==', schoolId),
    where('grade', '==', grade),
    where('section', '==', section),
    orderBy('dueDate', 'asc'))
  return (await getDocs(q)).docs.map(d => ({ id: d.id, ...d.data() }))
}
export const deleteTask = (id: string) => deleteDoc(doc(db, 'tasks', id))

// ── HORARIOS ──────────────────────────────────────────────────────
export const saveSchedule = async (schoolId: string, grade: string, section: string, content: string) => {
  const q = query(collection(db, 'schedules'),
    where('schoolId', '==', schoolId), where('grade', '==', grade), where('section', '==', section))
  const existing = await getDocs(q)
  if (!existing.empty) {
    await updateDoc(doc(db, 'schedules', existing.docs[0].id), { content, updatedAt: serverTimestamp() })
  } else {
    await addDoc(collection(db, 'schedules'), { schoolId, grade, section, content, createdAt: serverTimestamp() })
  }
}
export const getSchedule = async (schoolId: string, grade: string, section: string) => {
  const q = query(collection(db, 'schedules'),
    where('schoolId', '==', schoolId), where('grade', '==', grade), where('section', '==', section))
  const snap = await getDocs(q)
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }
}
export const getAllSchedules = async (schoolId: string) => {
  const q = query(collection(db, 'schedules'), where('schoolId', '==', schoolId))
  return (await getDocs(q)).docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── ÚTILES ESCOLARES ──────────────────────────────────────────────
export const saveSupplies = async (schoolId: string, grade: string, data: any) => {
  const q = query(collection(db, 'supplies'), where('schoolId', '==', schoolId), where('grade', '==', grade))
  const existing = await getDocs(q)
  if (!existing.empty) {
    await updateDoc(doc(db, 'supplies', existing.docs[0].id), { ...data, updatedAt: serverTimestamp() })
  } else {
    await addDoc(collection(db, 'supplies'), { schoolId, grade, ...data, createdAt: serverTimestamp() })
  }
}
export const getSuppliesByGrade = async (schoolId: string, grade: string) => {
  const q = query(collection(db, 'supplies'), where('schoolId', '==', schoolId), where('grade', '==', grade))
  const snap = await getDocs(q)
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }
}
export const getAllSupplies = async (schoolId: string) => {
  const q = query(collection(db, 'supplies'), where('schoolId', '==', schoolId))
  return (await getDocs(q)).docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── ASAMBLEAS VIRTUALES ───────────────────────────────────────────
export const createMeeting = (data: any) =>
  addDoc(collection(db, 'meetings'), { ...data, createdAt: serverTimestamp() })
export const getMeetingsBySchool = async (schoolId: string) => {
  const q = query(collection(db, 'meetings'), where('schoolId', '==', schoolId), orderBy('date', 'desc'))
  return (await getDocs(q)).docs.map(d => ({ id: d.id, ...d.data() }))
}
export const deleteMeeting = (id: string) => deleteDoc(doc(db, 'meetings', id))

export const applyLateFees = async (schoolId: string) => {
  const school = await getSchool(schoolId)
  if (!school) return
  const settings = school.settings
  if (!settings?.lateFeeEnabled) return

  const now = new Date()
  const graceDays = settings.lateFeeGraceDays ?? 0
  const feePercent = settings.lateFeePercent ?? 0

  const q = query(
    collection(db, 'payments'),
    where('schoolId', '==', schoolId),
    where('status', '==', 'pending'),
  )
  const snap = await getDocs(q)

  for (const d of snap.docs) {
    const data = d.data()
    if (data.lateFeeApplied) continue
    if (!data.dueDate) continue

    const due: Date = data.dueDate.toDate ? data.dueDate.toDate() : new Date(data.dueDate)
    const graceCutoff = new Date(due.getTime() + graceDays * 24 * 60 * 60 * 1000)

    if (now <= graceCutoff) continue

    const baseAmount: number = data.amount ?? 0
    const lateFeeAmount = Math.round(baseAmount * (feePercent / 100) * 100) / 100
    const newAmount = baseAmount + lateFeeAmount

    await updateDoc(doc(db, 'payments', d.id), {
      amount: newAmount,
      balance: newAmount - (data.amountPaid ?? 0),
      lateFeeApplied: true,
      lateFeeAmount,
    })
  }
}
