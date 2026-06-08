import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-200 bg-white">
        <span className="text-xl font-bold text-blue-600">EduFinance</span>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-blue-100 opacity-50" />
        <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full bg-indigo-100 opacity-40" />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full bg-sky-100 opacity-60" />

        <div className="relative z-10 text-center px-4">
          {/* 404 number */}
          <p className="text-8xl font-extrabold text-blue-600 leading-none mb-4">
            404
          </p>

          {/* Title */}
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Página no encontrada
          </h1>

          {/* Description */}
          <p className="text-slate-500 mb-8">
            La página que buscas no existe o fue movida.
          </p>

          {/* CTA */}
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            ← Volver al inicio
          </button>
        </div>
      </div>
    </div>
  )
}
