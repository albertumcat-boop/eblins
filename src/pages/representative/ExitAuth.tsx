import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getStudentsByRepresentative, createExitAuth, getExitAuthsByRep } from '@/services/db'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { LogOut, Plus, Clock, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import clsx from 'clsx'

const STATUS = {
  pending:  { label: 'Pendiente',  color: 'bg-amber-100 text-amber-700',  icon: Clock },
  approved: { label: 'Aprobada',   color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  rejected: { label: 'Rechazada',  color: 'bg-red-100 text-red-700',      icon: XCircle },
}

const REASONS = [
  'Cita médica', 'Emergencia familiar', 'Trámite administrativo',
  'Actividad extracurricular', 'Visita al odontólogo', 'Otro',
]

const today = () => format(new Date(), 'yyyy-MM-dd')

export default function RepExitAuth() {
  const { appUser } = useAuth()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    studentId: '', date: today(), exitTime: '12:00',
    returnTime: '', reason: REASONS[0], customReason: '',
    authorizedPerson: '', authorizedPersonId: '',
  })

  const { data: students = [] } = useQuery({
    queryKey: ['my-students', appUser?.id],
    queryFn: () => getStudentsByRepresentative(appUser!.id, appUser!.schoolId),
    enabled: !!appUser?.id,
  })

  const { data: auths = [], isLoading } = useQuery({
    queryKey: ['exit-auths', appUser?.id],
    queryFn: () => getExitAuthsByRep(appUser!.id, appUser!.schoolId),
    enabled: !!appUser?.id,
  })

  const openForm = () => {
    setForm({ studentId: students[0]?.id || '', date: today(), exitTime: '12:00',
      returnTime: '', reason: REASONS[0], customReason: '', authorizedPerson: '', authorizedPersonId: '' })
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!form.studentId || !form.date || !form.exitTime || !form.authorizedPerson.trim()) {
      toast.error('Completa los campos obligatorios')
      return
    }
    const student = students.find(s => s.id === form.studentId)
    if (!student) return
    setSaving(true)
    try {
      await createExitAuth({
        schoolId: appUser!.schoolId,
        studentId: student.id,
        studentName: student.fullName,
        representativeId: appUser!.id,
        representativeName: appUser!.displayName,
        grade: student.grade,
        section: student.section,
        date: form.date,
        exitTime: form.exitTime,
        returnTime: form.returnTime || null,
        reason: form.reason === 'Otro' ? form.customReason : form.reason,
        authorizedPerson: form.authorizedPerson,
        authorizedPersonId: form.authorizedPersonId || null,
      })
      toast.success('Autorización enviada al docente')
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['exit-auths'] })
    } catch { toast.error('Error al enviar') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Autorizaciones de Salida</h1>
        <button onClick={openForm}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">
          <Plus size={15}/>Nueva solicitud
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : auths.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <LogOut size={36} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">Sin solicitudes de salida</p>
          <p className="text-xs mt-1">Crea una para avisar al docente con anticipación</p>
        </div>
      ) : (
        <div className="space-y-3">
          {auths.map((a: any) => {
            const cfg = STATUS[a.status as keyof typeof STATUS] || STATUS.pending
            const Icon = cfg.icon
            return (
              <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{a.studentName}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {format(new Date(a.date + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es })} · Salida {a.exitTime}
                      {a.returnTime && ` · Retorno ${a.returnTime}`}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      <span className="font-medium">Motivo:</span> {a.reason}
                    </p>
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Persona autorizada:</span> {a.authorizedPerson}
                      {a.authorizedPersonId && ` (CI: ${a.authorizedPersonId})`}
                    </p>
                    {a.notes && (
                      <p className="text-xs text-slate-500 mt-1 italic">Nota del docente: {a.notes}</p>
                    )}
                  </div>
                  <span className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0', cfg.color)}>
                    <Icon size={12}/>{cfg.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Nueva autorización de salida</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Estudiante *</label>
                <select value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Fecha *</label>
                  <input type="date" value={form.date} min={today()}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Hora de salida *</label>
                  <input type="time" value={form.exitTime}
                    onChange={e => setForm(f => ({ ...f, exitTime: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Hora de retorno <span className="text-slate-400 font-normal">(opcional)</span></label>
                <input type="time" value={form.returnTime}
                  onChange={e => setForm(f => ({ ...f, returnTime: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Motivo *</label>
                <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {REASONS.map(r => <option key={r}>{r}</option>)}
                </select>
                {form.reason === 'Otro' && (
                  <input className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Especifica el motivo..." value={form.customReason}
                    onChange={e => setForm(f => ({ ...f, customReason: e.target.value }))}/>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Persona que retira *</label>
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre completo" value={form.authorizedPerson}
                  onChange={e => setForm(f => ({ ...f, authorizedPerson: e.target.value }))}/>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Cédula/ID de quien retira <span className="text-slate-400 font-normal">(opcional)</span></label>
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Número de cédula" value={form.authorizedPersonId}
                  onChange={e => setForm(f => ({ ...f, authorizedPersonId: e.target.value }))}/>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                <AlertCircle size={13} className="inline mr-1"/>
                La solicitud será enviada al docente para su aprobación.
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowForm(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
