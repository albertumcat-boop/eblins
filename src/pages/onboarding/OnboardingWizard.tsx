import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

import { createSchool, setUserSchool } from '@/services/db'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage, db } from '@/services/firebase'
import { updateDoc, doc as firestoreDoc } from 'firebase/firestore'
import toast from 'react-hot-toast'

// ── Types ──────────────────────────────────────────────────────────
interface Lapso { name: string; start: string; end: string }
interface WizardData {
  // Step 1
  schoolName: string
  address: string
  phone: string
  city: string
  logoFile: File | null
  logoPreview: string
  // Step 2
  currency: 'USD' | 'VES'
  monthlyFee: string
  enrollmentFee: string
  billingDay: number
  dueDay: number
  lateFeeEnabled: boolean
  lateFeePercent: string
  lateFeeGraceDays: string
  acceptedMethods: string[]
  schoolYear: string
  lapsos: Lapso[]
  // Step 3
  adminName: string
}

const METHODS = [
  { id: 'pagomovil', label: 'Pago Móvil', icon: '📱' },
  { id: 'zelle', label: 'Zelle', icon: '💸' },
  { id: 'transferencia', label: 'Transferencia', icon: '🏦' },
  { id: 'efectivo', label: 'Efectivo', icon: '💵' },
  { id: 'binance', label: 'Binance', icon: '🟡' },
]

const defaultLapsos: Lapso[] = [
  { name: 'Lapso 1', start: '', end: '' },
  { name: 'Lapso 2', start: '', end: '' },
  { name: 'Lapso 3', start: '', end: '' },
]

