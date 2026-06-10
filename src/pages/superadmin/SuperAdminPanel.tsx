import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

interface SchoolDoc {
  id: string
  name: string
  city?: string
  createdAt?: { toDate?: () => Date } | null
  active?: boolean
  [key: string]: unknown
}

interface SchoolRow extends SchoolDoc {
  studentCount: number
  userCount: number
  paymentCount: number
  plan: string
}

function getPlan(students: number): string {
  if (students <= 100) return 'Básico'
  if (students <= 500) return 'Pro'
  return 'Premium'
}

function formatDate(ts: SchoolDoc['createdAt']): string {
  if (!ts) return '—'
  if (typeof ts.toDate === 'function') return ts.toDate().toLocaleDateString('es-VE')
  return '—'
}

interface DetailModalProps {
  school: SchoolRow
  onClose: () => void
}

function DetailModal({ school, onClose }: DetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="font-bold text-slate-800 text-lg">{school.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <Row label="ID" value={school.id} />
          <Row label="Ciudad" value={school.city ?? '—'} />
          <Row label="Fecha de registro" value={formatDate(school.createdAt)} />
          <Row label="Estado" value={school.active !== false ? 'Activo' : 'Inactivo'} />
          <Row label="Plan" value={school.plan} />
          <Row label="Estudiantes" value={String(school.studentCount)} />
          <Row label="Usuarios" value={String(school.userCount)} />
          <Row label="Pagos aprobados" value={String(school.paymentCount)} />

          {/* Raw config fields */}
          <div className="pt-3 border-t border-slate-100">
            <p className="font-semibold text-slate-600 mb-2">Configuración completa</p>
            <pre className="bg-slate-50 rounded p-3 text-xs text-slate-700 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(
                Object.fromEntries(
                  Object.entries(school).filter(([k]) =>
                    !['studentCount', 'userCount', 'paymentCount', 'plan'].includes(k)
                  )
                ),
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-800 font-medium text-right break-all">{value}</span>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-blue-600">{value}</p>
    </div>
  )
}

const SUPER_ADMIN_EMAIL = 'albert.umcat@gmail.com'

