import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, onSnapshot, increment,
} from 'firebase/firestore'
import { db } from './firebase'
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
