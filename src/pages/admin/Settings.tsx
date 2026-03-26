import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getSchool, updateSchoolSettings } from '@/services/db'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/services/firebase'
import toast from 'react-hot-toast'
import { Save, Plus, Trash2, CreditCard, Smartphone, DollarSign, Banknote } from 'lucide-react'

const PAYMENT_METHOD_TYPES = [
  { value: 'pago_movil',    label: 'Pago Móvil',          icon: '📱', fields: ['banco', 'telefono', 'cedula'] },
  { value: 'transferencia', label: 'Transferencia Bancaria', icon: '🏦', fields: ['banco', 'cuenta', 'titular', 'cedula_rif'] },
  { value: 'zelle',         label: 'Zelle',               icon: '💵', fields: ['email_telefono', 'titular'] },
  { value: 'efectivo',      label: 'Efectivo',            icon: '💴', fields: ['instrucciones'] },
]

const FIELD_LABELS: Record<string, string> = {
  banco:         'Banco',
  telefono:      'Número de teléfono',
  cedula:        'Cédula del titular',
  cuenta:        'Número de cuenta',
  titular:       'Nombre del titular',
  cedula_rif:    'Cédula / RIF',
  email_telefono:'Email o teléfono Zelle',
  instrucciones: 'Instrucciones para pago en efectivo',
}

export default function AdminSettings() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''
  const qc = useQueryClient()

  const { data: school } = useQuery({
    queryKey: ['school', schoolId],
    queryFn: () => getSchool(schoolId),
    enabled: !!schoolId,
  })

  const [settings, setSettings] = useState({
    currency: 'USD',
    lateFeeEnabled: false,
    lateFeePercent: 5,
    lateFeeGraceDays: 5,
    monthlyFee: 150,
    enrollmentFee: 300,
    currentSchoolYear: '2024-2025',
  })

  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [showAddMethod, setShowAddMethod] = useState(false)
  const [newMethod, setNewMethod] = useState({ type: 'pago_movil', banco: '', telefono: '', cedula: '', cuenta: '', titular: '', cedula_rif: '', email_telefono: '', instrucciones: '' })

  useEffect(() => {
    if (school) {
      setSettings({
        currency:          school.settings?.currency || 'USD',
        lateFeeEnabled:    school.settings?.lateFeeEnabled ?? false,
        lateFeePercent:    school.settings?.lateFeePercent || 5,
        lateFeeGraceDays:  school.settings?.lateFeeGraceDays || 5,
        monthlyFee:        school.settings?.monthlyFee || 0,
        enrollmentFee:     school.settings?.enrollmentFee || 0,
        currentSchoolYear: school.settings?.currentSchoolYear || '2024-2025',
      })
      setPaymentMethods((school as any).paymentMethods || [])
    }
  }, [school])

  const saveMut = useMutation({
    mutationFn: () => updateSchoolSettings(schoolId, settings),
    onSuccess: () => { toast.success('Configuración guardada'); qc.invalidateQueries({ queryKey: ['school'] }) },
    onError: () => toast.error('Error al guardar'),
  })

  const savePaymentMethods = async (methods: any[]) => {
    try {
      await updateDoc(doc(db, 'schools', schoolId), { paymentMethods: methods })
      toast.success('Métodos de pago guardados')
      qc.invalidateQueries({ queryKey: ['school'] })
    } catch { toast.error('Error al guardar métodos de pago') }
  }

  const addMethod = () => {
    const methodType = PAYMENT_METHOD_TYPES.find(m => m.value === newMethod.type)
    if (!methodType) return
    const data: any = { type: newMethod.type, label: methodType.label, icon: methodType.icon }
    methodType.fields.forEach(f => { if (newMethod[f as keyof typeof newMethod]) data[f] = newMethod[f as keyof typeof newMethod] })
    const updated = [...paymentMethods, data]
    setPaymentMethods(updated)
    savePaymentMethods(updated)
    setShowAddMethod(false)
    setNewMethod({ type: 'pago_movil', banco: '', telefono: '', cedula: '', cuenta: '', titular: '', cedula_rif: '', email_telefono: '', instrucciones: '' })
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

  const setNew = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setNewMethod(m => ({ ...m, [k]: e.target.value }))

  const selectedMethodType = PAYMENT_METHOD_TYPES.find(m => m.value === newMethod.type)

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>

      {/* Métodos de pago */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-700">Métodos de pago</h2>
            <p className="text-xs text-slate-400 mt-0.5">Los representantes verán estos datos para realizar sus pagos</p>
          </div>
          <button onClick={() => setShowAddMethod(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700">
            <Plus size={14}/> Agregar
          </button>
        </div>

        {paymentMethods.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-400">
            <CreditCard size={32} className="mx-auto mb-2 opacity-30"/>
            <p className="text-sm">No hay métodos de pago configurados</p>
            <p className="text-xs mt-1">Agrega Pago Móvil, Transferencia, Zelle o Efectivo</p>
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

      {/* Modal agregar método */}
      {showAddMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Agregar método de pago</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Tipo de método</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newMethod.type} onChange={setNew('type')}>
                  {PAYMENT_METHOD_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </div>
              {selectedMethodType?.fields.map(field => (
                <div key={field}>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">{FIELD_LABELS[field]}</label>
                  <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={FIELD_LABELS[field]}
                    value={newMethod[field as keyof typeof newMethod]}
                    onChange={setNew(field)}/>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowAddMethod(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={addMethod} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm hover:bg-blue-700 font-medium">Guardar método</button>
            </div>
          </div>
        </div>
      )}

      {/* Configuración general */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        <div className="px-6 py-4">
          <h2 className="font-semibold text-slate-700 mb-4">General</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Año escolar actual</label>
              <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.currentSchoolYear} onChange={set('currentSchoolYear')}/>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Moneda principal</label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.currency} onChange={set('currency')}>
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
              <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.monthlyFee} onChange={set('monthlyFee')}/>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Inscripción</label>
              <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.enrollmentFee} onChange={set('enrollmentFee')}/>
            </div>
          </div>
        </div>
        <div className="px-6 py-4">
          <h2 className="font-semibold text-slate-700 mb-4">Multas por mora</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={settings.lateFeeEnabled} onChange={set('lateFeeEnabled')} className="w-4 h-4 accent-blue-600"/>
              <span className="text-sm text-slate-700">Activar multas por mora</span>
            </label>
            {settings.lateFeeEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">% de multa</label>
                  <input type="number" min="1" max="50" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.lateFeePercent} onChange={set('lateFeePercent')}/>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Días de gracia</label>
                  <input type="number" min="0" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.lateFeeGraceDays} onChange={set('lateFeeGraceDays')}/>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
        <Save size={16}/>{saveMut.isPending ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </div>
  )
}
