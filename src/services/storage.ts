import imageCompression from 'browser-image-compression'

const CLOUD_NAME = 'dsu0vdcvx'
const UPLOAD_PRESET = 'eblins_uploads'
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`
const IMG_OPTS = { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true }

export async function uploadToCloudinaryRaw(
  file: File, folder: string, onProgress?: (pct: number) => void
): Promise<string> {
  return uploadToCloudinary(file, folder, onProgress)
}

async function uploadToCloudinary(
  file: File,
  folder: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', UPLOAD_URL)
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress?.(Math.round(e.loaded / e.total * 100))
    }
    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText).secure_url as string)
      } else {
        reject(new Error(`Cloudinary error: ${xhr.responseText}`))
      }
    }
    xhr.onerror = () => reject(new Error('Network error uploading file'))
    xhr.send(formData)
  })
}

export async function uploadReceipt(
  file: File, schoolId: string, studentId: string, paymentId: string,
  onProgress?: (pct: number) => void
): Promise<{ url: string; type: 'image' | 'pdf' }> {
  const type: 'image' | 'pdf' = file.type.startsWith('image/') ? 'image' : 'pdf'
  const upload = type === 'image' ? await imageCompression(file, IMG_OPTS) : file
  const folder = `eblins/receipts/${schoolId}/${studentId}`
  const url = await uploadToCloudinary(upload, folder, onProgress)
  return { url, type }
}

export async function uploadAnnouncementFile(
  file: File, schoolId: string, teacherId: string, onProgress?: (pct: number) => void
): Promise<string> {
  const upload = file.type.startsWith('image/') ? await imageCompression(file, IMG_OPTS) : file
  const folder = `eblins/announcements/${schoolId}/${teacherId}`
  return uploadToCloudinary(upload, folder, onProgress)
}

export async function uploadStudentPhoto(
  file: File, schoolId: string, onProgress?: (pct: number) => void
): Promise<string> {
  const upload = await imageCompression(file, IMG_OPTS)
  const folder = `eblins/students/${schoolId}`
  return uploadToCloudinary(upload, folder, onProgress)
}

export async function uploadSchoolLogo(
  file: File, schoolId: string, onProgress?: (pct: number) => void
): Promise<string> {
  const upload = await imageCompression(file, IMG_OPTS)
  const folder = `eblins/schools/${schoolId}`
  return uploadToCloudinary(upload, folder, onProgress)
}