export default function OnboardingWizard() {
  const { firebaseUser, appUser, refreshAppUser } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [data, setData] = useState<WizardData>({
    schoolName: '', address: '', phone: '', city: '',
    logoFile: null, logoPreview: '',
    currency: 'USD',
    monthlyFee: '', enrollmentFee: '',
    billingDay: 1, dueDay: 15,
    lateFeeEnabled: false, lateFeePercent: '', lateFeeGraceDays: '',
    acceptedMethods: [],
    schoolYear: '2024-2025',
    lapsos: defaultLapsos,
    adminName: appUser?.displayName || firebaseUser?.displayName || '',
  })

  const set = (k: keyof WizardData, v: any) => setData(prev => ({ ...prev, [k]: v }))

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    set('logoFile', file)
    const reader = new FileReader()
    reader.onload = ev => set('logoPreview', ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const toggleMethod = (id: string) => {
    set('acceptedMethods',
      data.acceptedMethods.includes(id)
        ? data.acceptedMethods.filter(m => m !== id)
        : [...data.acceptedMethods, id]
    )
  }

  const updateLapso = (i: number, field: keyof Lapso, val: string) => {
    const updated = data.lapsos.map((l, idx) => idx === i ? { ...l, [field]: val } : l)
    set('lapsos', updated)
  }

  const validateStep = () => {
    if (step === 1) {
      if (!data.schoolName.trim()) { toast.error('El nombre del colegio es requerido'); return false }
    }
    if (step === 2) {
      if (!data.monthlyFee) { toast.error('Ingresa la mensualidad base'); return false }
    }
    return true
  }

  const uploadLogo = async (schoolId: string): Promise<string> => {
    if (!data.logoFile) return ''
    return new Promise((resolve, reject) => {
      const path = `schools/${schoolId}/logo-${Date.now()}.${data.logoFile!.name.split('.').pop()}`
      const task = uploadBytesResumable(ref(storage, path), data.logoFile!)
      task.on('state_changed',
        s => setUploadProgress(Math.round(s.bytesTransferred / s.totalBytes * 100)),
        reject,
        async () => resolve(await getDownloadURL(task.snapshot.ref))
      )
    })
  }

  const handleFinish = async () => {
    if (!firebaseUser) return
    setLoading(true)
    try {
      // Create school first (to get the ID for logo path)
      const schoolId = await createSchool({
        name: data.schoolName,
        address: data.address,
        phone: data.phone,
        city: data.city,
        logoUrl: '',
        settings: {
          currency: data.currency,
          monthlyFee: parseFloat(data.monthlyFee) || 0,
          enrollmentFee: parseFloat(data.enrollmentFee) || 0,
          lateFeeEnabled: data.lateFeeEnabled,
          lateFeePercent: parseFloat(data.lateFeePercent) || 0,
          lateFeeGraceDays: parseInt(data.lateFeeGraceDays) || 0,
          currentSchoolYear: data.schoolYear,
          billingConfig: {
            enabled: true,
            billingDay: data.billingDay,
            dueDay: data.dueDay,
            amount: parseFloat(data.monthlyFee) || 0,
            currency: data.currency,
          },
          acceptedMethods: data.acceptedMethods,
          lapsos: data.lapsos,
        },
      })

      // Upload logo if provided
      if (data.logoFile) {
        const logoUrl = await uploadLogo(schoolId)
        await updateDoc(firestoreDoc(db, 'schools', schoolId), { logoUrl })
      }

      // Update user
      await setUserSchool(firebaseUser.uid, schoolId, 'admin')

      // Wait for Firestore to propagate, then reload auth state
      toast.success('¡Colegio creado exitosamente!')

      // Refresh auth context so App.tsx re-evaluates the routing guard
      await refreshAppUser()
      navigate('/', { replace: true })
    } catch (err: any) {
      console.error(err)
      toast.error('Error al crear el colegio. Intenta de nuevo.')
      setLoading(false)
    }
  }

  const progressPct = ((step - 1) / 2) * 100

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.35s ease both; }
        .glass { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(12px); }
        .glass-hover:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.18); }
        .method-btn { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s; cursor: pointer; }
        .method-btn.active { background: rgba(59,130,246,0.25); border-color: rgba(59,130,246,0.7); }
        .currency-btn { background: rgba(255,255,255,0.04); border: 2px solid rgba(255,255,255,0.1); transition: all 0.2s; cursor: pointer; }
        .currency-btn.active { background: rgba(59,130,246,0.2); border-color: #3b82f6; }
        input[type=range] { accent-color: #3b82f6; }
        .ob-input { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); color: #f1f5f9; border-radius: 10px; padding: 10px 14px; width: 100%; font-size: 14px; outline: none; transition: border-color 0.2s; }
        .ob-input:focus { border-color: #3b82f6; }
        .ob-input::placeholder { color: rgba(255,255,255,0.3); }
        .ob-label { color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 500; margin-bottom: 6px; display: block; }
        select.ob-input option { background: #0f1e35; color: #f1f5f9; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#050d1a', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px 16px' }}>
        {/* Progress bar */}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.08)', zIndex: 50 }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', width: `${progressPct + (step === 3 ? 100 : 33)}%`, transition: 'width 0.5s ease' }} />
        </div>

        <div style={{ maxWidth: 620, margin: '0 auto', paddingTop: 40 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎓</div>
              <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 20 }}>EduFinance</span>
            </div>
          </div>

          {/* Steps indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 40 }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                  background: s < step ? '#3b82f6' : s === step ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)',
                  border: s === step ? '2px solid #3b82f6' : s < step ? '2px solid #3b82f6' : '2px solid rgba(255,255,255,0.1)',
                  color: s <= step ? '#f1f5f9' : 'rgba(255,255,255,0.35)',
                  transition: 'all 0.3s',
                }}>
                  {s < step ? '✓' : s}
                </div>
                {s < 3 && <div style={{ width: 40, height: 2, background: s < step ? '#3b82f6' : 'rgba(255,255,255,0.1)', borderRadius: 2, transition: 'background 0.4s' }} />}
              </div>
            ))}
          </div>

          {/* Card */}
          <div className="glass fade-in" key={step} style={{ borderRadius: 20, padding: '36px 40px' }}>
            {step === 1 && <Step1 data={data} set={set} handleLogoChange={handleLogoChange} fileInputRef={fileInputRef} />}
            {step === 2 && <Step2 data={data} set={set} toggleMethod={toggleMethod} updateLapso={updateLapso} />}
            {step === 3 && <Step3 data={data} set={set} loading={loading} uploadProgress={uploadProgress} />}

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, gap: 12 }}>
              <button
                onClick={() => step > 1 && setStep(s => s - 1)}
                style={{
                  padding: '11px 24px', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: step > 1 ? 'pointer' : 'default',
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                  color: step > 1 ? '#f1f5f9' : 'rgba(255,255,255,0.25)',
                  transition: 'all 0.2s',
                }}
                disabled={step === 1}
              >
                ← Anterior
              </button>
              {step < 3 ? (
                <button
                  onClick={() => { if (validateStep()) setStep(s => s + 1) }}
                  style={{
                    padding: '11px 28px', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                    background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', border: 'none',
                    color: '#fff', boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
                    transition: 'all 0.2s',
                  }}
                >
                  Siguiente →
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  style={{
                    padding: '11px 28px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: loading ? 'default' : 'pointer',
                    background: loading ? 'rgba(59,130,246,0.4)' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                    border: 'none', color: '#fff',
                    boxShadow: loading ? 'none' : '0 4px 20px rgba(59,130,246,0.35)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                      {uploadProgress > 0 && uploadProgress < 100 ? `Subiendo logo ${uploadProgress}%...` : 'Creando colegio...'}
                    </>
                  ) : '🏫 Crear mi colegio'}
                </button>
              )}
            </div>
          </div>

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 24 }}>
            Paso {step} de 3 — Puedes volver atrás en cualquier momento
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

