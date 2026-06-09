import { useState } from 'react'
import { Link } from 'react-router-dom'

// ─── Table-of-contents sections ──────────────────────────────────────────────

const TOS_SECTIONS = [
  { id: 'descripcion',    title: '1. Descripción del Servicio' },
  { id: 'uso-aceptable',  title: '2. Uso Aceptable' },
  { id: 'cuenta',         title: '3. Cuenta y Acceso' },
  { id: 'pago',           title: '4. Pago y Facturación' },
  { id: 'datos',          title: '5. Datos y Privacidad' },
  { id: 'propiedad',      title: '6. Propiedad Intelectual' },
  { id: 'responsabilidad',title: '7. Limitación de Responsabilidad' },
  { id: 'modificaciones', title: '8. Modificaciones al Servicio' },
  { id: 'cancelacion',    title: '9. Cancelación y Terminación' },
  { id: 'ley',            title: '10. Ley Aplicable' },
]

const PP_SECTIONS = [
  { id: 'recopilacion',   title: '1. Datos que Recopilamos' },
  { id: 'uso',            title: '2. Cómo Usamos los Datos' },
  { id: 'firebase',       title: '3. Firebase e Infraestructura' },
  { id: 'compartir',      title: '4. Compartir Información' },
  { id: 'seguridad',      title: '5. Seguridad de los Datos' },
  { id: 'retencion',      title: '6. Retención de Datos' },
  { id: 'derechos',       title: '7. Tus Derechos' },
  { id: 'cookies',        title: '8. Cookies y Almacenamiento Local' },
  { id: 'menores',        title: '9. Privacidad de Menores de Edad' },
  { id: 'contacto',       title: '10. Contacto' },
]

// ─── Reusable section component ──────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 40, scrollMarginTop: 100 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>
        {title}
      </h2>
      <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.8 }}>{children}</div>
    </section>
  )
}

function P({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <p style={{ marginBottom: 12, ...style }}>{children}</p>
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
      {items.map((item, i) => <li key={i} style={{ marginBottom: 6 }}>{item}</li>)}
    </ul>
  )
}

// ─── Terms of Service content ─────────────────────────────────────────────────

