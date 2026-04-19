import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'

export default function Landing() {
  return (
    <div style={{ fontFamily: "'Sora', sans-serif", background: '#050d1a', color: '#e8f0ff', minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        :root { --blue: #1d6ff4; --blue2: #3b82f6; --cyan: #06c8f0; --green: #00e5a0; --muted: #6b8ab8; --border: rgba(29,111,244,0.2); --navy2: #0a1628; --navy3: #0f1f3d; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .l-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 20px 48px; background: rgba(5,13,26,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); }
        .l-logo { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(135deg,#fff 0%,var(--cyan) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: flex; align-items: center; gap: 10px; }
        .l-logo-icon { width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg,var(--blue),var(--cyan)); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: #fff; -webkit-text-fill-color: #fff; }
        .l-nav-links { display: flex; align-items: center; gap: 32px; }
        .l-nav-links a { color: var(--muted); text-decoration: none; font-size: 14px; font-weight: 500; transition: color .2s; }
        .l-nav-links a:hover { color: #e8f0ff; }
        .l-nav-cta { background: var(--blue); color: #fff; padding: 10px 24px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 600; transition: all .2s; }
        .l-nav-cta:hover { background: var(--blue2); }
        .l-hero { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 120px 24px 80px; position: relative; overflow: hidden; }
        .l-hero::before { content: ''; position: absolute; width: 800px; height: 800px; border-radius: 50%; background: radial-gradient(circle,rgba(29,111,244,0.15) 0%,transparent 70%); top: 50%; left: 50%; transform: translate(-50%,-50%); pointer-events: none; }
        .l-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(29,111,244,0.1); border: 1px solid rgba(29,111,244,0.3); padding: 8px 18px; border-radius: 100px; font-size: 13px; color: var(--blue2); font-weight: 500; margin-bottom: 32px; animation: fadeUp .6s ease both; }
        .l-badge span { width: 6px; height: 6px; border-radius: 50%; background: var(--cyan); display: inline-block; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;}50%{opacity:0.4;} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);} }
        .l-h1 { font-size: clamp(42px,6vw,80px); font-weight: 800; line-height: 1.05; letter-spacing: -2px; margin-bottom: 24px; animation: fadeUp .6s .1s ease both; }
        .l-h1 em { font-style: normal; background: linear-gradient(135deg,var(--blue2),var(--cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .l-sub { font-size: 18px; color: var(--muted); max-width: 560px; margin: 0 auto 48px; font-weight: 400; line-height: 1.7; animation: fadeUp .6s .2s ease both; }
        .l-actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; animation: fadeUp .6s .3s ease both; }
        .l-btn-primary { background: linear-gradient(135deg,var(--blue),var(--blue2)); color: #fff; padding: 16px 36px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 600; box-shadow: 0 0 40px rgba(29,111,244,0.3); transition: all .25s; display: inline-flex; align-items: center; gap: 10px; }
        .l-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 50px rgba(29,111,244,0.5); }
        .l-btn-secondary { background: transparent; color: #e8f0ff; padding: 16px 36px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 500; border: 1px solid var(--border); transition: all .25s; }
        .l-btn-secondary:hover { border-color: var(--blue); color: var(--blue); }
        .l-stats { display: flex; max-width: 700px; margin: 64px auto 0; border: 1px solid var(--border); border-radius: 20px; background: rgba(10,22,40,0.8); backdrop-filter: blur(10px); overflow: hidden; animation: fadeUp .6s .4s ease both; }
        .l-stat { flex: 1; padding: 28px 32px; text-align: center; border-right: 1px solid var(--border); }
        .l-stat:last-child { border-right: none; }
        .l-stat-num { font-size: 32px; font-weight: 800; background: linear-gradient(135deg,#fff,var(--cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-family: 'JetBrains Mono', monospace; }
        .l-stat-label { font-size: 12px; color: var(--muted); margin-top: 4px; font-weight: 500; }
        .l-section { padding: 100px 24px; }
        .l-container { max-width: 1100px; margin: 0 auto; }
        .l-tag { font-size: 12px; font-weight: 700; letter-spacing: 2px; color: var(--blue2); text-transform: uppercase; margin-bottom: 16px; display: block; }
        .l-title { font-size: clamp(32px,4vw,52px); font-weight: 800; letter-spacing: -1.5px; line-height: 1.1; margin-bottom: 20px; }
        .l-desc { font-size: 18px; color: var(--muted); max-width: 560px; line-height: 1.7; }
        .l-features-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(300px,1fr)); gap: 2px; background: var(--border); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; margin-top: 64px; }
        .l-feature-card { background: var(--navy2); padding: 40px; transition: background .2s; position: relative; overflow: hidden; }
        .l-feature-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg,transparent,var(--blue),transparent); opacity: 0; transition: opacity .3s; }
        .l-feature-card:hover { background: var(--navy3); }
        .l-feature-card:hover::before { opacity: 1; }
        .l-feature-icon { width: 48px; height: 48px; border-radius: 14px; background: rgba(29,111,244,0.1); border: 1px solid rgba(29,111,244,0.2); display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 20px; }
        .l-feature-title { font-size: 18px; font-weight: 700; margin-bottom: 10px; }
        .l-feature-desc { font-size: 14px; color: var(--muted); line-height: 1.7; }
        .l-roles { background: var(--navy2); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .l-roles-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(280px,1fr)); gap: 24px; margin-top: 64px; }
        .l-role-card { border: 1px solid var(--border); border-radius: 20px; padding: 36px; background: #050d1a; transition: all .3s; }
        .l-role-card:hover { border-color: var(--blue); transform: translateY(-4px); }
        .l-role-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
        .l-role-emoji { font-size: 28px; }
        .l-role-name { font-size: 18px; font-weight: 700; }
        .l-role-badge { font-size: 11px; font-weight: 600; letter-spacing: 1px; padding: 4px 10px; border-radius: 100px; margin-top: 4px; display: inline-block; }
        .badge-admin { background: rgba(29,111,244,0.15); color: var(--blue2); }
        .badge-rep { background: rgba(0,229,160,0.1); color: var(--green); }
        .badge-teacher { background: rgba(147,51,234,0.15); color: #a78bfa; }
        .l-role-items { list-style: none; display: flex; flex-direction: column; gap: 10px; }
        .l-role-items li { font-size: 14px; color: var(--muted); display: flex; align-items: center; gap: 10px; }
        .l-role-items li::before { content: '→'; color: var(--blue2); font-weight: 700; font-size: 12px; }
        .l-pricing-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(260px,1fr)); gap: 24px; margin-top: 64px; }
        .l-price-card { border: 1px solid var(--border); border-radius: 20px; padding: 36px; background: var(--navy2); transition: all .3s; position: relative; overflow: hidden; }
        .l-price-card.popular { border-color: var(--blue); background: linear-gradient(135deg,rgba(29,111,244,0.08),var(--navy2)); }
        .l-price-card.popular::before { content: 'MÁS POPULAR'; position: absolute; top: 16px; right: -24px; background: var(--blue); color: #fff; font-size: 10px; font-weight: 700; letter-spacing: 1px; padding: 5px 32px; transform: rotate(45deg); }
        .l-price-name { font-size: 14px; font-weight: 600; color: var(--muted); margin-bottom: 8px; }
        .l-price-amount { font-size: 48px; font-weight: 800; letter-spacing: -2px; font-family: 'JetBrains Mono', monospace; color: #fff; }
        .l-price-amount span { font-size: 20px; font-weight: 500; color: var(--muted); font-family: 'Sora', sans-serif; }
        .l-price-period { font-size: 13px; color: var(--muted); margin-bottom: 28px; }
        .l-price-limit { font-size: 12px; font-weight: 600; letter-spacing: 1px; color: var(--blue2); text-transform: uppercase; margin-bottom: 24px; padding: 8px 14px; background: rgba(29,111,244,0.08); border-radius: 8px; display: inline-block; }
        .l-price-features { list-style: none; display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }
        .l-price-features li { font-size: 14px; color: var(--muted); display: flex; align-items: center; gap: 10px; }
        .l-price-features li::before { content: '✓'; color: var(--green); font-weight: 700; }
        .l-price-btn { display: block; text-align: center; text-decoration: none; padding: 14px; border-radius: 12px; font-size: 15px; font-weight: 600; transition: all .2s; border: 1px solid var(--border); color: #e8f0ff; }
        .l-price-btn:hover { border-color: var(--blue); color: var(--blue); }
        .l-price-btn.primary { background: var(--blue); border-color: var(--blue); color: #fff; }
        .l-price-btn.primary:hover { background: var(--blue2); }
        .l-cta { text-align: center; background: linear-gradient(135deg,rgba(29,111,244,0.08),rgba(6,200,240,0.05)); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .l-footer { padding: 48px 24px; border-top: 1px solid var(--border); text-align: center; }
        .l-footer-logo { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(135deg,#fff,var(--cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 16px; }
        .l-footer p { font-size: 13px; color: var(--muted); margin-top: 8px; }
        @media(max-width:768px) { .l-nav { padding: 16px 20px; } .l-nav-links { display: none; } .l-h1 { letter-spacing: -1px; } .l-stats { flex-direction: column; } .l-stat { border-right: none; border-bottom: 1px solid var(--border); } .l-stat:last-child { border-bottom: none; } .l-section { padding: 64px 20px; } }
      `}</style>

      {/* NAV */}
      <nav className="l-nav">
        <div className="l-logo">
          <div className="l-logo-icon">EF</div>
          EduFinance
        </div>
        <div className="l-nav-links">
          <a href="#features">Funciones</a>
          <a href="#roles">Roles</a>
          <a href="#pricing">Precios</a>
        </div>
        <Link to="/login" className="l-nav-cta">Ingresar →</Link>
      </nav>

      {/* HERO */}
      <section className="l-hero">
        <div className="l-badge"><span></span> Plataforma educativa todo en uno</div>
        <h1 className="l-h1">Gestión escolar<br/>sin <em>complicaciones</em></h1>
        <p className="l-sub">Controla pagos, estudiantes, asistencia y comunicación con padres desde una sola plataforma. Diseñada para colegios venezolanos.</p>
        <div className="l-actions">
          <Link to="/register" className="l-btn-primary">✦ Crear cuenta gratis</Link>
          <Link to="/login" className="l-btn-secondary">Ingresar →</Link>
        </div>
        <div className="l-stats">
          {[{num:'3',label:'Roles del sistema'},{num:'∞',label:'Estudiantes'},{num:'100%',label:'En la nube'},{num:'$0',label:'Costo inicial'}].map(s => (
            <div key={s.label} className="l-stat">
              <div className="l-stat-num">{s.num}</div>
              <div className="l-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="l-section">
        <div className="l-container">
          <span className="l-tag">Funcionalidades</span>
          <h2 className="l-title">Todo lo que tu colegio necesita</h2>
          <p className="l-desc">Sin Excel. Sin papel. Sin WhatsApp groups.</p>
          <div className="l-features-grid">
            {[
              {icon:'💰',title:'Gestión de pagos',desc:'Pago Móvil, transferencia, Zelle o efectivo. Los representantes suben el comprobante y el admin aprueba o rechaza con un clic.'},
              {icon:'📅',title:'Facturación automática',desc:'Configura el día de cobro y el sistema genera las mensualidades automáticamente para todos los estudiantes cada mes.'},
              {icon:'🔔',title:'Recordatorios de pago',desc:'Notificaciones automáticas 3 días antes del vencimiento. Reduce la morosidad sin llamadas.'},
              {icon:'📊',title:'Reportes y estadísticas',desc:'Dashboard con KPIs en tiempo real. Morosidad por grado, ingresos del mes, tasa de cobro. Exporta a PDF o Excel.'},
              {icon:'📋',title:'Asistencia y conducta',desc:'El profesor marca asistencia diaria y registra conducta positiva o negativa. Los padres lo ven en tiempo real.'},
              {icon:'📄',title:'Boletines y notas',desc:'El profesor carga las notas por lapso y sube la boleta digital. El representante la descarga en PDF.'},
              {icon:'💬',title:'Chat en tiempo real',desc:'Comunicación directa entre admin y representantes. Sin WhatsApp. Sin números personales expuestos.'},
              {icon:'📲',title:'App instalable (PWA)',desc:'Sin App Store ni Play Store. Los padres instalan EduFinance directamente desde el navegador en su teléfono.'},
              {icon:'🛡️',title:'Seguridad y auditoría',desc:'Cada acción queda registrada. Quién aprobó, rechazó o modificó un pago. Trazabilidad total.'},
            ].map(f => (
              <div key={f.title} className="l-feature-card">
                <div className="l-feature-icon">{f.icon}</div>
                <div className="l-feature-title">{f.title}</div>
                <div className="l-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section id="roles" className="l-section l-roles">
        <div className="l-container">
          <span className="l-tag">Multi-rol</span>
          <h2 className="l-title">Cada quien ve lo que necesita</h2>
          <p className="l-desc">Tres niveles de acceso perfectamente separados.</p>
          <div className="l-roles-grid">
            {[
              {emoji:'🏫',name:'Administrador',badge:'CONTROL TOTAL',cls:'badge-admin',items:['Aprobar y rechazar pagos','Ver todos los estudiantes','Gestionar usuarios y roles','Configurar métodos de pago','Reportes financieros completos','Historial de actividad','Chat con representantes']},
              {emoji:'👨‍👩‍👧',name:'Representante',badge:'PADRE / MADRE',cls:'badge-rep',items:['Ver deudas y pagos de sus hijos','Subir comprobantes de pago','Ver boletines y notas','Historial de asistencia','Registros de conducta','Anuncios del colegio','Chat directo con admin']},
              {emoji:'👩‍🏫',name:'Profesor',badge:'DOCENTE',cls:'badge-teacher',items:['Cargar notas por lapso','Marcar asistencia diaria','Registrar conducta','Subir boletas digitales','Publicar anuncios','Ver lista de estudiantes']},
            ].map(r => (
              <div key={r.name} className="l-role-card">
                <div className="l-role-header">
                  <div className="l-role-emoji">{r.emoji}</div>
                  <div>
                    <div className="l-role-name">{r.name}</div>
                    <span className={`l-role-badge ${r.cls}`}>{r.badge}</span>
                  </div>
                </div>
                <ul className="l-role-items">
                  {r.items.map(i => <li key={i}>{i}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="l-section">
        <div className="l-container" style={{textAlign:'center'}}>
          <span className="l-tag">Precios</span>
          <h2 className="l-title">Simple y transparente</h2>
          <p className="l-desc" style={{margin:'0 auto'}}>Sin sorpresas. Sin costos ocultos.</p>
          <div className="l-pricing-grid">
            {[
              {name:'Básico',price:'$29',limit:'Hasta 100 estudiantes',popular:false,features:['Gestión de pagos completa','Todos los roles incluidos','Asistencia y conducta','Boletines digitales','Chat en tiempo real','Soporte por email']},
              {name:'Pro',price:'$59',limit:'Hasta 300 estudiantes',popular:true,features:['Todo lo del plan Básico','Dashboard avanzado','Exportaciones ilimitadas','Audit log completo','Facturación automática','Soporte prioritario']},
              {name:'Premium',price:'$99',limit:'Estudiantes ilimitados',popular:false,features:['Todo lo del plan Pro','Múltiples sedes','API de integración','Onboarding personalizado','Soporte 24/7','SLA garantizado']},
            ].map(p => (
              <div key={p.name} className={`l-price-card${p.popular?' popular':''}`}>
                <div className="l-price-name">{p.name}</div>
                <div className="l-price-amount">{p.price}<span>/mes</span></div>
                <div className="l-price-period">Facturado mensualmente</div>
                <div className="l-price-limit">{p.limit}</div>
                <ul className="l-price-features">
                  {p.features.map(f => <li key={f}>{f}</li>)}
                </ul>
                <Link to="/register" className={`l-price-btn${p.popular?' primary':''}`}>Comenzar gratis</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="l-section l-cta">
        <div className="l-container">
          <div style={{maxWidth:'640px',margin:'0 auto'}}>
            <h2 className="l-title">¿Listo para modernizar tu colegio?</h2>
            <p className="l-desc" style={{margin:'0 auto 40px'}}>Configura tu institución en menos de 5 minutos.</p>
            <Link to="/register" className="l-btn-primary" style={{display:'inline-flex'}}>✦ Crear cuenta gratis</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="l-footer">
        <div className="l-footer-logo">EduFinance</div>
        <p>Sistema de gestión financiera escolar</p>
        <p>© 2025 EduFinance. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}
