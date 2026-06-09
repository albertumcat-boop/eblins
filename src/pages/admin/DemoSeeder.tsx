import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Navigate } from 'react-router-dom'
import { seedDemoData, deleteDemoData, DEMO_SCHOOL_ID } from '@/utils/demoSeeder'
import toast from 'react-hot-toast'

const SUPER_ADMIN_EMAIL = 'albert.umcat@gmail.com'

const SEED_STEPS = [
  { id: 'school',        label: 'Escuela: Unidad Educativa San Simón' },
  { id: 'users',         label: 'Usuarios (admin + 3 docentes + 10 representantes)' },
  { id: 'students',      label: '10 estudiantes con datos completos' },
  { id: 'payments',      label: 'Pagos (aprobados, pendientes y vencidos)' },
  { id: 'announcements', label: '4 anuncios realistas' },
  { id: 'notifications', label: 'Notificaciones de representantes' },
  { id: 'events',        label: '6 eventos en el calendario escolar' },
  { id: 'attendance',    label: 'Asistencia de los últimos 5 días' },
  { id: 'behavior',      label: 'Registros de conducta (positivos y negativos)' },
  { id: 'grades',        label: 'Notas del 1er lapso (6 materias × 10 alumnos)' },
]

type Status = 'idle' | 'running' | 'done' | 'error'

export default function DemoSeeder() {
  const { appUser } = useAuth()

  const [status, setStatus] = useState<Status>('idle')
  const [stepsDone, setStepsDone] = useState<Set<string>>(new Set())
  const [credentials, setCredentials] = useState<{ email: string; password: string; schoolId: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  if (!appUser || appUser.email !== SUPER_ADMIN_EMAIL) {
    return <Navigate to="/" replace />
  }

  async function handleSeed() {
    setStatus('running')
    setStepsDone(new Set())
    setCredentials(null)

    // Simulate step-by-step progress while the actual seeder runs
    const totalMs = 12000
    const msPerStep = totalMs / SEED_STEPS.length

    const progressInterval = setInterval(() => {
      setStepsDone(prev => {
        const next = new Set(prev)
        const nextIdx = next.size
        if (nextIdx < SEED_STEPS.length) next.add(SEED_STEPS[nextIdx].id)
        return next
      })
    }, msPerStep)

    try {
      const result = await seedDemoData(appUser.id)
      clearInterval(progressInterval)
      // Mark all steps done
      setStepsDone(new Set(SEED_STEPS.map(s => s.id)))
      setCredentials({ email: result.adminEmail, password: result.adminPassword, schoolId: result.schoolId })
      setStatus('done')
      toast.success('Datos de demo creados exitosamente')
    } catch (err: any) {
      clearInterval(progressInterval)
      setStatus('error')
      toast.error('Error al crear demo: ' + (err?.message ?? 'Error desconocido'))
    }
  }

  async function handleDelete() {
    if (!window.confirm('¿Eliminar TODOS los datos del demo? Esta acción no se puede deshacer.')) return
    setDeleting(true)
    try {
      await deleteDemoData()
      toast.success('Datos de demo eliminados')
      setStatus('idle')
      setStepsDone(new Set())
      setCredentials(null)
    } catch (err: any) {
      toast.error('Error al eliminar: ' + (err?.message ?? 'Error desconocido'))
    } finally {
      setDeleting(false)
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#1d6ff4,#06c8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              🏫
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Demo Seeder</h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
            Crea una escuela de demostración con datos realistas para mostrar EduFinance a clientes potenciales.
            <br />
            Escuela: <strong>Unidad Educativa San Simón</strong> · ID: <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, fontSize: 13 }}>{DEMO_SCHOOL_ID}</code>
          </p>
        </div>

        {/* Main card */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 32, marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Contenido del demo</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {SEED_STEPS.map(step => {
              const done = stepsDone.has(step.id)
              const current = !done && status === 'running' && stepsDone.size === SEED_STEPS.indexOf(SEED_STEPS.find(s => s.id === step.id)!)
              return (
                <div key={step.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderRadius: 10, background: done ? '#f0fdf4' : current ? '#eff6ff' : '#f8fafc',
                  border: `1px solid ${done ? '#bbf7d0' : current ? '#bfdbfe' : '#e2e8f0'}`,
                  transition: 'all 0.3s',
                }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, background: done ? '#22c55e' : current ? '#3b82f6' : '#e2e8f0', color: done || current ? '#fff' : '#94a3b8' }}>
                    {done ? '✓' : current ? '…' : '·'}
                  </div>
                  <span style={{ fontSize: 14, color: done ? '#15803d' : current ? '#1d4ed8' : '#64748b', fontWeight: done ? 600 : 400 }}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Action button */}
          {status !== 'done' && (
            <button
              onClick={handleSeed}
              disabled={status === 'running'}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: status === 'running' ? 'not-allowed' : 'pointer',
                background: status === 'running' ? '#93c5fd' : 'linear-gradient(135deg,#1d6ff4,#2563eb)',
                color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'all 0.2s', boxShadow: status === 'running' ? 'none' : '0 4px 16px rgba(29,111,244,0.35)',
              }}
            >
              {status === 'running' ? (
                <>
                  <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  Creando datos ({stepsDone.size}/{SEED_STEPS.length})…
                </>
              ) : (
                '🚀 Crear datos de demo'
              )}
            </button>
          )}

          {status === 'error' && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 14 }}>
              Ocurrió un error. Revisa la consola para más detalles y vuelve a intentarlo.
            </div>
          )}
        </div>

        {/* Credentials card */}
        {credentials && (
          <div style={{ background: '#fff', border: '2px solid #22c55e', borderRadius: 20, padding: 28, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 24 }}>✅</span>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#15803d' }}>Demo creado — credenciales de acceso</h2>
            </div>

            {[
              { label: 'Email del admin', value: credentials.email,    key: 'email' },
              { label: 'Contraseña',      value: credentials.password,  key: 'pass' },
              { label: 'School ID',       value: credentials.schoolId,  key: 'sid' },
            ].map(item => (
              <div key={item.key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b', marginBottom: 4 }}>{item.label}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <code style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: '#0f172a' }}>
                    {item.value}
                  </code>
                  <button
                    onClick={() => copy(item.value, item.key)}
                    style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: copied === item.key ? '#f0fdf4' : '#f8fafc', color: copied === item.key ? '#15803d' : '#374151', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  >
                    {copied === item.key ? 'Copiado ✓' : 'Copiar'}
                  </button>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 16, padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 13, color: '#92400e' }}>
              Nota: estas credenciales son solo para demostración. El usuario demo debe crearse en Firebase Auth manualmente con este email antes de que pueda hacer login.
            </div>
          </div>
        )}

        {/* Delete section */}
        <div style={{ background: '#fff', border: '1px solid #fee2e2', borderRadius: 20, padding: 24 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#dc2626' }}>Zona de peligro</h3>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: '#64748b' }}>
            Elimina todos los documentos de Firestore con <code>schoolId === &quot;{DEMO_SCHOOL_ID}&quot;</code>.
          </p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: '10px 20px', borderRadius: 10, border: '1px solid #fecaca', background: deleting ? '#fee2e2' : '#fff',
              color: '#dc2626', fontSize: 14, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer',
            }}
          >
            {deleting ? 'Eliminando…' : '🗑 Eliminar demo'}
          </button>
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