function TermsContent() {
  return (
    <>
      <Section id="descripcion" title="1. Descripción del Servicio">
        <P>
          EduFinance es una plataforma de gestión escolar en modalidad SaaS (Software as a Service) diseñada para instituciones educativas de Latinoamérica. El servicio provee herramientas para la gestión de pagos y mensualidades, control de asistencia estudiantil, registro de calificaciones y boletines digitales, comunicación entre la institución y los representantes, y reportes financieros administrativos.
        </P>
        <P>
          El acceso a EduFinance se realiza a través de un navegador web moderno o como Progressive Web App (PWA) instalada en dispositivos móviles. No se requiere instalación de software adicional.
        </P>
        <P>
          El servicio opera bajo un modelo de suscripción mensual. La escuela contratante actúa como titular de la cuenta y es responsable de administrar los accesos de sus docentes y representantes.
        </P>
      </Section>

      <Section id="uso-aceptable" title="2. Uso Aceptable">
        <P>EduFinance está destinado exclusivamente al uso por parte de instituciones educativas formalmente constituidas. Al usar la plataforma, la institución se compromete a:</P>
        <Ul items={[
          'Proporcionar información verídica durante el registro y configuración.',
          'No utilizar la plataforma para actividades ilegales, fraudulentas o que violen derechos de terceros.',
          'No intentar acceder a datos de otras instituciones o usuarios sin autorización.',
          'No realizar ingeniería inversa, descompilar o extraer el código fuente de la plataforma.',
          'No usar el servicio para enviar comunicaciones masivas no solicitadas (spam).',
          'Mantener la confidencialidad de las credenciales de acceso de los usuarios.',
          'Notificar inmediatamente a EduFinance ante cualquier uso no autorizado de su cuenta.',
        ]} />
        <P>EduFinance se reserva el derecho de suspender cuentas que violen estas condiciones sin previo aviso en casos de abuso grave.</P>
      </Section>

      <Section id="cuenta" title="3. Cuenta y Acceso">
        <P>
          Al crear una cuenta, el administrador de la institución acepta estos términos en nombre de la organización. La institución es responsable de todas las actividades que ocurran bajo su cuenta.
        </P>
        <P>
          Cada usuario (administrador, docente, representante) dispone de credenciales individuales. La institución administradora puede crear, modificar y desactivar usuarios según sus necesidades.
        </P>
        <P>
          EduFinance no es responsable por accesos no autorizados derivados del uso negligente de credenciales por parte de los usuarios de la institución.
        </P>
      </Section>

      <Section id="pago" title="4. Pago y Facturación">
        <P>
          EduFinance ofrece planes de suscripción mensual con precios en dólares estadounidenses (USD). Los planes disponibles son Básico ($29/mes), Pro ($59/mes) y Premium ($99/mes), con las características descritas en la página de precios.
        </P>
        <P>
          <strong>Período de prueba:</strong> Todos los planes incluyen 14 días de prueba gratuita sin necesidad de tarjeta de crédito. Al finalizar el período de prueba, se requiere suscripción pagada para continuar usando el servicio.
        </P>
        <P>
          <strong>Facturación:</strong> La facturación es mensual, el mismo día del mes en que se activó la suscripción. El pago se procesa automáticamente a través de los medios de pago habilitados.
        </P>
        <P>
          <strong>Cancelación:</strong> Puede cancelar su suscripción en cualquier momento desde el panel de configuración. La cancelación tendrá efecto al final del período de facturación en curso. No se realizan reembolsos prorrateados por períodos parciales.
        </P>
        <P>
          <strong>Cambios de precio:</strong> EduFinance notificará con 30 días de anticipación cualquier cambio en los precios de los planes vigentes.
        </P>
      </Section>

      <Section id="datos" title="5. Datos y Privacidad">
        <P>
          La institución es propietaria de todos los datos que ingresa en la plataforma, incluyendo información de estudiantes, representantes, pagos y registros académicos.
        </P>
        <P>
          EduFinance procesa estos datos únicamente para proveer el servicio contratado. No vendemos, alquilamos ni compartimos datos de las instituciones con terceros con fines comerciales.
        </P>
        <P>
          Para más detalles sobre el manejo de datos personales, consulte nuestra Política de Privacidad.
        </P>
      </Section>

      <Section id="propiedad" title="6. Propiedad Intelectual">
        <P>
          EduFinance y todos sus componentes (código fuente, diseño, marca, logotipos, textos y materiales de la plataforma) son propiedad exclusiva de EduFinance y están protegidos por las leyes de propiedad intelectual aplicables.
        </P>
        <P>
          Al usar la plataforma, la institución no adquiere ningún derecho de propiedad sobre el software. Se concede únicamente una licencia de uso limitada, no exclusiva e intransferible.
        </P>
        <P>
          El contenido generado por la institución (datos de estudiantes, notas, comunicados) permanece siendo propiedad de la institución en todo momento.
        </P>
      </Section>

      <Section id="responsabilidad" title="7. Limitación de Responsabilidad">
        <P>
          EduFinance se esfuerza por mantener el servicio disponible de manera continua, pero no garantiza una disponibilidad del 100% (excepto en planes Premium con SLA explícito). El servicio se provee "tal cual" sin garantías de ningún tipo más allá de las expresamente establecidas.
        </P>
        <P>EduFinance no será responsable por:</P>
        <Ul items={[
          'Pérdida de datos por causas ajenas a nuestra plataforma (falla de dispositivo del usuario, pérdida de credenciales).',
          'Daños indirectos, incidentales o consecuentes derivados del uso del servicio.',
          'Interrupciones del servicio causadas por fuerza mayor, ataques externos o fallas en servicios de terceros.',
          'Decisiones financieras o administrativas tomadas con base en los reportes de la plataforma.',
        ]} />
        <P>
          En ningún caso la responsabilidad total de EduFinance superará el monto pagado por la institución en los 3 meses previos al evento que originó el reclamo.
        </P>
      </Section>

      <Section id="modificaciones" title="8. Modificaciones al Servicio">
        <P>
          EduFinance puede modificar, actualizar o mejorar la plataforma en cualquier momento. Las mejoras de funcionalidades se realizan de forma continua y generalmente no requieren notificación previa.
        </P>
        <P>
          Los cambios significativos que afecten funcionalidades existentes serán notificados con al menos 14 días de anticipación a través del correo electrónico registrado o mediante anuncios dentro de la plataforma.
        </P>
        <P>
          Los cambios en estos Términos de Servicio serán notificados con 30 días de anticipación. El uso continuado del servicio después de la fecha efectiva de los cambios constituye aceptación de los nuevos términos.
        </P>
      </Section>

      <Section id="cancelacion" title="9. Cancelación y Terminación">
        <P>
          <strong>Por parte de la institución:</strong> Puede cancelar su suscripción en cualquier momento. Sus datos permanecerán disponibles para exportar durante 30 días tras la cancelación, después de lo cual serán eliminados de forma permanente.
        </P>
        <P>
          <strong>Por parte de EduFinance:</strong> Nos reservamos el derecho de suspender o terminar cuentas que violen estos términos, con o sin previo aviso dependiendo de la gravedad de la violación.
        </P>
        <P>
          En caso de terminación por incumplimiento, no se realizarán reembolsos de montos pagados. Si la terminación es iniciada por EduFinance sin causa atribuible a la institución, se reembolsará el proporcional del período no utilizado.
        </P>
      </Section>

      <Section id="ley" title="10. Ley Aplicable">
        <P>
          Estos términos se rigen por las leyes de la República Bolivariana de Venezuela. Para instituciones ubicadas en otros países de Latinoamérica, se aplicará la ley del país de residencia de la institución en lo que respecta a la protección de datos de sus usuarios.
        </P>
        <P>
          Cualquier disputa derivada del uso del servicio que no pueda resolverse amigablemente será sometida a la jurisdicción de los tribunales competentes de Caracas, Venezuela.
        </P>
        <P>
          Para consultas legales o notificaciones formales, puede contactarnos en: <a href="mailto:legal@edufinance.app" style={{ color: '#1d6ff4' }}>legal@edufinance.app</a>
        </P>
        <P style={{ color: '#64748b', fontSize: 13 }}>
          Última actualización: diciembre 2024
        </P>
      </Section>
    </>
  )
}

