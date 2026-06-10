import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

const DEFAULT_SCHOOL_ID = import.meta.env.VITE_DEFAULT_SCHOOL_ID || 'school_default'

type Mode = null | 'admin' | 'representative' | 'teacher'

interface FormState {
  displayName: string
  email: string
  password: string
  confirmPassword: string
  enrollmentCode: string
}

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>(null)
  const [form, setForm] = useState<FormState>({ displayName: '', email: '', password: '', confirmPassword: '', enrollmentCode: '' })
  const [loading, setLoading] = useState(false)

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { toast.error('Las contraseñas no coinciden'); return }
    if (form.password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return }
    if ((mode === 'representative' || mode === 'teacher') && !form.enrollmentCode.trim()) {
      toast.error('El código del colegio es requerido'); return
    }
    setLoading(true)
    try {
      if (mode === 'admin') {
        await signUp(form.email, form.password, form.displayName, 'admin', 'pending')
        toast.success('Cuenta creada. Configura tu colegio.')
        navigate('/onboarding')
      } else {
        await signUp(form.email, form.password, form.displayName, mode as string, form.enrollmentCode.trim())
        toast.success('Solicitud enviada. El administrador aprobará tu cuenta.')
        navigate('/')
      }
    } catch (err: any) {
      toast.error(err.code === 'auth/email-already-in-use' ? 'Este correo ya está registrado' : 'Error al crear la cuenta')
    } finally { setLoading(false) }
  }

  const MODES = [
    {
      key: 'admin' as Mode,
      emoji: '🏫',
      badge: 'Para colegios',
      badgeBg: 'rgba(59,130,246,0.2)',
      badgeBorder: 'rgba(59,130,246,0.4)',
      badgeColor: '#60a5fa',
      cardBg: 'rgba(59,130,246,0.06)',
      cardBorder: 'rgba(59,130,246,0.3)',
      title: 'Soy administrador',
      desc: 'Quiero registrar mi institución y gestionar pagos y usuarios',
    },
    {
      key: 'teacher' as Mode,
      emoji: '👨‍🏫',
      badge: 'Para docentes',
      badgeBg: 'rgba(139,92,246,0.2)',
      badgeBorder: 'rgba(139,92,246,0.4)',
      badgeColor: '#a78bfa',
      cardBg: 'rgba(139,92,246,0.06)',
      cardBorder: 'rgba(139,92,246,0.25)',
      title: 'Soy docente',
      desc: 'Soy profesor y quiero registrar asistencia, notas y actividades',
    },
    {
      key: 'representative' as Mode,
      emoji: '👨‍👩‍👧',
      badge: 'Para representantes',
      badgeBg: 'rgba(16,185,129,0.15)',
      badgeBorder: 'rgba(16,185,129,0.35)',
      badgeColor: '#34d399',
      cardBg: 'rgba(16,185,129,0.06)',
      cardBorder: 'rgba(16,185,129,0.25)',
      title: 'Soy representante',
      desc: 'Soy padre o representante y quiero hacer seguimiento de mis hijos',
    },
  ]

  const selected = MODES.find(m => m.key === mode)

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .reg-fade { animation: fadeIn 0.3s ease both; }
        .mode-card { background: rgba(255,255,255,0.04); border: 2px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 24px 20px; cursor: pointer; transition: all 0.2s; text-align: center; }
        .mode-card:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); transform: translateY(-2px); }
        .reg-input { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); color: #f1f5f9; border-radius: 12px; padding: 11px 16px; width: 100%; font-size: 14px; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
        .reg-input:focus { border-color: #3b82f6; }
        .reg-input::placeholder { color: rgba(255,255,255,0.28); }
        .reg-label { color: rgba(255,255,255,0.65); font-size: 13px; font-weight: 500; margin-bottom: 6px; display: block; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#050d1a', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: mode ? 480 : 720 }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎓</div>
              <span style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 22, letterSpacing: '-0.5px' }}>EduFinance</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>
              {mode === null ? 'Selecciona cómo quieres registrarte' : mode === 'admin' ? 'Registra tu colegio' : mode === 'teacher' ? 'Registro de docente' : 'Registro de representante'}
            </p>
          </div>

          {/* Mode selection — 3 cards */}
          {mode === null && (
            <div className="reg-fade" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {MODES.map(m => (
                <div key={m.key} className="mode-card" onClick={() => setMode(m.key)}
                  style={{ background: m.cardBg, borderColor: m.cardBorder }}>
                  <div style={{ fontSize: 44, marginBottom: 10 }}>{m.emoji}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', background: m.badgeBg, border: `1px solid ${m.badgeBorder}`, borderRadius: 20, padding: '3px 10px', marginBottom: 10 }}>
                    <span style={{ color: m.badgeColor, fontSize: 11, fontWeight: 700 }}>{m.badge}</span>
                  </div>
                  <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, margin: '0 0 6px' }}>{m.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{m.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* Registration form */}
          {mode !== null && selected && (
            <div className="reg-fade" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: '32px 36px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <button onClick={() => setMode(null)}
                  style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', borderRadius: 8, padding: '6px 10px', fontSize: 13 }}>
                  ← Volver
                </button>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: selected.badgeBg, border: `1px solid ${selected.badgeBorder}`, borderRadius: 20, padding: '4px 14px' }}>
                  <span style={{ fontSize: 14 }}>{selected.emoji}</span>
                  <span style={{ color: selected.badgeColor, fontSize: 13, fontWeight: 600 }}>{selected.badge}</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label className="reg-label">Nombre completo</label>
                  <input className="reg-input" type="text" required placeholder="Juan Pérez" value={form.displayName} onChange={set('displayName')} />
                </div>
                <div>
                  <label className="reg-label">Correo electrónico</label>
                  <input className="reg-input" type="email" required placeholder="tu@correo.com" value={form.email} onChange={set('email')} />
                </div>
                <div>
                  <label className="reg-label">Contraseña</label>
                  <input className="reg-input" type="password" required placeholder="Mínimo 6 caracteres" value={form.password} onChange={set('password')} />
                </div>
                <div>
                  <label className="reg-label">Confirmar contraseña</label>
                  <input className="reg-input" type="password" required placeholder="Repite tu contraseña" value={form.confirmPassword} onChange={set('confirmPassword')} />
                </div>

                {(mode === 'representative' || mode === 'teacher') && (
                  <div>
                    <label className="reg-label">Código del colegio</label>
                    <input className="reg-input" type="text" required
                      placeholder="El administrador te proporcionó este código"
                      value={form.enrollmentCode} onChange={set('enrollmentCode')} />
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 5 }}>
                      {mode === 'teacher'
                        ? 'El director o administrador del colegio debe darte este código.'
                        : 'El administrador de tu colegio te proporcionó este código.'}
                    </p>
                  </div>
                )}

                {mode === 'admin' && (
                  <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                      Después del registro, configurarás los datos de tu colegio en 3 pasos rápidos.
                    </p>
                  </div>
                )}

                {(mode === 'representative' || mode === 'teacher') && (
                  <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                      Tu solicitud quedará pendiente hasta que el administrador la apruebe.
                    </p>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  style={{
                    marginTop: 4, padding: '13px', borderRadius: 12, fontWeight: 700, fontSize: 15,
                    cursor: loading ? 'default' : 'pointer', border: 'none', color: '#fff',
                    background: loading ? 'rgba(59,130,246,0.4)'
                      : mode === 'admin' ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)'
                      : mode === 'teacher' ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)'
                      : 'linear-gradient(135deg,#10b981,#059669)',
                    boxShadow: loading ? 'none' : '0 4px 18px rgba(59,130,246,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s',
                  }}>
                  {loading
                    ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Creando cuenta...</>
                    : mode === 'admin' ? '🏫 Crear cuenta y configurar colegio'
                    : mode === 'teacher' ? '👨‍🏫 Enviar solicitud'
                    : '👨‍👩‍👧 Enviar solicitud'
                  }
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 20 }}>
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" style={{ color: '#60a5fa', fontWeight: 600, textDecoration: 'none' }}>Inicia sesión</Link>
              </p>
            </div>
          )}

          {mode === null && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 24 }}>
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" style={{ color: '#60a5fa', fontWeight: 600, textDecoration: 'none' }}>Inicia sesión</Link>
            </p>
          )}
        </div>
      </div>
    </>
  )
}
