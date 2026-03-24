import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import imageCompression from 'browser-image-compression'
import { storage } from './firebase'

const OPTS = { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true }

export async function uploadReceipt(
  file: File, schoolId: string, studentId: string, paymentId: string,
  onProgress?: (pct: number) => void
): Promise<{ url: string; type: 'image' | 'pdf' }> {
  let upload = file
  let type: 'image' | 'pdf' = 'pdf'
  if (file.type.startsWith('image/')) { type = 'image'; upload = await imageCompression(file, OPTS) }
  const ext = file.name.split('.').pop()
  const path = `receipts/${schoolId}/${studentId}/${paymentId}-${Date.now()}.${ext}`
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(storage, path), upload)
    task.on('state_changed',
      s => onProgress?.(Math.round(s.bytesTransferred / s.totalBytes * 100)),
      reject,
      async () => resolve({ url: await getDownloadURL(task.snapshot.ref), type })
    )
  })
}

export async function uploadAnnouncementFile(
  file: File, schoolId: string, teacherId: string, onProgress?: (pct: number) => void
): Promise<string> {
  const upload = file.type.startsWith('image/') ? await imageCompression(file, OPTS) : file
  const path = `announcements/${schoolId}/${teacherId}/${Date.now()}-${file.name}`
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(storage, path), upload)
    task.on('state_changed',
      s => onProgress?.(Math.round(s.bytesTransferred / s.totalBytes * 100)),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref))
    )
  })
}
