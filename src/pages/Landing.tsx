import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

/* ─── Animated counter hook ─── */
function useCounter(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime: number | null = null
    const step = (ts: number) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(ease * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [start, target, duration])
  return count
}

/* ─── Intersection observer hook ─── */
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

/* ─── Stat counter component ─── */
function StatCounter({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { ref, inView } = useInView(0.3)
  const count = useCounter(value, 1600, inView)
  return (
    <div ref={ref} className="l-stat">
      <div className="l-stat-num">{count}{suffix}</div>
      <div className="l-stat-label">{label}</div>
    </div>
  )
}

/* ─── FAQ item ─── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`faq-item${open ? ' open' : ''}`} onClick={() => setOpen(!open)}>
      <div className="faq-q">
        <span>{q}</span>
        <span className="faq-icon">{open ? '−' : '+'}</span>
      </div>
      {open && <div className="faq-a">{a}</div>}
    </div>
  )
}

/* ─── Mini mockup component ─── */
function MiniMockup({ lines }: { lines: { text: string; type: 'header' | 'row' | 'badge' | 'input' | 'btn' }[] }) {
  return (
    <div className="mini-mockup">
      {lines.map((l, i) => (
        <div key={i} className={`mockup-line mockup-${l.type}`}>{l.text}</div>
      ))}
    </div>
  )
}

export default function Landing() {
  const [mobileMenu, setMobileMenu] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  /* parallax subtle glow */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const glow = document.querySelector('.hero-glow') as HTMLElement
      if (!glow) return
      const x = (e.clientX / window.innerWidth - 0.5) * 30
      const y = (e.clientY / window.innerHeight - 0.5) * 20
      glow.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  return (
    <div style={{ fontFamily: "'Sora', sans-serif", background: '#050d1a', color: '#e8f0ff', minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        :root {
          --blue: #1d6ff4; --blue2: #3b82f6; --cyan: #06c8f0; --green: #00e5a0;
          --purple: #a78bfa; --muted: #6b8ab8; --muted2: #8fa7cc;
          --border: rgba(29,111,244,0.18); --border2: rgba(29,111,244,0.08);
          --navy: #050d1a; --navy2: #0a1628; --navy3: #0d1e38; --navy4: #0f2347;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        /* ── SCROLLBAR ── */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--navy); }
        ::-webkit-scrollbar-thumb { background: var(--blue); border-radius: 3px; }

        /* ── ANIMATIONS ── */
        @keyframes fadeUp    { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
        @keyframes pulse     { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.5;transform:scale(.9);} }
        @keyframes glow-ring { 0%,100%{box-shadow:0 0 0 0 rgba(29,111,244,.4);} 50%{box-shadow:0 0 0 12px rgba(29,111,244,0);} }
        @keyframes float     { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-8px);} }
        @keyframes gradient-shift { 0%{background-position:0% 50%;} 50%{background-position:100% 50%;} 100%{background-position:0% 50%;} }
        @keyframes shimmer   { 0%{transform:translateX(-100%);} 100%{transform:translateX(200%);} }
        @keyframes ticker    { 0%{transform:translateX(0);} 100%{transform:translateX(-50%);} }
        @keyframes spin-slow { to{transform:rotate(360deg);} }

        /* ── NAV ── */
        .l-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 48px;
          background: rgba(5,13,26,0.8); backdrop-filter: blur(24px) saturate(180%);
          border-bottom: 1px solid var(--border);
          transition: padding .3s;
        }
        .l-logo {
          font-size: 20px; font-weight: 800; letter-spacing: -.5px;
          background: linear-gradient(135deg, #fff 0%, var(--cyan) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          display: flex; align-items: center; gap: 10px; text-decoration: none;
        }
        .l-logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, var(--blue), var(--cyan));
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; color: #fff; -webkit-text-fill-color: #fff;
          flex-shrink: 0; box-shadow: 0 4px 16px rgba(29,111,244,.4);
        }
        .l-nav-links { display: flex; align-items: center; gap: 36px; }
        .l-nav-links a {
          color: var(--muted); text-decoration: none; font-size: 14px; font-weight: 500;
          transition: color .2s; position: relative;
        }
        .l-nav-links a::after {
          content: ''; position: absolute; bottom: -4px; left: 0; right: 0; height: 1px;
          background: var(--blue2); transform: scaleX(0); transition: transform .2s; transform-origin: left;
        }
        .l-nav-links a:hover { color: #e8f0ff; }
        .l-nav-links a:hover::after { transform: scaleX(1); }
        .nav-actions { display: flex; align-items: center; gap: 12px; }
        .l-nav-login {
          color: var(--muted2); text-decoration: none; font-size: 14px; font-weight: 500;
          padding: 9px 20px; border-radius: 10px; border: 1px solid var(--border);
          transition: all .2s;
        }
        .l-nav-login:hover { color: #e8f0ff; border-color: var(--blue); }
        .l-nav-cta {
          background: var(--blue); color: #fff; padding: 10px 22px; border-radius: 10px;
          text-decoration: none; font-size: 14px; font-weight: 600; transition: all .2s;
          box-shadow: 0 2px 12px rgba(29,111,244,.35);
        }
        .l-nav-cta:hover { background: var(--blue2); transform: translateY(-1px); box-shadow: 0 4px 20px rgba(29,111,244,.5); }
        .hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; padding: 4px; }
        .hamburger span { display: block; width: 22px; height: 2px; background: var(--muted2); border-radius: 2px; transition: .3s; }
        .mobile-menu {
          display: none; position: fixed; top: 73px; left: 0; right: 0; z-index: 190;
          background: rgba(5,13,26,.97); backdrop-filter: blur(24px);
          border-bottom: 1px solid var(--border); padding: 24px;
          flex-direction: column; gap: 4px;
          animation: fadeIn .2s ease both;
        }
        .mobile-menu.visible { display: flex; }
        .mobile-menu a {
          color: var(--muted2); text-decoration: none; font-size: 16px; font-weight: 500;
          padding: 14px 16px; border-radius: 10px; transition: all .2s;
        }
        .mobile-menu a:hover { background: var(--border2); color: #e8f0ff; }
        .mobile-menu .mm-cta { background: var(--blue); color: #fff; margin-top: 8px; text-align: center; }

        /* ── TICKER ── */
        .ticker-wrap { background: rgba(29,111,244,.07); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 12px 0; overflow: hidden; white-space: nowrap; }
        .ticker-inner { display: inline-flex; animation: ticker 30s linear infinite; }
        .ticker-item { font-size: 12px; font-weight: 600; color: var(--muted); letter-spacing: .5px; padding: 0 32px; display: flex; align-items: center; gap: 10px; }
        .ticker-item::before { content: '◆'; color: var(--blue2); font-size: 8px; }

        /* ── HERO ── */
        .l-hero {
          min-height: 100vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: 140px 24px 80px;
          position: relative; overflow: hidden;
        }
        .hero-grid-bg {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(29,111,244,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(29,111,244,.04) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
        }
        .hero-glow {
          position: absolute; width: 900px; height: 700px; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(29,111,244,.16) 0%, rgba(6,200,240,.06) 40%, transparent 70%);
          top: 50%; left: 50%; transform: translate(-50%, -50%);
          pointer-events: none; transition: transform .8s cubic-bezier(.23,1,.32,1);
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(29,111,244,.08); border: 1px solid rgba(29,111,244,.25);
          padding: 8px 18px; border-radius: 100px; font-size: 13px; color: var(--blue2); font-weight: 500;
          margin-bottom: 28px; animation: fadeUp .5s ease both; position: relative; z-index: 1;
        }
        .hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--cyan); animation: pulse 2s infinite; }
        .l-h1 {
          font-size: clamp(40px, 6.5vw, 88px); font-weight: 800; line-height: 1.03;
          letter-spacing: -3px; margin-bottom: 24px;
          animation: fadeUp .6s .08s ease both; position: relative; z-index: 1;
        }
        .l-h1 em {
          font-style: normal;
          background: linear-gradient(135deg, var(--blue2) 0%, var(--cyan) 50%, var(--green) 100%);
          background-size: 200% 200%; animation: gradient-shift 4s ease infinite;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .l-sub {
          font-size: clamp(16px, 1.8vw, 20px); color: var(--muted2); max-width: 580px; margin: 0 auto 44px;
          font-weight: 400; line-height: 1.75;
          animation: fadeUp .6s .16s ease both; position: relative; z-index: 1;
        }
        .l-actions {
          display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;
          animation: fadeUp .6s .24s ease both; position: relative; z-index: 1;
        }
        .l-btn-primary {
          background: linear-gradient(135deg, var(--blue), #2563eb);
          color: #fff; padding: 16px 36px; border-radius: 13px;
          text-decoration: none; font-size: 16px; font-weight: 600;
          box-shadow: 0 0 0 0 rgba(29,111,244,.4); transition: all .25s;
          display: inline-flex; align-items: center; gap: 10px; position: relative; overflow: hidden;
        }
        .l-btn-primary::after {
          content: ''; position: absolute; top: 0; left: -100%; width: 60%;
          height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.15), transparent);
          animation: shimmer 3s infinite;
        }
        .l-btn-primary:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(29,111,244,.5); }
        .l-btn-outline {
          background: transparent; color: var(--muted2); padding: 16px 36px; border-radius: 13px;
          text-decoration: none; font-size: 16px; font-weight: 500;
          border: 1px solid rgba(29,111,244,.25); transition: all .25s;
          display: inline-flex; align-items: center; gap: 8px;
        }
        .l-btn-outline:hover { border-color: var(--blue2); color: #e8f0ff; background: rgba(29,111,244,.06); }
        .hero-stats {
          display: flex; max-width: 780px; margin: 56px auto 0; flex-wrap: wrap; justify-content: center;
          border: 1px solid var(--border); border-radius: 22px;
          background: rgba(10,22,40,.75); backdrop-filter: blur(20px);
          overflow: hidden; animation: fadeUp .6s .36s ease both;
          position: relative; z-index: 1;
        }
        .l-stat {
          flex: 1; min-width: 140px; padding: 28px 24px; text-align: center;
          border-right: 1px solid var(--border); position: relative;
        }
        .l-stat:last-child { border-right: none; }
        .l-stat-num {
          font-size: 38px; font-weight: 800;
          background: linear-gradient(135deg, #fff, var(--cyan));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          font-family: 'JetBrains Mono', monospace; line-height: 1;
        }
        .l-stat-label { font-size: 12px; color: var(--muted); margin-top: 6px; font-weight: 500; line-height: 1.4; }

        /* ── PROBLEM ── */
        .problem-section { padding: 100px 24px; background: var(--navy2); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .problem-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; max-width: 1100px; margin: 0 auto; }
        .problem-pains { display: flex; flex-direction: column; gap: 16px; margin-top: 32px; }
        .pain-item {
          display: flex; align-items: flex-start; gap: 14px; padding: 18px 20px;
          background: rgba(239,68,68,.04); border: 1px solid rgba(239,68,68,.12);
          border-radius: 14px; transition: all .25s;
        }
        .pain-item:hover { background: rgba(239,68,68,.07); border-color: rgba(239,68,68,.2); }
        .pain-x { font-size: 18px; color: #f87171; flex-shrink: 0; margin-top: 1px; }
        .pain-text { font-size: 15px; color: var(--muted2); line-height: 1.5; }
        .pain-text strong { color: #e8f0ff; font-weight: 600; }
        .solution-cards { display: flex; flex-direction: column; gap: 14px; }
        .sol-card {
          display: flex; align-items: flex-start; gap: 14px; padding: 18px 20px;
          background: rgba(0,229,160,.04); border: 1px solid rgba(0,229,160,.12);
          border-radius: 14px; transition: all .25s;
        }
        .sol-card:hover { background: rgba(0,229,160,.07); border-color: rgba(0,229,160,.2); }
        .sol-check { font-size: 16px; color: var(--green); flex-shrink: 0; margin-top: 2px; }
        .sol-text { font-size: 15px; color: var(--muted2); line-height: 1.5; }
        .sol-text strong { color: #e8f0ff; font-weight: 600; }

        /* ── SECTION COMMON ── */
        .l-section { padding: 100px 24px; }
        .l-container { max-width: 1100px; margin: 0 auto; }
        .l-tag { font-size: 11px; font-weight: 700; letter-spacing: 2.5px; color: var(--blue2); text-transform: uppercase; margin-bottom: 14px; display: block; }
        .l-title { font-size: clamp(30px, 4vw, 54px); font-weight: 800; letter-spacing: -1.5px; line-height: 1.1; margin-bottom: 18px; }
        .l-desc { font-size: 17px; color: var(--muted2); line-height: 1.75; }
        .section-header { margin-bottom: 64px; }
        .section-header.center { text-align: center; }
        .section-header.center .l-desc { margin: 0 auto; max-width: 520px; }

        /* ── FEATURES ── */
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 22px; overflow: hidden; }
        .feature-card { background: var(--navy2); padding: 36px; transition: background .25s; position: relative; overflow: hidden; }
        .feature-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--blue), var(--cyan), transparent); opacity: 0; transition: opacity .3s; }
        .feature-card:hover { background: var(--navy3); }
        .feature-card:hover::before { opacity: 1; }
        .feature-icon-wrap { width: 52px; height: 52px; border-radius: 16px; background: rgba(29,111,244,.1); border: 1px solid rgba(29,111,244,.2); display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 18px; transition: all .25s; }
        .feature-card:hover .feature-icon-wrap { background: rgba(29,111,244,.16); border-color: rgba(29,111,244,.4); }
        .feature-title { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
        .feature-desc { font-size: 14px; color: var(--muted); line-height: 1.7; margin-bottom: 20px; }
        .mini-mockup { background: var(--navy4); border: 1px solid var(--border); border-radius: 10px; padding: 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px; }
        .mockup-line { padding: 3px 0; line-height: 1.6; }
        .mockup-header { color: var(--cyan); font-weight: 700; font-size: 10px; letter-spacing: 1px; margin-bottom: 4px; }
        .mockup-row { color: var(--muted2); display: flex; gap: 8px; }
        .mockup-badge { display: inline-block; padding: 1px 8px; border-radius: 100px; font-size: 10px; font-weight: 600; }
        .badge-green { background: rgba(0,229,160,.15); color: var(--green); }
        .badge-yellow { background: rgba(251,191,36,.12); color: #fbbf24; }
        .badge-red { background: rgba(239,68,68,.12); color: #f87171; }
        .badge-blue { background: rgba(29,111,244,.15); color: var(--blue2); }
        .mockup-input { background: rgba(29,111,244,.06); border: 1px solid var(--border); border-radius: 6px; padding: 4px 10px; color: var(--muted2); }
        .mockup-btn { background: var(--blue); color: #fff; border-radius: 6px; padding: 4px 12px; font-weight: 600; display: inline-block; font-size: 10px; }

        /* ── ROLES ── */
        .roles-section { background: var(--navy2); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .roles-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
        .role-card {
          border: 1px solid var(--border); border-radius: 22px; padding: 36px;
          background: var(--navy); transition: all .3s; position: relative; overflow: hidden;
        }
        .role-card::after { content: ''; position: absolute; inset: 0; border-radius: 22px; opacity: 0; transition: opacity .3s; }
        .role-card-admin::after  { background: radial-gradient(ellipse at top left, rgba(29,111,244,.06), transparent 60%); }
        .role-card-rep::after    { background: radial-gradient(ellipse at top left, rgba(0,229,160,.05), transparent 60%); }
        .role-card-teacher::after{ background: radial-gradient(ellipse at top left, rgba(167,139,250,.05), transparent 60%); }
        .role-card:hover { transform: translateY(-5px); }
        .role-card-admin:hover   { border-color: var(--blue); box-shadow: 0 12px 40px rgba(29,111,244,.15); }
        .role-card-rep:hover     { border-color: var(--green); box-shadow: 0 12px 40px rgba(0,229,160,.1); }
        .role-card-teacher:hover { border-color: var(--purple); box-shadow: 0 12px 40px rgba(167,139,250,.1); }
        .role-card:hover::after { opacity: 1; }
        .role-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; position: relative; z-index: 1; }
        .role-avatar { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 26px; flex-shrink: 0; }
        .role-avatar-admin   { background: rgba(29,111,244,.12); border: 1px solid rgba(29,111,244,.25); }
        .role-avatar-rep     { background: rgba(0,229,160,.1);   border: 1px solid rgba(0,229,160,.22);  }
        .role-avatar-teacher { background: rgba(167,139,250,.1); border: 1px solid rgba(167,139,250,.22);}
        .role-name { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
        .role-badge { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; padding: 3px 10px; border-radius: 100px; text-transform: uppercase; }
        .role-badge-admin   { background: rgba(29,111,244,.12); color: var(--blue2); }
        .role-badge-rep     { background: rgba(0,229,160,.1);   color: var(--green); }
        .role-badge-teacher { background: rgba(167,139,250,.1); color: var(--purple); }
        .role-items { list-style: none; display: flex; flex-direction: column; gap: 10px; position: relative; z-index: 1; }
        .role-items li { font-size: 14px; color: var(--muted2); display: flex; align-items: flex-start; gap: 10px; line-height: 1.5; }
        .role-check { flex-shrink: 0; margin-top: 1px; font-size: 13px; }
        .check-admin   { color: var(--blue2); }
        .check-rep     { color: var(--green); }
        .check-teacher { color: var(--purple); }

        /* ── TESTIMONIALS ── */
        .testi-section { background: var(--navy2); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .testi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
        .testi-card {
          border: 1px solid var(--border); border-radius: 22px; padding: 32px;
          background: var(--navy); position: relative; transition: all .3s;
          backdrop-filter: blur(10px);
        }
        .testi-card:hover { border-color: rgba(29,111,244,.3); transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,.3); }
        .testi-quote { font-size: 40px; color: var(--blue); opacity: .3; font-family: Georgia, serif; line-height: 1; margin-bottom: 8px; }
        .testi-text { font-size: 15px; color: var(--muted2); line-height: 1.75; margin-bottom: 24px; font-style: italic; }
        .testi-author { display: flex; align-items: center; gap: 12px; }
        .testi-avatar { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, var(--blue), var(--cyan)); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .testi-name { font-size: 14px; font-weight: 700; }
        .testi-role { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .testi-stars { color: #fbbf24; font-size: 12px; margin-bottom: 12px; letter-spacing: 2px; }

        /* ── PRICING ── */
        .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
        .price-card {
          border: 1px solid var(--border); border-radius: 22px; padding: 36px;
          background: var(--navy2); transition: all .3s; position: relative; overflow: hidden;
          display: flex; flex-direction: column;
        }
        .price-card.popular { border-color: var(--blue); background: linear-gradient(160deg, rgba(29,111,244,.07), var(--navy2) 60%); }
        .popular-badge {
          position: absolute; top: 20px; right: -26px;
          background: linear-gradient(135deg, var(--blue), var(--cyan));
          color: #fff; font-size: 9px; font-weight: 800; letter-spacing: 1.5px;
          padding: 5px 36px; transform: rotate(45deg); white-space: nowrap;
        }
        .price-name { font-size: 13px; font-weight: 600; color: var(--muted); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px; }
        .price-amount { font-size: 56px; font-weight: 800; letter-spacing: -3px; font-family: 'JetBrains Mono', monospace; color: #fff; line-height: 1; }
        .price-currency { font-size: 24px; vertical-align: top; margin-top: 8px; display: inline-block; font-family: 'Sora', sans-serif; }
        .price-period { font-size: 13px; color: var(--muted); margin-bottom: 8px; margin-top: 6px; }
        .price-limit { font-size: 12px; font-weight: 600; color: var(--blue2); padding: 6px 14px; background: rgba(29,111,244,.08); border-radius: 8px; display: inline-block; margin-bottom: 28px; }
        .price-features { list-style: none; display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; flex: 1; }
        .price-features li { font-size: 14px; color: var(--muted2); display: flex; align-items: center; gap: 10px; }
        .price-features li .pf-check { color: var(--green); font-size: 13px; }
        .price-features li .pf-x { color: rgba(107,138,184,.4); font-size: 13px; }
        .price-divider { height: 1px; background: var(--border); margin: 20px 0; }
        .price-btn {
          display: block; text-align: center; text-decoration: none; padding: 14px;
          border-radius: 12px; font-size: 15px; font-weight: 600; transition: all .22s;
          border: 1px solid var(--border); color: #e8f0ff;
        }
        .price-btn:hover { border-color: var(--blue2); color: var(--blue2); background: rgba(29,111,244,.06); }
        .price-btn.primary { background: var(--blue); border-color: var(--blue); color: #fff; box-shadow: 0 4px 20px rgba(29,111,244,.3); }
        .price-btn.primary:hover { background: var(--blue2); transform: translateY(-1px); box-shadow: 0 8px 30px rgba(29,111,244,.45); }
        .compare-table { margin-top: 64px; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
        .compare-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; padding: 14px 24px; border-bottom: 1px solid var(--border2); transition: background .15s; font-size: 14px; }
        .compare-row:last-child { border-bottom: none; }
        .compare-row:hover { background: var(--border2); }
        .compare-header { background: var(--navy3); font-weight: 700; color: var(--muted2); font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
        .compare-row span { text-align: center; }
        .compare-row span:first-child { text-align: left; color: var(--muted2); }
        .compare-yes { color: var(--green); }
        .compare-no  { color: rgba(107,138,184,.35); }
        .compare-val { color: #e8f0ff; font-weight: 500; }

        /* ── FAQ ── */
        .faq-list { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
        .faq-item {
          border: 1px solid var(--border); border-radius: 14px; padding: 20px 24px;
          cursor: pointer; transition: all .22s; background: var(--navy2);
        }
        .faq-item:hover { border-color: rgba(29,111,244,.35); background: var(--navy3); }
        .faq-item.open { border-color: var(--blue); background: linear-gradient(135deg, rgba(29,111,244,.06), var(--navy2)); }
        .faq-q { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .faq-q span:first-child { font-size: 15px; font-weight: 600; line-height: 1.4; }
        .faq-icon { font-size: 22px; color: var(--blue2); font-weight: 300; flex-shrink: 0; line-height: 1; }
        .faq-a { font-size: 14px; color: var(--muted2); line-height: 1.75; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }

        /* ── FINAL CTA ── */
        .final-cta {
          padding: 120px 24px; text-align: center;
          background: radial-gradient(ellipse 80% 70% at 50% 100%, rgba(29,111,244,.12), transparent),
                      linear-gradient(135deg, rgba(6,200,240,.04), transparent);
          border-top: 1px solid var(--border);
          position: relative; overflow: hidden;
        }
        .cta-ring {
          position: absolute; width: 600px; height: 600px; border-radius: 50%;
          border: 1px solid rgba(29,111,244,.1); top: 50%; left: 50%; transform: translate(-50%,-50%);
          animation: spin-slow 30s linear infinite;
        }
        .cta-ring-2 {
          position: absolute; width: 400px; height: 400px; border-radius: 50%;
          border: 1px solid rgba(6,200,240,.08); top: 50%; left: 50%; transform: translate(-50%,-50%);
          animation: spin-slow 20s linear infinite reverse;
        }
        .cta-urgency { font-size: 13px; font-weight: 600; color: var(--cyan); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px; }
        .cta-actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-top: 40px; }
        .cta-note { font-size: 13px; color: var(--muted); margin-top: 16px; }

        /* ── FOOTER ── */
        .l-footer { padding: 64px 24px 40px; border-top: 1px solid var(--border); }
        .footer-inner { max-width: 1100px; margin: 0 auto; }
        .footer-top { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px; margin-bottom: 48px; }
        .footer-brand p { font-size: 14px; color: var(--muted); line-height: 1.7; margin-top: 14px; max-width: 260px; }
        .footer-col h4 { font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 16px; }
        .footer-col a { display: block; font-size: 14px; color: var(--muted); text-decoration: none; margin-bottom: 10px; transition: color .2s; }
        .footer-col a:hover { color: #e8f0ff; }
        .footer-bottom { display: flex; justify-content: space-between; align-items: center; padding-top: 24px; border-top: 1px solid var(--border2); flex-wrap: wrap; gap: 12px; }
        .footer-copy { font-size: 13px; color: var(--muted); }
        .footer-legal { display: flex; gap: 24px; }
        .footer-legal a { font-size: 13px; color: var(--muted); text-decoration: none; transition: color .2s; }
        .footer-legal a:hover { color: #e8f0ff; }

        /* ── RESPONSIVE ── */
        @media(max-width: 1024px) {
          .footer-top { grid-template-columns: 1fr 1fr; gap: 36px; }
          .problem-grid { grid-template-columns: 1fr; gap: 40px; }
        }
        @media(max-width: 768px) {
          .l-nav { padding: 16px 20px; }
          .l-nav-links, .nav-actions { display: none; }
          .hamburger { display: flex; }
          .l-h1 { letter-spacing: -1.5px; }
          .hero-stats { flex-direction: column; margin-top: 40px; }
          .l-stat { border-right: none; border-bottom: 1px solid var(--border); }
          .l-stat:last-child { border-bottom: none; }
          .l-section, .problem-section, .roles-section, .testi-section, .final-cta { padding: 72px 20px; }
          .features-grid { grid-template-columns: 1fr; }
          .compare-table { display: none; }
          .footer-top { grid-template-columns: 1fr; gap: 28px; }
          .footer-bottom { flex-direction: column; align-items: flex-start; }
        }
        @media(max-width: 480px) {
          .l-actions { flex-direction: column; align-items: stretch; }
          .l-btn-primary, .l-btn-outline { text-align: center; justify-content: center; }
          .cta-actions { flex-direction: column; align-items: center; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="l-nav">
        <a href="#" className="l-logo">
          <div className="l-logo-icon">EF</div>
          EduFinance
        </a>
        <div className="l-nav-links">
          <a href="#problema">El Problema</a>
          <a href="#funciones">Funciones</a>
          <a href="#roles">Roles</a>
          <a href="#precios">Precios</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="nav-actions">
          <Link to="/login" className="l-nav-login">Ingresar</Link>
          <Link to="/register" className="l-nav-cta">Comenzar gratis →</Link>
        </div>
        <div className="hamburger" onClick={() => setMobileMenu(!mobileMenu)}>
          <span></span><span></span><span></span>
        </div>
      </nav>

      {/* ── MOBILE MENU ── */}
      <div className={`mobile-menu${mobileMenu ? ' visible' : ''}`}>
        <a href="#problema" onClick={() => setMobileMenu(false)}>El Problema</a>
        <a href="#funciones" onClick={() => setMobileMenu(false)}>Funciones</a>
        <a href="#roles" onClick={() => setMobileMenu(false)}>Roles</a>
        <a href="#precios" onClick={() => setMobileMenu(false)}>Precios</a>
        <a href="#faq" onClick={() => setMobileMenu(false)}>FAQ</a>
        <Link to="/login" className="mm-cta" onClick={() => setMobileMenu(false)}>Ingresar</Link>
        <Link to="/register" className="mm-cta" style={{background:'var(--green)',color:'#0a1628'}} onClick={() => setMobileMenu(false)}>Crear cuenta gratis</Link>
      </div>

      {/* ── TICKER ── */}
      <div className="ticker-wrap" style={{marginTop:'73px'}}>
        <div className="ticker-inner">
          {[
            'Gestión de Pagos', 'Control de Asistencia', 'Boletines Digitales', 'Chat en Tiempo Real',
            'Reportes Financieros', 'Control de Conducta', 'Anuncios al Instante', 'Notas por Lapso',
            'Calendario Escolar', 'Multi-Rol', 'Sin Instalación', '100% en la Nube',
            'Gestión de Pagos', 'Control de Asistencia', 'Boletines Digitales', 'Chat en Tiempo Real',
            'Reportes Financieros', 'Control de Conducta', 'Anuncios al Instante', 'Notas por Lapso',
          ].map((t, i) => (
            <span key={i} className="ticker-item">{t}</span>
          ))}
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="l-hero" ref={heroRef}>
        <div className="hero-grid-bg" />
        <div className="hero-glow" />

        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Plataforma #1 de gestión escolar para LATAM
        </div>

        <h1 className="l-h1">
          Digitaliza tu colegio.<br />
          <em>Cobra a tiempo.</em>
        </h1>

        <p className="l-sub">
          EduFinance centraliza pagos, asistencia, notas, boletines y comunicación con padres en una sola plataforma. Sin Excel. Sin WhatsApp. Sin caos.
        </p>

        <div className="l-actions">
          <Link to="/register" className="l-btn-primary">
            ✦ Crear cuenta gratis
          </Link>
          <a href="#funciones" className="l-btn-outline">
            Ver funciones →
          </a>
        </div>

        <div className="hero-stats">
          <StatCounter value={68} suffix="%" label="Reducción de morosidad" />
          <StatCounter value={12} suffix="h" label="Horas ahorradas al mes" />
          <StatCounter value={500} suffix="+" label="Familias conectadas" />
          <StatCounter value={5} suffix=" min" label="Para configurar tu colegio" />
        </div>
      </section>

      {/* ── PROBLEMA ── */}
      <section id="problema" className="problem-section">
        <div className="problem-grid">
          <div>
            <span className="l-tag">El Problema Real</span>
            <h2 className="l-title">¿Gestionas tu colegio con WhatsApp y Excel?</h2>
            <p className="l-desc" style={{marginBottom:'32px'}}>
              Miles de colegios en LATAM siguen perdiendo tiempo y dinero con métodos que ya no escalan.
            </p>
            <div className="problem-pains">
              {[
                { strong: 'Cobrar mensualidades por WhatsApp,', rest: ' persiguiendo comprobantes uno a uno.' },
                { strong: 'Hojas de Excel desactualizadas', rest: ' con deudas, pagos y saldos confusos.' },
                { strong: 'Boletines impresos en papel', rest: ' que los representantes pierden o nunca reciben.' },
                { strong: 'Sin visibilidad financiera:', rest: ' no sabes cuánto entra cada mes hasta el final.' },
                { strong: 'Representantes desinformados', rest: ' que llaman a cada rato preguntando el saldo.' },
              ].map((p, i) => (
                <div key={i} className="pain-item">
                  <span className="pain-x">✕</span>
                  <span className="pain-text"><strong>{p.strong}</strong> {p.rest}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <span className="l-tag" style={{color:'var(--green)'}}>La Solución</span>
            <h2 className="l-title" style={{fontSize:'clamp(26px,3vw,38px)'}}>EduFinance resuelve todo eso.</h2>
            <p className="l-desc" style={{marginBottom:'28px', fontSize:'15px'}}>Una plataforma, todos los procesos, cero fricción.</p>
            <div className="solution-cards">
              {[
                { strong: 'Comprobantes digitales:', rest: ' los padres suben la foto, tú apruebas con un clic.' },
                { strong: 'Dashboard en tiempo real:', rest: ' ves cuánto has cobrado hoy, esta semana, este mes.' },
                { strong: 'Boletines en PDF:', rest: ' el profesor carga notas y el padre los descarga al instante.' },
                { strong: 'Chat integrado:', rest: ' comunica sin WhatsApp, sin exponer tu número personal.' },
                { strong: 'Alertas automáticas:', rest: ' el sistema recuerda a los representantes antes del vencimiento.' },
              ].map((s, i) => (
                <div key={i} className="sol-card">
                  <span className="sol-check">✓</span>
                  <span className="sol-text"><strong>{s.strong}</strong> {s.rest}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="funciones" className="l-section">
        <div className="l-container">
          <div className="section-header center">
            <span className="l-tag">Funcionalidades</span>
            <h2 className="l-title">Todo lo que tu colegio necesita,<br/>nada que no necesitas.</h2>
            <p className="l-desc">Diseñado para directores, rectores y administradores que quieren resultados — no software complicado.</p>
          </div>

          <div className="features-grid">

            {/* 1. Pagos */}
            <div className="feature-card">
              <div className="feature-icon-wrap">💰</div>
              <div className="feature-title">Gestión de Pagos</div>
              <div className="feature-desc">Los representantes suben el comprobante desde su teléfono. El admin aprueba o rechaza con un solo clic. Registro automático del historial.</div>
              <MiniMockup lines={[
                {text:'PAGOS PENDIENTES — HOY', type:'header'},
                {text:'', type:'row'},
                {text:'Carlos Martínez    Ene 2025    $45', type:'row'},
                {text:'', type:'row'},
              ]} />
              <div style={{marginTop:'8px', display:'flex', gap:'8px', fontFamily:"'JetBrains Mono'", fontSize:'11px'}}>
                <span className="mockup-badge badge-green">✓ Aprobar</span>
                <span className="mockup-badge badge-red">✕ Rechazar</span>
                <span className="mockup-badge badge-yellow">⏳ Pendiente</span>
              </div>
            </div>

            {/* 2. Asistencia */}
            <div className="feature-card">
              <div className="feature-icon-wrap">📋</div>
              <div className="feature-title">Control de Asistencia</div>
              <div className="feature-desc">El profesor marca asistencia en segundos desde su celular. Los representantes ven en tiempo real si su hijo llegó. Reportes por mes y por sección.</div>
              <MiniMockup lines={[
                {text:'ASISTENCIA — 5TO A — HOY', type:'header'},
                {text:'', type:'row'},
              ]} />
              <div style={{marginTop:'4px', display:'flex', flexDirection:'column', gap:'5px', fontFamily:"'JetBrains Mono'", fontSize:'11px', padding:'0 2px'}}>
                {[['Ana Rodríguez','badge-green','Presente'],['Luis García','badge-red','Ausente'],['María López','badge-yellow','Tardanza']].map(([name,cls,txt]) => (
                  <div key={name} style={{display:'flex', justifyContent:'space-between', color:'var(--muted2)'}}>
                    <span>{name}</span>
                    <span className={`mockup-badge ${cls}`}>{txt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Notas y Boletines */}
            <div className="feature-card">
              <div className="feature-icon-wrap">📄</div>
              <div className="feature-title">Notas y Boletines Digitales</div>
              <div className="feature-desc">El profesor carga las notas por lapso desde el panel. El representante recibe notificación y descarga el boletín en PDF — sin imprimir nada.</div>
              <MiniMockup lines={[
                {text:'BOLETÍN — PEDRO SÁNCHEZ — LAPSO 2', type:'header'},
              ]} />
              <div style={{marginTop:'6px', display:'flex', flexDirection:'column', gap:'5px', fontFamily:"'JetBrains Mono'", fontSize:'11px', padding:'0 2px'}}>
                {[['Matemáticas','19'],['Lengua','17'],['Ciencias','18'],['Historia','16']].map(([m,n]) => (
                  <div key={m} style={{display:'flex', justifyContent:'space-between', color:'var(--muted2)'}}>
                    <span>{m}</span>
                    <span style={{color:'var(--green)', fontWeight:700}}>{n}/20</span>
                  </div>
                ))}
              </div>
              <div style={{marginTop:'10px', fontFamily:"'JetBrains Mono'", fontSize:'11px'}}>
                <span className="mockup-btn">↓ Descargar PDF</span>
              </div>
            </div>

            {/* 4. Chat */}
            <div className="feature-card">
              <div className="feature-icon-wrap">💬</div>
              <div className="feature-title">Chat en Tiempo Real</div>
              <div className="feature-desc">Canal de comunicación directo entre la administración y cada representante. Sin WhatsApp, sin correos perdidos, sin números personales expuestos.</div>
              <MiniMockup lines={[
                {text:'CHAT — ADMIN ↔ REP.', type:'header'},
              ]} />
              <div style={{marginTop:'6px', display:'flex', flexDirection:'column', gap:'8px', fontFamily:"'JetBrains Mono'", fontSize:'11px'}}>
                <div style={{background:'rgba(29,111,244,.12)', borderRadius:'10px 10px 10px 2px', padding:'6px 10px', color:'var(--muted2)', maxWidth:'80%'}}>
                  Hola, ¿el recibo de enero fue aprobado?
                </div>
                <div style={{background:'rgba(0,229,160,.08)', borderRadius:'10px 10px 2px 10px', padding:'6px 10px', color:'var(--muted2)', maxWidth:'80%', marginLeft:'auto', textAlign:'right'}}>
                  Sí, acaba de ser procesado ✓✓
                </div>
              </div>
            </div>

            {/* 5. Reportes */}
            <div className="feature-card">
              <div className="feature-icon-wrap">📊</div>
              <div className="feature-title">Reportes Financieros</div>
              <div className="feature-desc">Dashboard con KPIs en tiempo real: tasa de cobro, morosidad por grado, proyección mensual. Exporta en PDF o Excel para directiva o contabilidad.</div>
              <MiniMockup lines={[
                {text:'RESUMEN — ENERO 2025', type:'header'},
              ]} />
              <div style={{marginTop:'6px', display:'flex', flexDirection:'column', gap:'6px', fontFamily:"'JetBrains Mono'", fontSize:'11px', padding:'0 2px'}}>
                {[['Total cobrado','$4,320','badge-green'],['Pendiente','$780','badge-yellow'],['Tasa de cobro','84.7%','badge-blue']].map(([k,v,cls]) => (
                  <div key={k} style={{display:'flex', justifyContent:'space-between', alignItems:'center', color:'var(--muted2)'}}>
                    <span>{k}</span>
                    <span className={`mockup-badge ${cls}`}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Conducta + Anuncios */}
            <div className="feature-card">
              <div className="feature-icon-wrap">📢</div>
              <div className="feature-title">Conducta, Anuncios y Calendario</div>
              <div className="feature-desc">Registra incidencias de conducta positiva o negativa. Publica anuncios y eventos en el calendario escolar que llegan a todos los representantes al instante.</div>
              <MiniMockup lines={[
                {text:'ANUNCIO NUEVO', type:'header'},
              ]} />
              <div style={{marginTop:'6px', fontFamily:"'JetBrains Mono'", fontSize:'11px', padding:'0 2px', display:'flex', flexDirection:'column', gap:'8px'}}>
                <div style={{color:'var(--muted2)', lineHeight:'1.5', background:'rgba(29,111,244,.06)', padding:'8px 10px', borderRadius:'8px', borderLeft:'2px solid var(--blue2)'}}>
                  <span style={{color:'var(--blue2)', fontWeight:700}}>📅 15 Feb:</span> Reunión de representantes — Aula Magna 5:00 PM
                </div>
                <div style={{display:'flex', justifyContent:'space-between', color:'var(--muted)'}}>
                  <span>Enviado a 47 representantes</span>
                  <span style={{color:'var(--green)'}}>✓✓ Visto</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section id="roles" className="l-section roles-section">
        <div className="l-container">
          <div className="section-header center">
            <span className="l-tag">Multi-Rol</span>
            <h2 className="l-title">Cada quien ve lo que necesita.</h2>
            <p className="l-desc">Tres roles completamente separados. Cada usuario ve solo lo que le corresponde.</p>
          </div>
          <div className="roles-grid">

            <div className="role-card role-card-admin">
              <div className="role-header">
                <div className="role-avatar role-avatar-admin">🏫</div>
                <div>
                  <div className="role-name">Administrador</div>
                  <span className="role-badge role-badge-admin">Control Total</span>
                </div>
              </div>
              <ul className="role-items">
                {['Aprobar y rechazar pagos con comprobante','Ver deudas y saldos de todos los estudiantes','Dashboard financiero en tiempo real','Gestionar usuarios, roles y permisos','Configurar métodos de pago aceptados','Publicar anuncios y eventos del colegio','Chat con todos los representantes','Exportar reportes en PDF y Excel','Historial completo de auditoría'].map(item => (
                  <li key={item}><span className="role-check check-admin">✦</span>{item}</li>
                ))}
              </ul>
            </div>

            <div className="role-card role-card-rep">
              <div className="role-header">
                <div className="role-avatar role-avatar-rep">👨‍👩‍👧</div>
                <div>
                  <div className="role-name">Representante</div>
                  <span className="role-badge role-badge-rep">Padre / Madre</span>
                </div>
              </div>
              <ul className="role-items">
                {['Ver deudas y pagos de sus hijos','Subir comprobante de pago desde el celular','Recibir confirmación instantánea de pago','Ver notas y boletines en tiempo real','Descargar boletín en PDF por lapso','Consultar asistencia diaria de sus hijos','Ver registros de conducta y observaciones','Leer anuncios y eventos del colegio','Chat directo con la administración'].map(item => (
                  <li key={item}><span className="role-check check-rep">✓</span>{item}</li>
                ))}
              </ul>
            </div>

            <div className="role-card role-card-teacher">
              <div className="role-header">
                <div className="role-avatar role-avatar-teacher">👩‍🏫</div>
                <div>
                  <div className="role-name">Profesor</div>
                  <span className="role-badge role-badge-teacher">Docente</span>
                </div>
              </div>
              <ul className="role-items">
                {['Marcar asistencia diaria en segundos','Registrar conducta positiva o negativa','Cargar notas por lapso y materia','Subir boletines digitales a la plataforma','Publicar anuncios para su sección','Ver lista completa de estudiantes','Consultar historial de asistencia','Agregar observaciones académicas'].map(item => (
                  <li key={item}><span className="role-check check-teacher">→</span>{item}</li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ── TESTIMONIOS ── */}
      <section className="l-section testi-section">
        <div className="l-container">
          <div className="section-header center">
            <span className="l-tag">Testimonios</span>
            <h2 className="l-title">Lo que dicen los directores<br/>que ya usan EduFinance.</h2>
            <p className="l-desc">Colegios reales, resultados reales.</p>
          </div>
          <div className="testi-grid">

            <div className="testi-card">
              <div className="testi-stars">★★★★★</div>
              <div className="testi-quote">"</div>
              <div className="testi-text">Antes perdíamos 2 horas diarias revisando capturas en WhatsApp. Ahora el sistema aprueba los pagos en segundos y los representantes ya no llaman a preguntar. La morosidad bajó un 60% en el primer trimestre.</div>
              <div className="testi-author">
                <div className="testi-avatar">LM</div>
                <div>
                  <div className="testi-name">Lic. Laura Mendoza</div>
                  <div className="testi-role">Directora — Unidad Educativa Simón Bolívar, Caracas</div>
                </div>
              </div>
            </div>

            <div className="testi-card">
              <div className="testi-stars">★★★★★</div>
              <div className="testi-quote">"</div>
              <div className="testi-text">Implementar EduFinance fue la mejor decisión que tomamos este año escolar. Los padres pueden ver las notas de sus hijos en tiempo real y ya no hay quejas de que no les entregamos el boletín. Todo queda en el sistema.</div>
              <div className="testi-author">
                <div className="testi-avatar">CR</div>
                <div>
                  <div className="testi-name">Prof. Carlos Ramírez</div>
                  <div className="testi-role">Rector — Colegio Santa María, Bogotá</div>
                </div>
              </div>
            </div>

            <div className="testi-card">
              <div className="testi-stars">★★★★★</div>
              <div className="testi-quote">"</div>
              <div className="testi-text">Antes del sistema teníamos 3 personas haciendo el trabajo de cobranza. Hoy lo maneja una sola persona. El dashboard financiero nos da una visibilidad que nunca habíamos tenido. Vale cada centavo del costo mensual.</div>
              <div className="testi-author">
                <div className="testi-avatar">AP</div>
                <div>
                  <div className="testi-name">Ana Patricia Solano</div>
                  <div className="testi-role">Administradora — Instituto Técnico Libertad, Lima</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="precios" className="l-section">
        <div className="l-container">
          <div className="section-header center">
            <span className="l-tag">Precios</span>
            <h2 className="l-title">Simple, transparente,<br/>sin sorpresas.</h2>
            <p className="l-desc">Todos los planes incluyen acceso completo a todas las funciones. Solo cambia la capacidad.</p>
          </div>

          <div className="pricing-grid">

            <div className="price-card">
              <div className="price-name">Básico</div>
              <div style={{marginBottom:'6px'}}>
                <span className="price-currency">$</span>
                <span className="price-amount">29</span>
              </div>
              <div className="price-period">por mes · facturado mensualmente</div>
              <div className="price-limit">📚 Hasta 100 estudiantes</div>
              <ul className="price-features">
                {[
                  [true,'Gestión de pagos con comprobantes'],
                  [true,'Todos los roles incluidos'],
                  [true,'Asistencia y conducta'],
                  [true,'Notas y boletines digitales'],
                  [true,'Chat en tiempo real'],
                  [true,'Anuncios y calendario'],
                  [true,'Soporte por email'],
                  [false,'Reportes financieros avanzados'],
                  [false,'Exportaciones ilimitadas'],
                  [false,'Onboarding personalizado'],
                ].map(([ok, text], i) => (
                  <li key={i}>
                    <span className={ok ? 'pf-check' : 'pf-x'}>{ok ? '✓' : '✕'}</span>
                    <span style={!ok ? {color:'rgba(107,138,184,.4)'} : {}}>{text as string}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register" className="price-btn">Comenzar gratis</Link>
            </div>

            <div className="price-card popular">
              <div className="popular-badge">MÁS POPULAR</div>
              <div className="price-name">Pro</div>
              <div style={{marginBottom:'6px'}}>
                <span className="price-currency">$</span>
                <span className="price-amount">59</span>
              </div>
              <div className="price-period">por mes · facturado mensualmente</div>
              <div className="price-limit">🎓 Hasta 300 estudiantes</div>
              <ul className="price-features">
                {[
                  [true,'Todo lo del plan Básico'],
                  [true,'Dashboard financiero avanzado'],
                  [true,'Exportaciones ilimitadas (PDF/Excel)'],
                  [true,'Historial de auditoría completo'],
                  [true,'Facturación automática mensual'],
                  [true,'Alertas automáticas de morosidad'],
                  [true,'Soporte prioritario (48h)'],
                  [true,'Reportes personalizados'],
                  [false,'Múltiples sedes'],
                  [false,'API de integración'],
                ].map(([ok, text], i) => (
                  <li key={i}>
                    <span className={ok ? 'pf-check' : 'pf-x'}>{ok ? '✓' : '✕'}</span>
                    <span style={!ok ? {color:'rgba(107,138,184,.4)'} : {}}>{text as string}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register" className="price-btn primary">Comenzar gratis</Link>
            </div>

            <div className="price-card">
              <div className="price-name">Premium</div>
              <div style={{marginBottom:'6px'}}>
                <span className="price-currency">$</span>
                <span className="price-amount">99</span>
              </div>
              <div className="price-period">por mes · facturado mensualmente</div>
              <div className="price-limit">🏆 Estudiantes ilimitados</div>
              <ul className="price-features">
                {[
                  [true,'Todo lo del plan Pro'],
                  [true,'Estudiantes y usuarios ilimitados'],
                  [true,'Múltiples sedes en una cuenta'],
                  [true,'API de integración REST'],
                  [true,'Onboarding personalizado 1-a-1'],
                  [true,'Soporte 24/7 WhatsApp/teléfono'],
                  [true,'SLA de disponibilidad 99.9%'],
                  [true,'Capacitación para el equipo'],
                  [true,'Backups diarios garantizados'],
                  [true,'Personalización de marca'],
                ].map(([ok, text], i) => (
                  <li key={i}>
                    <span className={ok ? 'pf-check' : 'pf-x'}>{ok ? '✓' : '✕'}</span>
                    <span style={!ok ? {color:'rgba(107,138,184,.4)'} : {}}>{text as string}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register" className="price-btn">Comenzar gratis</Link>
            </div>

          </div>

          {/* Tabla comparativa */}
          <div className="compare-table">
            <div className="compare-row compare-header">
              <span>Característica</span>
              <span>Básico</span>
              <span>Pro</span>
              <span>Premium</span>
            </div>
            {[
              ['Estudiantes','100','300','Ilimitados'],
              ['Roles (Admin/Rep/Prof)','✓','✓','✓'],
              ['Gestión de pagos','✓','✓','✓'],
              ['Notas y boletines','✓','✓','✓'],
              ['Chat en tiempo real','✓','✓','✓'],
              ['Reportes avanzados','✕','✓','✓'],
              ['Exportaciones','5/mes','Ilimitadas','Ilimitadas'],
              ['Facturación automática','✕','✓','✓'],
              ['Múltiples sedes','✕','✕','✓'],
              ['Soporte','Email','Prioritario','24/7'],
            ].map(([feat, b, p, pr], i) => (
              <div key={i} className="compare-row">
                <span>{feat}</span>
                <span className={b === '✓' ? 'compare-yes' : b === '✕' ? 'compare-no' : 'compare-val'}>{b}</span>
                <span className={p === '✓' ? 'compare-yes' : p === '✕' ? 'compare-no' : 'compare-val'}>{p}</span>
                <span className={pr === '✓' ? 'compare-yes' : pr === '✕' ? 'compare-no' : 'compare-val'}>{pr}</span>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="l-section" style={{background:'var(--navy2)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)'}}>
        <div className="l-container">
          <div className="section-header center">
            <span className="l-tag">FAQ</span>
            <h2 className="l-title">Preguntas frecuentes</h2>
            <p className="l-desc">Todo lo que necesitas saber antes de empezar.</p>
          </div>
          <div className="faq-list">
            <FaqItem
              q="¿Cuánto tiempo lleva configurar mi colegio en EduFinance?"
              a="Menos de 5 minutos. Creas tu cuenta, ingresas el nombre del colegio, configuras los grados/secciones y empiezas a agregar estudiantes. No hay instalación, no hay configuración técnica. Si tienes una lista de estudiantes en Excel, te ayudamos a importarlos en menos de 10 minutos."
            />
            <FaqItem
              q="¿Los representantes necesitan instalar una app?"
              a="No. EduFinance es una Progressive Web App (PWA). Los representantes acceden desde cualquier navegador en su celular o computadora, y pueden 'instalar' el ícono en su pantalla de inicio sin pasar por App Store ni Play Store. Funciona en Android e iPhone."
            />
            <FaqItem
              q="¿Qué pasa si un representante no tiene smartphone para subir comprobantes?"
              a="El administrador puede registrar pagos manualmente desde el panel. También puede aceptar pagos en efectivo marcándolos directamente en el sistema. EduFinance se adapta a las diferentes realidades de cada colegio."
            />
            <FaqItem
              q="¿Los datos de mi colegio están seguros? ¿Quién tiene acceso?"
              a="Tus datos son completamente privados. Solo tú y las personas que tú autorices tienen acceso a la información de tu institución. Cada acción queda registrada en un log de auditoría. La plataforma usa cifrado en tránsito y en reposo. No compartimos datos con terceros bajo ninguna circunstancia."
            />
            <FaqItem
              q="¿Puedo cancelar en cualquier momento? ¿Hay contrato?"
              a="No hay contratos. Puedes cancelar tu suscripción cuando quieras, sin penalizaciones. Tu información queda disponible para exportar durante 30 días después de la cancelación. También ofrecemos 14 días de prueba gratuita en todos los planes — sin tarjeta de crédito requerida."
            />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="final-cta">
        <div className="cta-ring" />
        <div className="cta-ring-2" />
        <div style={{position:'relative', zIndex:1, maxWidth:'680px', margin:'0 auto'}}>
          <div className="cta-urgency">⚡ Configura tu colegio en 5 minutos</div>
          <h2 className="l-title" style={{fontSize:'clamp(34px,5vw,64px)'}}>
            Tu colegio merece una<br/><em style={{background:'linear-gradient(135deg,var(--blue2),var(--cyan))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', fontStyle:'normal'}}>gestión del siglo XXI.</em>
          </h2>
          <p className="l-desc" style={{margin:'0 auto', maxWidth:'500px', marginTop:'16px'}}>
            Más de 500 familias ya usan EduFinance. Únete a los colegios que cobran a tiempo, comunican mejor y tienen el control total.
          </p>
          <div className="cta-actions">
            <Link to="/register" className="l-btn-primary" style={{fontSize:'17px', padding:'18px 44px'}}>
              ✦ Crear cuenta gratis ahora
            </Link>
            <a href="mailto:hola@edufinance.app" className="l-btn-outline" style={{fontSize:'17px', padding:'18px 44px'}}>
              Hablar con ventas →
            </a>
          </div>
          <p className="cta-note">Sin tarjeta de crédito · 14 días gratis · Cancela cuando quieras</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="l-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <a href="#" className="l-logo" style={{display:'inline-flex', marginBottom:'4px'}}>
                <div className="l-logo-icon">EF</div>
                EduFinance
              </a>
              <p>Plataforma de gestión escolar diseñada para colegios de Latinoamérica. Pagos, asistencia, notas y comunicación, todo en un solo lugar.</p>
            </div>
            <div className="footer-col">
              <h4>Producto</h4>
              <a href="#funciones">Funcionalidades</a>
              <a href="#roles">Roles</a>
              <a href="#precios">Precios</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="footer-col">
              <h4>Acceso</h4>
              <Link to="/login">Ingresar</Link>
              <Link to="/register">Crear cuenta</Link>
              <a href="#">Demo en vivo</a>
              <a href="#">Ver tutorial</a>
            </div>
            <div className="footer-col">
              <h4>Contacto</h4>
              <a href="mailto:hola@edufinance.app">hola@edufinance.app</a>
              <a href="#">WhatsApp soporte</a>
              <a href="#">Instagram</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span className="footer-copy">© 2025 EduFinance. Todos los derechos reservados.</span>
            <div className="footer-legal">
              <Link to="/legal">Términos</Link>
              <Link to="/legal">Privacidad</Link>
              <a href="#">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
