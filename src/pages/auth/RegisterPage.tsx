import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import { UserPlus, GraduationCap } from 'lucide-react'

const DEFAULT_SCHOOL_ID = import.meta.env.VITE_DEFAULT_SCHOOL_ID || 'school_default'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ displayName: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { toast.error('Las contraseñas no coinciden'); return }
    if (form.password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    try {
      await signUp(form.email, form.password, form.displayName, 'representative', DEFAULT_SCHOOL_ID)
      toast.success('Cuenta creada exitosamente')
      navigate('/')
    } catch (err: any) {
      toast.error(err.code === 'auth/email-already-in-use' ? 'Este correo ya está registrado' : 'Error al crear la cuenta')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <GraduationCap size={28} className="text-white"/>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">EduFinance</h1>
          <p className="text-slate-500 text-sm mt-1">Crea tu cuenta de representante</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Registro</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { k: 'displayName', label: 'Nombre completo', type: 'text', placeholder: 'Juan Pérez' },
              { k: 'email', label: 'Correo electrónico', type: 'email', placeholder: 'tu@correo.com' },
              { k: 'password', label: 'Contraseña', type: 'password', placeholder: 'Mínimo 6 caracteres' },
              { k: 'confirmPassword', label: 'Confirmar contraseña', type: 'password', placeholder: 'Repite tu contraseña' },
            ].map(({ k, label, type, placeholder }) => (
              <div key={k}>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">{label}</label>
                <input type={type} required
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={placeholder} value={form[k as keyof typeof form]} onChange={set(k)} />
              </div>
            ))}
            <p className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3">
              Tu cuenta será registrada como <strong>representante</strong>. El administrador puede cambiar tu rol.
            </p>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <UserPlus size={16}/>}
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">
            ¿Ya tienes cuenta? <Link to="/login" className="text-blue-600 font-medium hover:underline">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
