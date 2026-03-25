import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/services/firebase'
import toast from 'react-hot-toast'
import { Save, User } from 'lucide-react'

export default function RepresentativeProfile() {
  const { appUser } = useAuth()
  const [form, setForm] = useState({
    displayName: appUser?.displayName || '',
    phone: (appUser as any)?.phone || '',
    cedula: (appUser as any)?.cedula || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!appUser) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', appUser.id), {
        displayName: form.displayName,
        phone: form.phone,
        cedula: form.cedula,
      })
      toast.success('Datos actualizados correctamente')
    } catch {
      toast.error('Error al guardar')
    } finally { setSaving(false) }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-5 max-w-lg">
      <h1 className="text-2xl font-bold text-slate-800">Mi Perfil</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
            {appUser?.displayName?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-800">{appUser?.displayName}</p>
            <p className="text-sm text-slate-500">{appUser?.email}</p>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Representante</span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Nombre completo</label>
          <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.displayName} onChange={set('displayName')}/>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Cédula de identidad</label>
          <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="V-12345678" value={form.cedula} onChange={set('cedula')}/>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Teléfono</label>
          <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0414-1234567" value={form.phone} onChange={set('phone')}/>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Correo electrónico</label>
          <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            value={appUser?.email} disabled/>
          <p className="text-xs text-slate-400 mt-1">El correo no se puede cambiar</p>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          <Save size={16}/>{saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
