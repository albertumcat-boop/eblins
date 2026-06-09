import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getSchool, updateSchoolSettings } from '@/services/db'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '@/services/firebase'
import toast from 'react-hot-toast'
import {
  Save, Plus, Trash2, CreditCard, Calendar, ToggleLeft, ToggleRight,
  School, Bell, AlertCircle, BookOpen, Upload, Image as ImageIcon
} from 'lucide-react'

const PAYMENT_METHOD_TYPES = [
  { value: 'pago_movil',    label: 'Pago Móvil',             icon: '📱', fields: ['banco','telefono','cedula'] },
  { value: 'transferencia', label: 'Transferencia Bancaria', icon: '🏦', fields: ['banco','cuenta','titular','cedula_rif'] },
  { value: 'zelle',         label: 'Zelle',                  icon: '💵', fields: ['email_telefono','titular'] },
  { value: 'efectivo',      label: 'Efectivo',               icon: '💴', fields: ['instrucciones'] },
  { value: 'binance',       label: 'Binance Pay',            icon: '🟡', fields: ['binance_id','titular'] },
]

const FIELD_LABELS: Record<string, string> = {
  banco:          'Banco',
  telefono:       'Número de teléfono',
  cedula:         'Cédula del titular',
  cuenta:         'Número de cuenta',
  titular:        'Nombre del titular',
  cedula_rif:     'Cédula / RIF',
  email_telefono: 'Email o teléfono Zelle',
  instrucciones:  'Instrucciones para pago en efectivo',
  binance_id:     'ID de Binance Pay',
}

const ACCEPTED_METHODS = [
  { value: 'pago_movil',    label: 'Pago Móvil',             icon: '📱' },
  { value: 'zelle',         label: 'Zelle',                  icon: '💵' },
  { value: 'efectivo',      label: 'Efectivo',               icon: '💴' },
  { value: 'transferencia', label: 'Transferencia bancaria', icon: '🏦' },
  { value: 'binance',       label: 'Binance Pay',            icon: '🟡' },
]

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1)

const LAPSO_LABELS = ['Lapso 1', 'Lapso 2', 'Lapso 3']

type LapsoConfig = { start: string; end: string }

function Section({ icon: Icon, title, subtitle, children }: {
  icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
          <Icon size={18} className="text-blue-600"/>
        </div>
        <div>
          <h2 className="font-semibold text-slate-700">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="text-slate-400 hover:text-blue-600 transition-colors">
      {enabled ? <ToggleRight size={32} className="text-blue-600"/> : <ToggleLeft size={32}/>}
    </button>
  )
}

