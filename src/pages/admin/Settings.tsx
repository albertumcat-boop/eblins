import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getSchool, updateSchoolSettings } from '@/services/db'
import toast from 'react-hot-toast'
import { Save } from 'lucide-react'

export default function AdminSettings() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''
  const qc = useQueryClient()
  const { data: school } = useQuery({ queryKey: ['school', schoolId], queryFn: () => getSchool(schoolId), enabled: !!schoolId })
  const [settings, setSettings] = useState({
    currency: school?.settings?.currency || 'USD',
    lateFeeEnabled: school?.settings?.lateFeeEnabled ?? false,
    lateFeePercent: school?.settings?.lateFeePercent || 5,
    lateFeeGraceDays: school?.settings?.lateFeeGraceDays || 5,
    monthlyFee: school?.settings?.monthlyFee || 0,
    enrollmentFee: school?.settings?.enrollmentFee || 0,
    currentSchoolYear: school?.settings?.currentSchoolYear || '2024-2025',
  })
  const saveMut = useMutation({
    mutationFn: () => updateSchoolSettings(schoolId, settings),
    onSuccess: () => { toast.success('Configuración guardada'); qc.invalidateQueries({ queryKey: ['school'] }) },
    onError: () => toast.error('Error al guardar'),
  })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked
      : e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value
    setSettings(s => ({ ...s, [k]: val }))
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        <div className="px-6 py-4">
          <h2 className="font-semibold text-slate-700 mb-4">General</h2>
          <div className="space-y-4">
            <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Año escolar actual</label>
              <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={settings.currentSchoolYear} onChange={set('currentSchoolYear')}/></div>
            <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Moneda</label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={settings.currency} onChange={set('currency')}>
                <option value="USD">USD — Dólar</option><option value="VES">VES — Bolívar</option>
                <option value="EUR">EUR — Euro</option><option value="COP">COP — Peso colombiano</option>
              </select></div>
          </div>
        </div>
        <div className="px-6 py-4">
          <h2 className="font-semibold text-slate-700 mb-4">Tarifas base</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Mensualidad base ($)</label>
              <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={settings.monthlyFee} onChange={set('monthlyFee')}/></div>
            <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Inscripción ($)</label>
              <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={settings.enrollmentFee} onChange={set('enrollmentFee')}/></div>
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
                <div><label className="text-sm font-medium text-slate-700 block mb-1.5">% de multa</label>
                  <input type="number" min="1" max="50" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={settings.lateFeePercent} onChange={set('lateFeePercent')}/></div>
                <div><label className="text-sm font-medium text-slate-700 block mb-1.5">Días de gracia</label>
                  <input type="number" min="0" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={settings.lateFeeGraceDays} onChange={set('lateFeeGraceDays')}/></div>
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
