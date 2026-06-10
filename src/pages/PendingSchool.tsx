import { useAuth } from '@/context/AuthContext'
import { Clock, LogOut, Mail } from 'lucide-react'

export default function PendingSchool() {
  const { appUser, logout } = useAuth()

  const isPendingApproval = appUser?.status === 'pending_approval'

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#050d1a' }}>
      <div className="max-w-md w-full text-center">

        <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
          style={{ background: 'rgba(29,111,244,0.15)', border: '1px solid rgba(29,111,244,0.3)' }}>
          <Clock size={36} className="text-blue-400"/>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          {isPendingApproval ? 'Registro recibido' : 'Cuenta en revisión'}
        </h1>

        <p className="text-slate-400 text-sm leading-relaxed mb-2">
          {isPendingApproval
            ? 'Tu solicitud fue enviada al administrador del colegio. En cuanto apruebe tu cuenta, podrás acceder al sistema.'
            : 'Tu cuenta ha sido creada. El administrador de tu colegio debe asignarte al sistema.'}
        </p>

        {isPendingApproval && (
          <div className="mt-4 mb-6 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-left">
            <p className="text-amber-300 text-xs font-semibold mb-1">¿Qué pasa ahora?</p>
            <ul className="text-amber-200/70 text-xs space-y-1">
              <li>• El administrador del colegio recibirá tu solicitud</li>
              <li>• Una vez que te aprueben, podrás iniciar sesión normalmente</li>
              <li>• Si no recibes respuesta, contacta directamente al colegio</li>
            </ul>
          </div>
        )}

        {appUser?.email && (
          <div className="inline-flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 mb-6">
            <Mail size={13} className="text-slate-400"/>
            <span className="text-xs text-slate-300">{appUser.email}</span>
          </div>
        )}

        <button
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors text-sm">
          <LogOut size={15}/> Cerrar sesión
        </button>
      </div>
    </div>
  )
}