// ─── Privacy Policy content ───────────────────────────────────────────────────

function PrivacyContent() {
  return (
    <>
      <Section id="recopilacion" title="1. Datos que Recopilamos">
        <P>EduFinance recopila los siguientes tipos de datos para operar el servicio:</P>
        <P><strong>Datos de la institución:</strong></P>
        <Ul items={[
          'Nombre, dirección y datos de contacto de la institución educativa.',
          'Configuración del colegio (tarifas, métodos de pago, año escolar).',
          'Información de facturación y suscripción.',
        ]} />
        <P><strong>Datos de usuarios (admins, docentes, representantes):</strong></P>
        <Ul items={[
          'Nombre completo y correo electrónico.',
          'Número de teléfono (opcional, para representantes).',
          'Rol dentro de la institución.',
          'Datos de autenticación (contraseña almacenada de forma encriptada mediante Firebase Auth).',
        ]} />
        <P><strong>Datos de estudiantes:</strong></P>
        <Ul items={[
          'Nombre completo, grado y sección.',
          'Historial de pagos y mensualidades.',
          'Registros de asistencia.',
          'Calificaciones y boletines.',
          'Registros de conducta.',
        ]} />
        <P><strong>Datos de uso:</strong></P>
        <Ul items={[
          'Registros de actividad y auditoría dentro de la plataforma.',
          'Dirección IP y tipo de navegador (para seguridad).',
          'Métricas de uso del servicio (sin información personal identificable).',
        ]} />
      </Section>

      <Section id="uso" title="2. Cómo Usamos los Datos">
        <P>Utilizamos los datos recopilados exclusivamente para:</P>
        <Ul items={[
          'Proveer, mantener y mejorar el servicio de EduFinance.',
          'Autenticar a los usuarios y proteger la seguridad de las cuentas.',
          'Procesar pagos y gestionar la facturación de la suscripción.',
          'Enviar notificaciones relacionadas con el servicio (alertas de pago, anuncios, actualizaciones).',
          'Proveer soporte técnico cuando sea solicitado.',
          'Cumplir con obligaciones legales aplicables.',
          'Generar estadísticas agregadas y anónimas sobre el uso de la plataforma.',
        ]} />
        <P>
          No utilizamos los datos de las instituciones con fines publicitarios ni para generar perfiles de comportamiento con fines comerciales.
        </P>
      </Section>

      <Section id="firebase" title="3. Firebase e Infraestructura">
        <P>
          EduFinance utiliza <strong>Google Firebase</strong> como proveedor de infraestructura en la nube. Firebase gestiona la autenticación de usuarios (Firebase Auth), el almacenamiento de datos estructurados (Firestore), el almacenamiento de archivos como comprobantes de pago (Firebase Storage) y el envío de notificaciones push (FCM).
        </P>
        <P>
          Los datos se almacenan en los servidores de Google Cloud, que cumplen con los más altos estándares de seguridad y privacidad, incluyendo certificaciones ISO 27001, SOC 2 y cumplimiento con GDPR para usuarios europeos.
        </P>
        <P>
          Puede consultar la política de privacidad de Google Firebase en: <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#1d6ff4' }}>firebase.google.com/support/privacy</a>
        </P>
      </Section>

      <Section id="compartir" title="4. Compartir Información">
        <P>
          <strong>No vendemos ni alquilamos datos a terceros bajo ninguna circunstancia.</strong>
        </P>
        <P>Podemos compartir datos en los siguientes casos limitados:</P>
        <Ul items={[
          'Con proveedores de infraestructura técnica (Google Firebase) estrictamente para operar el servicio.',
          'Con procesadores de pago, únicamente los datos necesarios para completar transacciones.',
          'Cuando sea requerido por ley, orden judicial o autoridad competente.',
          'Con el consentimiento explícito de la institución para casos específicos.',
        ]} />
        <P>
          En todos los casos, los terceros están contractualmente obligados a mantener la confidencialidad de los datos y usarlos únicamente para los fines autorizados.
        </P>
      </Section>

      <Section id="seguridad" title="5. Seguridad de los Datos">
        <P>Implementamos múltiples capas de seguridad para proteger sus datos:</P>
        <Ul items={[
          'Transmisión de datos cifrada mediante TLS/HTTPS en todo momento.',
          'Contraseñas almacenadas con hash usando algoritmos seguros (bcrypt vía Firebase Auth).',
          'Reglas de seguridad de Firestore que garantizan que cada institución accede solo a sus propios datos.',
          'Registro completo de auditoría de todas las acciones administrativas.',
          'Backups automáticos diarios de la base de datos.',
          'Autenticación de dos factores disponible para cuentas de administrador.',
        ]} />
        <P>
          En caso de una brecha de seguridad que afecte datos personales, notificaremos a las instituciones afectadas dentro de las 72 horas de detectado el incidente.
        </P>
      </Section>

      <Section id="retencion" title="6. Retención de Datos">
        <P>
          Los datos de una institución se mantienen activos mientras la suscripción esté vigente. Tras la cancelación de la suscripción:
        </P>
        <Ul items={[
          'Los datos permanecen accesibles durante 30 días para que la institución pueda exportarlos.',
          'Transcurrido este período, los datos se eliminan de forma permanente e irreversible.',
          'Los backups de seguridad se eliminan en un plazo máximo de 90 días.',
        ]} />
        <P>
          Los registros de auditoría con fines legales y de seguridad pueden retenerse por hasta 2 años antes de su eliminación.
        </P>
      </Section>

      <Section id="derechos" title="7. Tus Derechos">
        <P>Como usuario de EduFinance, tienes los siguientes derechos sobre tus datos:</P>
        <Ul items={[
          'Acceso: Puedes solicitar una copia de todos tus datos personales almacenados.',
          'Rectificación: Puedes corregir información incorrecta directamente en la plataforma o contactándonos.',
          'Eliminación: Puedes solicitar la eliminación de tu cuenta y todos los datos asociados.',
          'Portabilidad: Puedes exportar tus datos en formatos estándar (PDF, Excel/CSV) desde la plataforma.',
          'Oposición: Puedes oponerte al procesamiento de tus datos para fines distintos a los del servicio.',
          'Restricción: Puedes solicitar la restricción del procesamiento de tus datos en casos específicos.',
        ]} />
        <P>
          Para ejercer estos derechos, contacta a nuestro equipo en <a href="mailto:soporte@edufinance.app" style={{ color: '#1d6ff4' }}>soporte@edufinance.app</a>. Responderemos tu solicitud en un plazo máximo de 30 días hábiles.
        </P>
      </Section>

      <Section id="cookies" title="8. Cookies y Almacenamiento Local">
        <P>
          EduFinance utiliza almacenamiento local del navegador (localStorage y IndexedDB) para:
        </P>
        <Ul items={[
          'Mantener la sesión del usuario activa entre visitas.',
          'Guardar preferencias de la interfaz (tema, configuración de vista).',
          'Habilitar funcionamiento offline como PWA.',
          'Optimizar el rendimiento mediante caché de datos frecuentes.',
        ]} />
        <P>
          Utilizamos cookies técnicas estrictamente necesarias para el funcionamiento del servicio. No utilizamos cookies de seguimiento publicitario ni de análisis de comportamiento de terceros.
        </P>
        <P>
          Puede limpiar el almacenamiento local desde la configuración de su navegador, lo que cerrará su sesión y eliminará las preferencias guardadas localmente.
        </P>
      </Section>

      <Section id="menores" title="9. Privacidad de Menores de Edad">
        <P>
          EduFinance procesa datos de estudiantes menores de edad en el contexto educativo bajo la responsabilidad de la institución educativa contratante, que actúa como encargada del tratamiento de datos de sus alumnos.
        </P>
        <P>
          La institución es responsable de contar con las autorizaciones necesarias de los representantes legales para el procesamiento de datos de menores, de acuerdo con la legislación local aplicable.
        </P>
        <P>
          EduFinance no recopila datos de menores de edad directamente ni les permite crear cuentas en la plataforma. Toda la interacción con datos de estudiantes se realiza a través de los roles adultos autorizados.
        </P>
      </Section>

      <Section id="contacto" title="10. Contacto">
        <P>
          Si tienes preguntas, preocupaciones o solicitudes relacionadas con esta Política de Privacidad, contáctanos:
        </P>
        <Ul items={[
          'Email: soporte@edufinance.app',
          'Email legal: legal@edufinance.app',
          'WhatsApp soporte: +58 412-EDUFINANCE',
        ]} />
        <P>
          Nuestro equipo responde solicitudes de privacidad dentro de los 5 días hábiles.
        </P>
        <P style={{ color: '#64748b', fontSize: 13 }}>
          Última actualización: diciembre 2024
        </P>
      </Section>
    </>
  )
}

