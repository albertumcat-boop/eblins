import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { saveSupplies, getAllSupplies } from '@/services/db'
import toast from 'react-hot-toast'
import { Save, ShoppingBag } from 'lucide-react'

const GRADES = ['1er','2do','3er','4to','5to','6to','7mo','8vo','9no','10mo','11vo','12vo']

export default function AdminSupplies() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''
  const qc = useQueryClient()
  const [grade, setGrade] = useState('1er')
  const [supplies, setSupplies] = useState('')
  const [uniforms, setUniforms] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: allSupplies = [] } = useQuery({
    queryKey: ['supplies', schoolId],
    queryFn: () => getAllSupplies(schoolId),
    enabled: !!schoolId,
  })

  useEffect(() => {
    const current = allSupplies.find((s: any) => s.grade === grade) as any
    setSupplies(current?.supplies || '')
    setUniforms(current?.uniforms || '')
  }, [grade, allSupplies])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSupplies(schoolId, grade, { supplies, uniforms })
      toast.success('Lista guardada')
      qc.invalidateQueries({ queryKey: ['supplies'] })
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800">Útiles y Uniformes</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Grado</label>
          <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={grade} onChange={e => setGrade(e.target.value)}>
            {GRADES.map(g => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">📦 Lista de útiles escolares</label>
          <textarea rows={8} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="- Cuaderno cuadriculado (3 unidades)&#10;- Lápices HB (1 caja)&#10;- Regla 30cm&#10;- Calculadora científica..."
            value={supplies} onChange={e => setSupplies(e.target.value)}/>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">👔 Uniformes escolares</label>
          <textarea rows={6} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Uniforme diario:&#10;- Pantalón azul marino&#10;- Camisa blanca con logo&#10;&#10;Uniforme de educación física:&#10;- Franela gris con logo&#10;- Pantalón deportivo azul..."
            value={uniforms} onChange={e => setUniforms(e.target.value)}/>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          <Save size={15}/>{saving ? 'Guardando...' : 'Guardar lista'}
        </button>
      </div>
    </div>
  )
}
