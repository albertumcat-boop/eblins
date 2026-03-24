export type UserRole = 'admin' | 'representative' | 'teacher'
export type PaymentStatus = 'pending' | 'in_review' | 'approved' | 'rejected'
export type PaymentType = 'monthly' | 'enrollment' | 'additional'
export type MessageCategory = 'payment_query' | 'administrative' | 'general' | 'complaint'

export interface School {
  id: string; name: string; logoUrl?: string; address?: string
  settings: SchoolSettings; createdAt: Date
}
export interface SchoolSettings {
  currency: string; lateFeeEnabled: boolean; lateFeePercent: number
  lateFeeGraceDays: number; monthlyFee: number; enrollmentFee: number
  currentSchoolYear: string
}
export interface AppUser {
  id: string; schoolId: string; email: string; displayName: string
  photoURL?: string; role: UserRole; phone?: string; createdAt: Date; lastLogin?: Date
}
export interface Student {
  id: string; schoolId: string; representativeId: string; enrollmentCode: string
  fullName: string; grade: string; section: string; schoolYear: string
  qrCodeUrl?: string; photoURL?: string; createdAt: Date
}
export interface Payment {
  id: string; studentId: string; schoolId: string; representativeId: string
  type: PaymentType; description: string; amount: number; amountPaid: number
  balance: number; status: PaymentStatus; receiptUrl?: string; receiptType?: 'image' | 'pdf'
  rejectionReason?: string; isFractioned: boolean; dueDate: Date; paidAt?: Date
  approvedBy?: string; createdAt: Date; monthLabel?: string
}
export interface PaymentInstallment {
  id: string; paymentId: string; studentId: string; amount: number; amountPaid: number
  status: PaymentStatus; receiptUrl?: string; dueDate: Date; paidAt?: Date; createdAt: Date
}
export interface DebtConfig {
  id: string; studentId: string; schoolId: string; type: PaymentType
  description: string; amount: number; lateFeeEnabled: boolean; lateFeePercent: number
  dueDay: number; active: boolean
}
export interface Message {
  id: string; schoolId: string; fromUserId: string; fromUserName: string
  category: MessageCategory; subject: string; body: string; attachmentUrl?: string
  status: 'open' | 'closed'; readByAdmin: boolean; createdAt: Date
}
export interface Announcement {
  id: string; schoolId: string; teacherId: string; teacherName: string
  title: string; body: string; targetGrades?: string[]; fileUrls: string[]
  readBy: string[]; createdAt: Date
}
export interface Notification {
  id: string; userId: string; schoolId: string; title: string; body: string
  type: 'payment' | 'message' | 'announcement' | 'system'; relatedId?: string
  read: boolean; createdAt: Date
}
