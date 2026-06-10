import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn, Lock, Mail, ArrowLeft, X } from 'lucide-react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/services/firebase'

const ROLES = [
  { value: 'representative', label: 'Representante', desc: 'Padre, madre o tutor de un alumno', emoji: '👨‍👩‍👧' },
  { value: 'teacher',        label: 'Profesor',       desc: 'Docente del colegio',               emoji: '👩‍🏫' },
]

export default function LoginPage() {
  const { signIn, signInWithGoogle, completeGoogleProfile } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  // Google new-user onboarding modal
  const [showGoogleModal, setShowGoogleModal] = useState(false)
  const [googleRole, setGoogleRole] = useState('representative')
  const [googleSchoolCode, setGoogleSchoolCode] = useState('')
  const [googleCompleting, setGoogleCompleting] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail) return
    setResetLoading(true)
    try {
      const actionCodeSettings = {
        url: window.location.origin + '/login',
        handleCodeInApp: false,
      }
      await sendPasswordResetEmail(auth, resetEmail, actionCodeSettings)
      toast.success('¡Listo! Revisa tu correo (incluyendo la carpeta de spam).', { duration: 6000 })
      setResetMode(false)
      setResetEmail('')
    } catch (err: any) {
      // Firebase no revela si el correo existe por seguridad — mostramos éxito igual
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        toast.success('Si ese correo está registrado, recibirás un enlace pronto.', { duration: 6000 })
        setResetMode(false)
      } else {
        toast.error('Error al enviar. Intenta nuevamente.')
      }
    } finally { setResetLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err: any) {
      const msg = err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
        ? 'Correo o contraseña incorrectos'
        : err.code === 'auth/too-many-requests'
        ? 'Demasiados intentos. Intenta más tarde'
        : 'Error al iniciar sesión'
      toast.error(msg)
    } finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      const { isNewUser } = await signInWithGoogle()
      if (isNewUser) {
        // New Google user — show modal to collect role + school code
        setShowGoogleModal(true)
      } else {
        navigate('/')
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        toast.error('Error al iniciar sesión con Google')
      }
    } finally { setGoogleLoading(false) }
  }

  const handleCompleteGoogle = async () => {
    if (!googleSchoolCode.trim()) { toast.error('Ingresa el código del colegio'); return }
    setGoogleCompleting(true)
    try {
      await completeGoogleProfile(googleRole, googleSchoolCode.trim())
      setShowGoogleModal(false)
      toast.success('Cuenta creada. El administrador aprobará tu acceso.')
      navigate('/')
    } catch {
      toast.error('Error al completar el registro')
    } finally { setGoogleCompleting(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#050d1a', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
      fontFamily: "'Sora', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        .auth-input {
          width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px; padding: 14px 16px 14px 44px; color: #e8f0ff; font-size: 14px;
          outline: none; transition: border-color .2s, background .2s; font-family: 'Sora', sans-serif;
        }
        .auth-input::placeholder { color: #4a6080; }
        .auth-input:focus { border-color: #1d6ff4; background: rgba(29,111,244,0.05); }
        .auth-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);} }
        .fade-up { animation: fadeUp .5s ease both; }
      `}</style>

      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Reset Password Mode */}
        {resetMode && (
          <div className="fade-up">
            <button onClick={() => setResetMode(false)} style={{
              display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none',
              color: '#6b8ab8', cursor: 'pointer', fontSize: '14px', marginBottom: '24px', padding: 0,
            }}>
              <ArrowLeft size={16}/> Volver al login
            </button>
            <div className="auth-card" style={{ padding: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#e8f0ff', marginBottom: '8px' }}>
                Recuperar contraseña
              </h2>
              <p style={{ color: '#6b8ab8', fontSize: '14px', marginBottom: '24px' }}>
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
              </p>
              <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#8ba5c8', display: 'block', marginBottom: '8px' }}>
                    Correo electrónico
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4a6080' }}/>
                    <input type="email" required className="auth-input"
                      placeholder="tu@correo.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)}/>
                  </div>
                </div>
                <button type="submit" disabled={resetLoading} style={{
                  width: '100%', padding: '14px',
                  background: resetLoading ? 'rgba(29,111,244,0.5)' : 'linear-gradient(135deg, #1d6ff4, #3b82f6)',
                  border: 'none', borderRadius: '14px', color: '#fff', fontSize: '15px', fontWeight: 600,
                  cursor: resetLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '8px', fontFamily: 'inherit',
                }}>
                  {resetLoading
                    ? <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
                    : <Mail size={16}/>}
                  {resetLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Login Mode */}
        {!resetMode && <>
        {/* Logo */}
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #1d6ff4, #06c8f0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontWeight: 800, color: '#fff', fontSize: '18px',
            boxShadow: '0 0 40px rgba(29,111,244,0.4)',
          }}>EF</div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#e8f0ff', margin: 0 }}>EduFinance</h1>
          <p style={{ color: '#6b8ab8', fontSize: '14px', marginTop: '6px' }}>Bienvenido de vuelta</p>
        </div>

        {/* Card */}
        <div className="auth-card fade-up" style={{ padding: '32px', animationDelay: '.1s' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#e8f0ff', marginBottom: '24px' }}>
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Email */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#8ba5c8', display: 'block', marginBottom: '8px' }}>
                Correo electrónico
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4a6080' }}/>
                <input type="email" required className="auth-input"
                  placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)}/>
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#8ba5c8' }}>Contraseña</label>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4a6080' }}/>
                <input type={showPass ? 'text' : 'password'} required className="auth-input"
                  style={{ paddingRight: '44px' }}
                  placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}/>
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#4a6080', cursor: 'pointer', padding: '2px',
                }}>
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {/* Forgot password link — visible below password field */}
            <div style={{ textAlign: 'right', marginTop: '-8px' }}>
              <span
                onClick={() => { setResetEmail(email); setResetMode(true) }}
                style={{
                  fontSize: '13px', color: '#60a5fa', cursor: 'pointer',
                  fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: '3px',
                }}
              >
                ¿Olvidaste tu contraseña?
              </span>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px',
              background: loading ? 'rgba(29,111,244,0.5)' : 'linear-gradient(135deg, #1d6ff4, #3b82f6)',
              border: 'none', borderRadius: '14px', color: '#fff', fontSize: '15px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px', transition: 'all .2s', marginTop: '4px',
              boxShadow: '0 4px 24px rgba(29,111,244,0.3)', fontFamily: 'inherit',
            }}>
              {loading
                ? <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
                : <LogIn size={16}/>}
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}/>
            <span style={{ fontSize: '12px', color: '#4a6080' }}>o continúa con</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}/>
          </div>

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            style={{
              width: '100%', padding: '13px', marginTop: '12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '14px', color: '#e8f0ff', fontSize: '14px', fontWeight: 600,
              cursor: googleLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              transition: 'all .2s', fontFamily: 'inherit',
              opacity: googleLoading ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!googleLoading) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.09)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
          >
            {googleLoading
              ? <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
              : <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
            }
            {googleLoading ? 'Conectando...' : 'Entrar con Google'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b8ab8', marginTop: '20px' }}>
            ¿No tienes cuenta?{' '}
            <Link to="/register" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
              Regístrate gratis
            </Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#4a6080', marginTop: '20px' }}>
          © 2025 EduFinance · Para colegios de LATAM
        </p>
        </>}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Google new-user modal ── */}
      {showGoogleModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div style={{
            background: '#0d1829', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '420px',
            fontFamily: "'Sora', sans-serif",
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e8f0ff', margin: 0 }}>
                Completa tu registro
              </h3>
              <button onClick={() => setShowGoogleModal(false)} style={{
                background: 'none', border: 'none', color: '#6b8ab8', cursor: 'pointer', padding: '4px',
              }}>
                <X size={18}/>
              </button>
            </div>
            <p style={{ fontSize: '13px', color: '#6b8ab8', marginBottom: '24px' }}>
              Es tu primera vez con Google. Necesitamos saber tu rol y el código del colegio.
            </p>

            {/* Role selector */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#8ba5c8', display: 'block', marginBottom: '10px' }}>
                ¿Cuál es tu rol?
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setGoogleRole(r.value)}
                    style={{
                      flex: 1, padding: '12px 8px', borderRadius: '14px', cursor: 'pointer',
                      border: googleRole === r.value ? '2px solid #1d6ff4' : '1px solid rgba(255,255,255,0.1)',
                      background: googleRole === r.value ? 'rgba(29,111,244,0.15)' : 'rgba(255,255,255,0.03)',
                      color: '#e8f0ff', textAlign: 'center', transition: 'all .2s', fontFamily: 'inherit',
                    }}>
                    <div style={{ fontSize: '22px', marginBottom: '4px' }}>{r.emoji}</div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.label}</div>
                    <div style={{ fontSize: '11px', color: '#6b8ab8', marginTop: '2px' }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* School code */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#8ba5c8', display: 'block', marginBottom: '8px' }}>
                Código del colegio
              </label>
              <input
                className="auth-input"
                style={{ paddingLeft: '16px' }}
                placeholder="Ej: school_default"
                value={googleSchoolCode}
                onChange={e => setGoogleSchoolCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCompleteGoogle()}
              />
              <p style={{ fontSize: '12px', color: '#4a6080', marginTop: '6px' }}>
                El administrador del colegio te debe proporcionar este código.
              </p>
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={handleCompleteGoogle}
              disabled={googleCompleting || !googleSchoolCode.trim()}
              style={{
                width: '100%', padding: '14px',
                background: (googleCompleting || !googleSchoolCode.trim()) ? 'rgba(29,111,244,0.4)' : 'linear-gradient(135deg, #1d6ff4, #3b82f6)',
                border: 'none', borderRadius: '14px', color: '#fff', fontSize: '15px', fontWeight: 600,
                cursor: (googleCompleting || !googleSchoolCode.trim()) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontFamily: 'inherit', transition: 'all .2s',
              }}>
              {googleCompleting
                ? <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
                : '✓'}
              {googleCompleting ? 'Registrando...' : 'Completar registro'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
