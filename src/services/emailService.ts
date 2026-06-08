import {
  collection, addDoc, getDocs, updateDoc, doc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

export interface EmailJob {
  id?: string
  to: string
  subject: string
  type: 'payment_reminder' | 'payment_approved' | 'payment_rejected' | 'announcement' | 'welcome'
  data: Record<string, any>
  schoolId: string
  status: 'pending' | 'sent' | 'failed'
  createdAt: any
}

export const queueEmail = async (job: Omit<EmailJob, 'id' | 'status' | 'createdAt'>) => {
  await addDoc(collection(db, 'emailQueue'), {
    ...job,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
}

export const getEmailQueue = async (schoolId: string): Promise<EmailJob[]> => {
  const q = query(
    collection(db, 'emailQueue'),
    where('schoolId', '==', schoolId),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as EmailJob))
}

export const markEmailSent = async (emailId: string) => {
  await updateDoc(doc(db, 'emailQueue', emailId), { status: 'sent' })
}

export const markEmailFailed = async (emailId: string) => {
  await updateDoc(doc(db, 'emailQueue', emailId), { status: 'failed' })
}