export default function SuperAdminPanel() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<SchoolRow[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalStudents, setTotalStudents] = useState(0)
  const [totalPayments, setTotalPayments] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SchoolRow | null>(null)
  const [cleaning, setCleaning] = useState(false)
  const [cleanConfirm, setCleanConfirm] = useState(false)
  const [cleanResult, setCleanResult] = useState<{ deleted: number; roles: Record<string, number> } | null>(null)

  useEffect(() => {
    if (appUser?.email !== SUPER_ADMIN_EMAIL) {
      navigate('/', { replace: true })
      return
    }
    loadData()
  }, [appUser])

  async function loadData() {
    setLoading(true)
    try {
      const [schoolsSnap, usersSnap, studentsSnap, paymentsSnap] = await Promise.all([
        getDocs(collection(db, 'schools')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'students')),
        getDocs(query(collection(db, 'payments'), where('status', '==', 'approved'))),
      ])

      const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; schoolId?: string }))
      const allStudents = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; schoolId?: string }))
      const allPayments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; schoolId?: string }))

      setTotalUsers(allUsers.length)
      setTotalStudents(allStudents.length)
      setTotalPayments(allPayments.length)

      const built: SchoolRow[] = schoolsSnap.docs.map(d => {
        const school = { id: d.id, ...d.data() } as SchoolDoc
        const sc = allStudents.filter(s => s.schoolId === d.id).length
        const uc = allUsers.filter(u => u.schoolId === d.id).length
        const pc = allPayments.filter(p => p.schoolId === d.id).length
        return { ...school, studentCount: sc, userCount: uc, paymentCount: pc, plan: getPlan(sc) }
      })

      setRows(built)
    } finally {
      setLoading(false)
    }
  }

  async function cleanNonAdminUsers() {
    setCleaning(true)
    setCleanResult(null)
    try {
      const snap = await getDocs(collection(db, 'users'))
      const toDelete = snap.docs.filter(d => {
        const role = d.data().role
        return role === 'representative' || role === 'teacher'
      })
      const roleCounts: Record<string, number> = {}
      for (const d of toDelete) {
        const role = d.data().role as string
        roleCounts[role] = (roleCounts[role] ?? 0) + 1
        await deleteDoc(doc(db, 'users', d.id))
      }
      setCleanResult({ deleted: toDelete.length, roles: roleCounts })
      toast.success(`${toDelete.length} usuario(s) eliminado(s)`)
      setCleanConfirm(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Error al eliminar usuarios')
    } finally {
      setCleaning(false)
    }
  }

  if (appUser?.email !== SUPER_ADMIN_EMAIL) return null

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <span className="text-xl font-bold text-blue-600">EduFinance</span>
        <span className="text-slate-300">|</span>
        <span className="text-sm font-semibold text-slate-600">Super Admin</span>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Panel Super-Admin</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <KpiCard label="Total escuelas" value={rows.length} />
              <KpiCard label="Total usuarios" value={totalUsers} />
              <KpiCard label="Total estudiantes" value={totalStudents} />
              <KpiCard label="Pagos aprobados" value={totalPayments} />
            </div>

            {/* Limpieza de usuarios */}
            <div className="bg-white rounded-xl border border-red-200 overflow-hidden mb-8">
              <div className="px-5 py-4 border-b border-red-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-red-700">🗑️ Limpieza de usuarios</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Elimina todos los registros de representantes y docentes de Firestore. Los administradores NO se tocan.</p>
                </div>
                {!cleanConfirm && (
                  <button
                    onClick={() => setCleanConfirm(true)}
                    className="text-sm bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Limpiar usuarios
                  </button>
                )}
              </div>

              {cleanConfirm && (
                <div className="px-5 py-4 bg-red-50">
                  <p className="text-sm text-red-800 font-semibold mb-1">⚠️ ¿Confirmar eliminación?</p>
                  <p className="text-xs text-red-600 mb-4">Se eliminarán TODOS los documentos en <code>/users</code> con rol <code>representative</code> o <code>teacher</code>. Esta acción no se puede deshacer.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={cleanNonAdminUsers}
                      disabled={cleaning}
                      className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                      {cleaning && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block"/>}
                      {cleaning ? 'Eliminando...' : 'Sí, eliminar todos'}
                    </button>
                    <button
                      onClick={() => setCleanConfirm(false)}
                      className="text-sm border border-slate-200 text-slate-600 px-4 py-2 rounded-lg"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {cleanResult && (
                <div className="px-5 py-3 bg-green-50 border-t border-green-100">
                  <p className="text-sm text-green-700 font-semibold">✅ Limpieza completada: {cleanResult.deleted} usuario(s) eliminado(s)</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {Object.entries(cleanResult.roles).map(([r, n]) => `${r}: ${n}`).join(' · ')}
                  </p>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-700">Escuelas registradas</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Nombre</th>
                      <th className="px-4 py-3 text-left">Ciudad</th>
                      <th className="px-4 py-3 text-left">Registro</th>
                      <th className="px-4 py-3 text-right">Estudiantes</th>
                      <th className="px-4 py-3 text-right">Usuarios</th>
                      <th className="px-4 py-3 text-right">Pagos</th>
                      <th className="px-4 py-3 text-center">Plan</th>
                      <th className="px-4 py-3 text-center">Estado</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                          No hay escuelas registradas.
                        </td>
                      </tr>
                    )}
                    {rows.map(row => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{row.name ?? row.id}</td>
                        <td className="px-4 py-3 text-slate-500">{row.city ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(row.createdAt)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{row.studentCount}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{row.userCount}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{row.paymentCount}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
                            ${row.plan === 'Premium' ? 'bg-purple-100 text-purple-700' :
                              row.plan === 'Pro' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-600'}`}>
                            {row.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block w-2 h-2 rounded-full ${row.active !== false ? 'bg-green-500' : 'bg-red-400'}`} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelected(row)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Ver detalles
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {selected && <DetailModal school={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
