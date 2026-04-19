import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, onSnapshot, increment,
} from 'firebase/firestore'
import { db } from './firebase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { AppUser, Student, Payment, PaymentInstallment, Message, Announcement, Notification, School } from '@/types'

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
export const getPaymentsBySchool = async (schoolId: string, lim = 100) => {
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
      studentId:        student.id,
      schoolId,
      representativeId: student.representativeId,
      type:             'monthly',
      description:      `${billing.description || 'Mensualidad'} ${monthLabel}`,
      monthLabel:       `${billing.description || 'Mensualidad'} ${monthLabel}`,
      monthKey,
      amount:           billing.amount,
      amountPaid:       0,
      balance:          billing.amount,
      currency:         billing.currency || 'USD',
      status:           'pending',
      isFractioned:     false,
      dueDate:          new Date(now.getFullYear(), now.getMonth(), billing.dueDay || 15),
      createdAt:        serverTimestamp(),
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
  schoolId: string
  action: string
  description: string
  performedBy: string
  performedByName: string
  metadata?: any
}) => {
  await addDoc(collection(db, 'auditLogs'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}
