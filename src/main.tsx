import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

let deferredPrompt: any = null

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  const btn = document.createElement('button')
  btn.id = 'install-btn'
  btn.innerHTML = '📲 Instalar EduFinance'
  btn.style.cssText = `
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    background: #1d4ed8; color: white; border: none; border-radius: 12px;
    padding: 12px 24px; font-size: 14px; font-weight: 600;
    cursor: pointer; z-index: 9999; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    font-family: Inter, sans-serif;
  `
  btn.onclick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') btn.remove()
    deferredPrompt = null
  }
  document.body.appendChild(btn)
  setTimeout(() => btn?.remove(), 10000)
})

window.addEventListener('appinstalled', () => {
  document.getElementById('install-btn')?.remove()
  deferredPrompt = null
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