export default function AdminSettings() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''
  const qc = useQueryClient()
  const logoInputRef = useRef<HTMLInputElement>(null)

  const { data: school } = useQuery({
    queryKey: ['school', schoolId],
    queryFn: () => getSchool(schoolId),
    enabled: !!schoolId,
  })

  // School info
  const [schoolInfo, setSchoolInfo] = useState({
    name: '', address: '', phone: '', logoUrl: '',
  })
  const [logoUploading, setLogoUploading] = useState(false)

  // General settings
  const [settings, setSettings] = useState({
    currency: 'USD', lateFeeEnabled: false, lateFeePercent: 5,
    lateFeeGraceDays: 5, monthlyFee: 150, enrollmentFee: 300,
    currentSchoolYear: '2024-2025',
  })

  // Notification settings
  const [notifSettings, setNotifSettings] = useState({
    autoRemindersEnabled: false,
    reminderDaysBefore: 3,
  })

  // Billing (auto monthly)
  const [billing, setBilling] = useState({
    enabled: false, billingDay: 1, dueDay: 15,
    amount: 150, currency: 'USD', description: 'Mensualidad',
  })

  // School year / lapsos
  const [lapsos, setLapsos] = useState<LapsoConfig[]>([
    { start: '', end: '' },
    { start: '', end: '' },
    { start: '', end: '' },
  ])

  // Payment methods (detailed)
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [showAddMethod, setShowAddMethod] = useState(false)
  const [newMethod, setNewMethod] = useState({
    type: 'pago_movil', banco: '', telefono: '', cedula: '',
    cuenta: '', titular: '', cedula_rif: '', email_telefono: '', instrucciones: '', binance_id: '',
  })

  // Accepted methods checkboxes
  const [acceptedMethods, setAcceptedMethods] = useState<string[]>(['pago_movil', 'zelle', 'efectivo', 'transferencia'])

  useEffect(() => {
    if (school) {
      setSchoolInfo({
        name:     (school as any).name     || '',
        address:  (school as any).address  || '',
        phone:    (school as any).phone    || '',
        logoUrl:  (school as any).logoUrl  || '',
      })
      setSettings({
        currency:          school.settings?.currency          || 'USD',
        lateFeeEnabled:    school.settings?.lateFeeEnabled    ?? false,
        lateFeePercent:    school.settings?.lateFeePercent    || 5,
        lateFeeGraceDays:  school.settings?.lateFeeGraceDays  || 5,
        monthlyFee:        school.settings?.monthlyFee        || 0,
        enrollmentFee:     school.settings?.enrollmentFee     || 0,
        currentSchoolYear: school.settings?.currentSchoolYear || '2024-2025',
      })
      const s = school as any
      if (s.notifSettings) setNotifSettings(s.notifSettings)
      if (s.billingConfig)  setBilling(s.billingConfig)
      if (s.lapsos)         setLapsos(s.lapsos)
      if (s.paymentMethods) setPaymentMethods(s.paymentMethods)
      if (s.acceptedMethods) setAcceptedMethods(s.acceptedMethods)
    }
  }, [school])

  // --- Mutations ---

  const saveGeneralMut = useMutation({
    mutationFn: () => updateSchoolSettings(schoolId, settings),
    onSuccess: () => { toast.success('Configuración general guardada'); qc.invalidateQueries({ queryKey: ['school'] }) },
    onError: () => toast.error('Error al guardar'),
  })

  const saveSchoolInfo = async () => {
    try {
      await updateDoc(doc(db, 'schools', schoolId), {
        name: schoolInfo.name, address: schoolInfo.address, phone: schoolInfo.phone,
      })
      toast.success('Información del colegio guardada')
      qc.invalidateQueries({ queryKey: ['school'] })
    } catch { toast.error('Error al guardar información') }
  }

  const saveNotifSettings = async () => {
    try {
      await updateDoc(doc(db, 'schools', schoolId), { notifSettings })
      toast.success('Configuración de notificaciones guardada')
      qc.invalidateQueries({ queryKey: ['school'] })
    } catch { toast.error('Error al guardar notificaciones') }
  }

  const saveBilling = async () => {
    try {
      await updateDoc(doc(db, 'schools', schoolId), { billingConfig: billing })
      toast.success('Facturación automática guardada')
      qc.invalidateQueries({ queryKey: ['school'] })
    } catch { toast.error('Error al guardar facturación') }
  }

  const saveLapsos = async () => {
    try {
      await updateDoc(doc(db, 'schools', schoolId), { lapsos })
      toast.success('Año escolar guardado')
      qc.invalidateQueries({ queryKey: ['school'] })
    } catch { toast.error('Error al guardar lapsos') }
  }

  const saveAcceptedMethods = async (methods: string[]) => {
    try {
      await updateDoc(doc(db, 'schools', schoolId), { acceptedMethods: methods })
      toast.success('Métodos de pago actualizados')
      qc.invalidateQueries({ queryKey: ['school'] })
    } catch { toast.error('Error al guardar métodos') }
  }

  const savePaymentMethods = async (methods: any[]) => {
    try {
      await updateDoc(doc(db, 'schools', schoolId), { paymentMethods: methods })
      toast.success('Cuentas de pago guardadas')
      qc.invalidateQueries({ queryKey: ['school'] })
    } catch { toast.error('Error al guardar cuentas') }
  }

  const uploadLogo = async (file: File) => {
    setLogoUploading(true)
    try {
      const path = `schools/${schoolId}/logo-${Date.now()}.${file.name.split('.').pop()}`
      const task = uploadBytesResumable(storageRef(storage, path), file)
      await new Promise<void>((resolve, reject) => {
        task.on('state_changed', undefined, reject, resolve)
      })
      const url = await getDownloadURL(task.snapshot.ref)
      await updateDoc(doc(db, 'schools', schoolId), { logoUrl: url })
      setSchoolInfo(s => ({ ...s, logoUrl: url }))
      toast.success('Logo actualizado')
      qc.invalidateQueries({ queryKey: ['school'] })
    } catch { toast.error('Error al subir logo') }
    finally { setLogoUploading(false) }
  }

  const addMethod = () => {
    const methodType = PAYMENT_METHOD_TYPES.find(m => m.value === newMethod.type)
    if (!methodType) return
    const data: any = { type: newMethod.type, label: methodType.label, icon: methodType.icon }
    methodType.fields.forEach(f => {
      if (newMethod[f as keyof typeof newMethod]) data[f] = newMethod[f as keyof typeof newMethod]
    })
    const updated = [...paymentMethods, data]
    setPaymentMethods(updated)
    savePaymentMethods(updated)
    setShowAddMethod(false)
    setNewMethod({ type: 'pago_movil', banco: '', telefono: '', cedula: '', cuenta: '', titular: '', cedula_rif: '', email_telefono: '', instrucciones: '', binance_id: '' })
  }

  const removeMethod = (index: number) => {
    const updated = paymentMethods.filter((_, i) => i !== index)
    setPaymentMethods(updated)
    savePaymentMethods(updated)
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked
      : e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value
    setSettings(s => ({ ...s, [k]: val }))
  }

  const setBill = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value
    setBilling(b => ({ ...b, [k]: val }))
  }

  const setNew = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setNewMethod(m => ({ ...m, [k]: e.target.value }))

  const selectedMethodType = PAYMENT_METHOD_TYPES.find(m => m.value === newMethod.type)

  const toggleAccepted = (val: string) => {
    const updated = acceptedMethods.includes(val)
      ? acceptedMethods.filter(v => v !== val)
      : [...acceptedMethods, val]
    setAcceptedMethods(updated)
    saveAcceptedMethods(updated)
  }

  const inputCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const selectCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>

      {/* 1. Información del colegio */}
      <Section icon={School} title="Información del colegio" subtitle="Nombre, dirección y logo que aparecen en los reportes">
        <div className="space-y-4">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
              {schoolInfo.logoUrl
                ? <img src={schoolInfo.logoUrl} alt="Logo" className="w-full h-full object-contain p-1"/>
                : <ImageIcon size={28} className="text-slate-300"/>
              }
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Logo del colegio</p>
              <p className="text-xs text-slate-400 mt-0.5">PNG, JPG — recomendado 256×256</p>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f) }}
              />
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
                className="mt-2 flex items-center gap-2 text-sm text-blue-600 hover:underline disabled:opacity-50"
              >
                <Upload size={13}/>
                {logoUploading ? 'Subiendo...' : 'Subir logo'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Nombre del colegio</label>
            <input className={inputCls} placeholder="Ej: U.E. Colegio San José"
              value={schoolInfo.name} onChange={e => setSchoolInfo(s => ({ ...s, name: e.target.value }))}/>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Dirección</label>
            <input className={inputCls} placeholder="Av. Principal, Ciudad"
              value={schoolInfo.address} onChange={e => setSchoolInfo(s => ({ ...s, address: e.target.value }))}/>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Teléfono</label>
            <input className={inputCls} placeholder="0412-000-0000"
              value={schoolInfo.phone} onChange={e => setSchoolInfo(s => ({ ...s, phone: e.target.value }))}/>
          </div>
          <button
            onClick={saveSchoolInfo}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            <Save size={14}/> Guardar información
          </button>
        </div>
      </Section>

      {/* 2. Notificaciones */}
      <Section icon={Bell} title="Notificaciones automáticas" subtitle="Recordatorios de pago enviados a representantes">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Activar recordatorios automáticos</p>
              <p className="text-xs text-slate-400 mt-0.5">Notifica a los representantes antes del vencimiento</p>
            </div>
            <Toggle
              enabled={notifSettings.autoRemindersEnabled}
              onToggle={() => setNotifSettings(s => ({ ...s, autoRemindersEnabled: !s.autoRemindersEnabled }))}
            />
          </div>
          {notifSettings.autoRemindersEnabled && (
            <div className="pt-2">
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                Días de anticipación para el recordatorio
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number" min="1" max="30"
                  className="w-32 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={notifSettings.reminderDaysBefore}
                  onChange={e => setNotifSettings(s => ({ ...s, reminderDaysBefore: parseInt(e.target.value) || 1 }))}
                />
                <span className="text-sm text-slate-500">días antes del vencimiento</span>
              </div>
            </div>
          )}
          <button
            onClick={saveNotifSettings}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            <Save size={14}/> Guardar notificaciones
          </button>
        </div>
      </Section>

      {/* 3. Mora */}
      <Section icon={AlertCircle} title="Configuración de mora" subtitle="Recargos por pagos fuera de fecha">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Activar multas por mora</p>
              <p className="text-xs text-slate-400 mt-0.5">Se aplica un porcentaje al monto pendiente</p>
            </div>
            <Toggle
              enabled={settings.lateFeeEnabled}
              onToggle={() => setSettings(s => ({ ...s, lateFeeEnabled: !s.lateFeeEnabled }))}
            />
          </div>
          {settings.lateFeeEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">% de multa</label>
                <input type="number" min="1" max="50" className={inputCls}
                  value={settings.lateFeePercent} onChange={set('lateFeePercent')}/>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Días de gracia</label>
                <input type="number" min="0" className={inputCls}
                  value={settings.lateFeeGraceDays} onChange={set('lateFeeGraceDays')}/>
              </div>
            </div>
          )}
          <button
            onClick={() => saveGeneralMut.mutate()}
            disabled={saveGeneralMut.isPending}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={14}/> {saveGeneralMut.isPending ? 'Guardando...' : 'Guardar mora'}
          </button>
        </div>
      </Section>

      {/* 4. Año escolar */}
      <Section icon={BookOpen} title="Año escolar" subtitle="Período y lapsos del año lectivo">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Año escolar actual</label>
            <input className={inputCls} placeholder="2024-2025"
              value={settings.currentSchoolYear} onChange={set('currentSchoolYear')}/>
          </div>
          <div className="space-y-3">
            {LAPSO_LABELS.map((label, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm font-medium text-slate-700 mb-3">{label}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Fecha inicio</label>
                    <input type="date" className={inputCls}
                      value={lapsos[i]?.start || ''}
                      onChange={e => {
                        const updated = [...lapsos]
                        updated[i] = { ...updated[i], start: e.target.value }
                        setLapsos(updated)
                      }}/>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Fecha fin</label>
                    <input type="date" className={inputCls}
                      value={lapsos[i]?.end || ''}
                      onChange={e => {
                        const updated = [...lapsos]
                        updated[i] = { ...updated[i], end: e.target.value }
                        setLapsos(updated)
                      }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={async () => { await saveLapsos(); saveGeneralMut.mutate() }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700"
            >
              <Save size={14}/> Guardar año escolar
            </button>
          </div>
        </div>
      </Section>

      {/* 5. Métodos de pago aceptados */}
      <Section icon={CreditCard} title="Métodos de pago aceptados" subtitle="Los representantes podrán pagar con estos métodos">
        <div className="space-y-2">
          {ACCEPTED_METHODS.map(m => (
            <label key={m.value} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={acceptedMethods.includes(m.value)}
                onChange={() => toggleAccepted(m.value)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-xl">{m.icon}</span>
              <span className="text-sm font-medium text-slate-700">{m.label}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* 6. Cuentas de pago */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <CreditCard size={18} className="text-blue-600"/>
            </div>
            <div>
              <h2 className="font-semibold text-slate-700">Cuentas de pago</h2>
              <p className="text-xs text-slate-400 mt-0.5">Datos que verán los representantes para pagar</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddMethod(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus size={14}/> Agregar
          </button>
        </div>
        {paymentMethods.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-400">
            <CreditCard size={32} className="mx-auto mb-2 opacity-30"/>
            <p className="text-sm">No hay cuentas configuradas</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {paymentMethods.map((m, i) => (
              <div key={i} className="px-6 py-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{m.icon}</span>
                  <div>
                    <p className="font-medium text-slate-700">{m.label}</p>
                    <div className="mt-1 space-y-0.5">
                      {Object.entries(m).filter(([k]) => !['type','label','icon'].includes(k)).map(([k, v]) => (
                        <p key={k} className="text-xs text-slate-500">
                          <span className="font-medium text-slate-600">{FIELD_LABELS[k] || k}:</span> {v as string}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={() => removeMethod(i)} className="text-slate-400 hover:text-red-500 mt-1">
                  <Trash2 size={16}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. Facturación automática */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Calendar size={18} className="text-blue-600"/>
            </div>
            <div>
              <h2 className="font-semibold text-slate-700">Facturación automática mensual</h2>
              <p className="text-xs text-slate-400 mt-0.5">Genera cobros de mensualidad automáticamente</p>
            </div>
          </div>
          <Toggle
            enabled={billing.enabled}
            onToggle={() => setBilling(b => ({ ...b, enabled: !b.enabled }))}
          />
        </div>
        {billing.enabled ? (
          <div className="px-6 py-5 space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-xs text-blue-700">
                El sistema generará el cobro mensual a partir del día <strong>{billing.billingDay}</strong>,
                con vencimiento el día <strong>{billing.dueDay}</strong>.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Descripción</label>
              <input className={inputCls} placeholder="Mensualidad" value={billing.description} onChange={setBill('description')}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Monto</label>
                <input type="number" className={inputCls} value={billing.amount} onChange={setBill('amount')}/>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Moneda</label>
                <select className={selectCls} value={billing.currency} onChange={setBill('currency')}>
                  <option value="USD">USD — Dólar</option>
                  <option value="VES">VES — Bolívar</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Día de generación</label>
                <select className={selectCls} value={billing.billingDay} onChange={setBill('billingDay')}>
                  {DAYS.map(d => <option key={d} value={d}>Día {d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Día de vencimiento</label>
                <select className={selectCls} value={billing.dueDay} onChange={setBill('dueDay')}>
                  {DAYS.map(d => <option key={d} value={d}>Día {d}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={saveBilling}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700"
            >
              <Save size={14}/> Guardar facturación
            </button>
          </div>
        ) : (
          <div className="px-6 py-4 text-center text-slate-400">
            <p className="text-sm">Activa el interruptor para configurar la facturación automática</p>
          </div>
        )}
      </div>

      {/* 8. Tarifas base + moneda */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        <div className="px-6 py-4">
          <h2 className="font-semibold text-slate-700 mb-4">General</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Moneda principal</label>
              <select className={selectCls} value={settings.currency} onChange={set('currency')}>
                <option value="USD">USD — Dólar</option>
                <option value="VES">VES — Bolívar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="COP">COP — Peso colombiano</option>
              </select>
            </div>
          </div>
        </div>
        <div className="px-6 py-4">
          <h2 className="font-semibold text-slate-700 mb-4">Tarifas base</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Mensualidad base</label>
              <input type="number" className={inputCls} value={settings.monthlyFee} onChange={set('monthlyFee')}/>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Inscripción</label>
              <input type="number" className={inputCls} value={settings.enrollmentFee} onChange={set('enrollmentFee')}/>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => saveGeneralMut.mutate()}
        disabled={saveGeneralMut.isPending}
        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        <Save size={16}/>{saveGeneralMut.isPending ? 'Guardando...' : 'Guardar configuración general'}
      </button>

      {/* Modal: add payment method */}
      {showAddMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Agregar cuenta de pago</h3>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Tipo de método</label>
                <select className={selectCls} value={newMethod.type} onChange={setNew('type')}>
                  {PAYMENT_METHOD_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </div>
              {selectedMethodType?.fields.map(field => (
                <div key={field}>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">{FIELD_LABELS[field]}</label>
                  <input
                    className={inputCls}
                    placeholder={FIELD_LABELS[field]}
                    value={newMethod[field as keyof typeof newMethod]}
                    onChange={setNew(field)}
                  />
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowAddMethod(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={addMethod}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm hover:bg-blue-700 font-medium"
              >
                Guardar cuenta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
