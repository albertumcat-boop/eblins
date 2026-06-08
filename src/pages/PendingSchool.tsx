import { useAuth } from '@/context/AuthContext'

export default function PendingSchool() {
  const { appUser, logout } = useAuth()

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#050d1a' }}
    >
      <div className="max-w-md w-full mx-4 text-center">
        {/* Icon */}
        <div className="text-7xl mb-6 select-none">⏳</div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-3">
          Cuenta en revisión
        </h1>

        {/* Description */}
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          Tu cuenta ha sido creada correctamente. El administrador de tu colegio
          debe asignarte al sistema. Si ya tienes un código de inscripción,
          contáctate con la administración del colegio.
        </p>

        {/* User email */}
        {appUser?.email && (
          <div className="inline-flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 mb-6">
            <span className="text-xs text-slate-400">Sesión activa como</span>
            <span className="text-xs font-medium text-slate-200">{appUser.email}</span>
          </div>
        )}

        {/* Primary action */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => logout()}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Cerrar sesión
          </button>

          {/* Secondary action */}
          <a
            href="mailto:soporte@edufinance.app"
            className="w-full py-2.5 px-4 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-medium rounded-lg transition-colors text-center text-sm"
          >
            ¿Necesitas ayuda?
          </a>
        </div>
      </div>
    </div>
  )
}