// ── Step 1: School Info ──────────────────────────────────────────────
function Step1({ data, set, handleLogoChange, fileInputRef }: {
  data: WizardData
  set: (k: keyof WizardData, v: any) => void
  handleLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  fileInputRef: React.RefObject<HTMLInputElement>
}) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🏫</div>
        <h2 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 24, margin: 0 }}>Tu colegio</h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginTop: 6 }}>Cuéntanos sobre tu institución educativa</p>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <label className="ob-label">Nombre del colegio *</label>
          <input className="ob-input" placeholder="Ej: U.E. Colegio San José" value={data.schoolName}
            onChange={e => set('schoolName', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="ob-label">Ciudad</label>
            <input className="ob-input" placeholder="Caracas" value={data.city}
              onChange={e => set('city', e.target.value)} />
          </div>
          <div>
            <label className="ob-label">Teléfono de contacto</label>
            <input className="ob-input" placeholder="+58 212 000 0000" value={data.phone}
              onChange={e => set('phone', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="ob-label">Dirección</label>
          <input className="ob-input" placeholder="Av. Principal, Municipio..." value={data.address}
            onChange={e => set('address', e.target.value)} />
        </div>

        {/* Logo upload */}
        <div>
          <label className="ob-label">Logo del colegio (opcional)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {data.logoPreview ? (
              <img src={data.logoPreview} alt="Logo preview"
                style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', border: '2px solid rgba(59,130,246,0.5)' }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                🏫
              </div>
            )}
            <div>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                style={{ padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)', color: '#60a5fa' }}>
                {data.logoPreview ? 'Cambiar logo' : 'Subir logo'}
              </button>
              {data.logoPreview && (
                <button type="button" onClick={() => { set('logoFile', null); set('logoPreview', '') }}
                  style={{ marginLeft: 8, padding: '8px 14px', borderRadius: 10, fontSize: 13, cursor: 'pointer', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                  Quitar
                </button>
              )}
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4 }}>PNG, JPG o SVG. Máx 2MB</p>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
        </div>
      </div>
    </div>
  )
}

// ── Step 2: Payment Config ───────────────────────────────────────────
function Step2({ data, set, toggleMethod, updateLapso }: {
  data: WizardData
  set: (k: keyof WizardData, v: any) => void
  toggleMethod: (id: string) => void
  updateLapso: (i: number, field: keyof Lapso, val: string) => void
}) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>💰</div>
        <h2 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 24, margin: 0 }}>Configuración de pagos</h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginTop: 6 }}>Define cómo gestionarás los cobros</p>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        {/* Currency */}
        <div>
          <label className="ob-label">Moneda principal</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(['USD', 'VES'] as const).map(c => (
              <div key={c} className={`currency-btn ${data.currency === c ? 'active' : ''}`}
                onClick={() => set('currency', c)}
                style={{ borderRadius: 12, padding: '16px', textAlign: 'center', userSelect: 'none' }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>{c === 'USD' ? '🇺🇸' : '🇻🇪'}</div>
                <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15 }}>{c}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{c === 'USD' ? 'Dólar estadounidense' : 'Bolívar venezolano'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Fees */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="ob-label">Mensualidad base ({data.currency})</label>
            <input className="ob-input" type="number" min="0" placeholder="150" value={data.monthlyFee}
              onChange={e => set('monthlyFee', e.target.value)} />
          </div>
          <div>
            <label className="ob-label">Inscripción anual ({data.currency})</label>
            <input className="ob-input" type="number" min="0" placeholder="300" value={data.enrollmentFee}
              onChange={e => set('enrollmentFee', e.target.value)} />
          </div>
        </div>

        {/* Days */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="ob-label">Día de cobro mensual</label>
            <select className="ob-input" value={data.billingDay} onChange={e => set('billingDay', parseInt(e.target.value))}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>Día {d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ob-label">Día de vencimiento</label>
            <select className="ob-input" value={data.dueDay} onChange={e => set('dueDay', parseInt(e.target.value))}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>Día {d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Late fee toggle */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>Mora automática</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>Aplicar recargo por pagos vencidos</div>
            </div>
            <div onClick={() => set('lateFeeEnabled', !data.lateFeeEnabled)}
              style={{ width: 44, height: 24, borderRadius: 12, background: data.lateFeeEnabled ? '#3b82f6' : 'rgba(255,255,255,0.15)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 3, left: data.lateFeeEnabled ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
            </div>
          </div>
          {data.lateFeeEnabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
              <div>
                <label className="ob-label">Porcentaje de mora (%)</label>
                <input className="ob-input" type="number" min="0" max="100" placeholder="5" value={data.lateFeePercent}
                  onChange={e => set('lateFeePercent', e.target.value)} />
              </div>
              <div>
                <label className="ob-label">Días de gracia</label>
                <input className="ob-input" type="number" min="0" placeholder="3" value={data.lateFeeGraceDays}
                  onChange={e => set('lateFeeGraceDays', e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Payment methods */}
        <div>
          <label className="ob-label">Métodos de pago aceptados</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {METHODS.map(m => (
              <div key={m.id} className={`method-btn ${data.acceptedMethods.includes(m.id) ? 'active' : ''}`}
                onClick={() => toggleMethod(m.id)}
                style={{ borderRadius: 10, padding: '10px 8px', textAlign: 'center', userSelect: 'none' }}>
                <div style={{ fontSize: 20 }}>{m.icon}</div>
                <div style={{ color: '#f1f5f9', fontSize: 12, marginTop: 4, fontWeight: 500 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* School year */}
        <div>
          <label className="ob-label">Año escolar actual</label>
          <input className="ob-input" placeholder="2024-2025" value={data.schoolYear}
            onChange={e => set('schoolYear', e.target.value)} />
        </div>

        {/* Lapsos */}
        <div>
          <label className="ob-label" style={{ marginBottom: 12 }}>Lapsos escolares</label>
          <div style={{ display: 'grid', gap: 10 }}>
            {data.lapsos.map((l, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 10, alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{l.name}</span>
                <input className="ob-input" type="date" value={l.start} onChange={e => updateLapso(i, 'start', e.target.value)} />
                <input className="ob-input" type="date" value={l.end} onChange={e => updateLapso(i, 'end', e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Confirm ──────────────────────────────────────────────────
function Step3({ data, set, loading, uploadProgress }: {
  data: WizardData
  set: (k: keyof WizardData, v: any) => void
  loading: boolean
  uploadProgress: number
}) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>👤</div>
        <h2 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 24, margin: 0 }}>Primer administrador</h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginTop: 6 }}>Revisa el resumen y confirma la creación</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 14, padding: '14px 18px' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Colegio</div>
          <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16 }}>{data.schoolName || '—'}</div>
          {data.city && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>{data.city}</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 4 }}>Mensualidad</div>
            <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{data.currency} {data.monthlyFee || '0'}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 4 }}>Año escolar</div>
            <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{data.schoolYear}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 4 }}>Mora automática</div>
            <div style={{ color: data.lateFeeEnabled ? '#4ade80' : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
              {data.lateFeeEnabled ? `${data.lateFeePercent || 0}%` : 'Desactivada'}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 4 }}>Métodos de pago</div>
            <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{data.acceptedMethods.length} seleccionados</div>
          </div>
        </div>
      </div>

      {/* Admin name */}
      <div style={{ marginBottom: 20 }}>
        <label className="ob-label">Tu nombre (administrador principal)</label>
        <input className="ob-input" placeholder="Tu nombre completo" value={data.adminName}
          onChange={e => set('adminName', e.target.value)} />
      </div>

      {/* Confirmation message */}
      <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>✅</span>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
          Al finalizar crearás la escuela <strong style={{ color: '#f1f5f9' }}>{data.schoolName}</strong> y serás asignado como <strong style={{ color: '#34d399' }}>administrador principal</strong>. Podrás configurar más detalles desde el panel.
        </p>
      </div>

      {loading && uploadProgress > 0 && uploadProgress < 100 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Subiendo logo...</span>
            <span style={{ color: '#60a5fa', fontSize: 12 }}>{uploadProgress}%</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
            <div style={{ height: '100%', background: '#3b82f6', borderRadius: 4, width: `${uploadProgress}%`, transition: 'width 0.2s' }} />
          </div>
        </div>
      )}
    </div>
  )
}
