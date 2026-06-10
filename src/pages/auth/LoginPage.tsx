import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn, Lock, Mail, ArrowLeft } from 'lucide-react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/services/firebase'

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

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
    try { await signInWithGoogle(); navigate('/') }
    catch { toast.error('Error al iniciar sesión con Google') }
    finally { setGoogleLoading(false) }
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
    </div>
  )
}