// ─── Main Legal page ─────────────────────────────────────────────────────────

export default function Legal() {
  const [tab, setTab] = useState<'tos' | 'privacy'>('tos')
  const sections = tab === 'tos' ? TOS_SECTIONS : PP_SECTIONS

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 50 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#1d6ff4,#06c8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>EF</div>
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 16 }}>EduFinance</span>
        </Link>
        <span style={{ color: '#94a3b8', fontSize: 14 }}>/</span>
        <span style={{ color: '#64748b', fontSize: 14 }}>Legal</span>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px', display: 'flex', gap: 40, alignItems: 'flex-start' }}>

        {/* Sidebar */}
        <aside style={{ width: 240, flexShrink: 0, position: 'sticky', top: 80, display: 'none' }} className="legal-sidebar">
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', marginBottom: 14 }}>
              Índice
            </div>
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#475569', borderRadius: 8, transition: 'all 0.15s', lineHeight: 1.4 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {s.title}
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Información Legal</h1>
            <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
              Lea estos documentos antes de usar EduFinance. Al utilizar la plataforma, acepta estos términos.
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 32, width: 'fit-content' }}>
            {([
              { key: 'tos',     label: '📄 Términos de Servicio' },
              { key: 'privacy', label: '🔒 Política de Privacidad' },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '10px 20px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
                  background: tab === t.key ? '#fff' : 'transparent',
                  color: tab === t.key ? '#0f172a' : '#64748b',
                  boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Inline section nav (mobile) */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 16px', marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', marginBottom: 10 }}>Índice de secciones</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  style={{ padding: '5px 12px', borderRadius: 100, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#e0f2fe'; e.currentTarget.style.borderColor = '#7dd3fc' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '32px 36px' }}>
            {tab === 'tos' ? <TermsContent /> : <PrivacyContent />}
          </div>

          {/* Footer note */}
          <div style={{ marginTop: 24, padding: '16px 20px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, fontSize: 14, color: '#1e40af' }}>
            ¿Tienes preguntas? Escríbenos a <a href="mailto:soporte@edufinance.app" style={{ color: '#1d6ff4', fontWeight: 600 }}>soporte@edufinance.app</a> y responderemos en menos de 24 horas.
          </div>

        </main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .legal-sidebar { display: block !important; }
        }
      `}</style>
    </div>
  )
}
