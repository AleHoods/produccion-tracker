// ── TELEGRAM ────────────────────────────────────────────────────────────────
const TELEGRAM_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID

export async function enviarTelegram(mensaje) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('Telegram no configurado')
    return false
  }
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: mensaje,
        parse_mode: 'HTML',
      }),
    })
    const data = await res.json()
    return data.ok
  } catch (e) {
    console.error('Error Telegram:', e)
    return false
  }
}

// ── EMAIL (EmailJS) ─────────────────────────────────────────────────────────
const EMAILJS_SERVICE  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC   = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const EMAIL_DESTINO    = import.meta.env.VITE_EMAIL_DESTINO

export async function enviarEmail({ asunto, cuerpo }) {
  if (!EMAILJS_SERVICE || !EMAILJS_TEMPLATE || !EMAILJS_PUBLIC) {
    console.warn('EmailJS no configurado')
    return false
  }
  try {
    const { default: emailjs } = await import('emailjs-com')
    await emailjs.send(
      EMAILJS_SERVICE,
      EMAILJS_TEMPLATE,
      { asunto, cuerpo, email_destino: EMAIL_DESTINO },
      EMAILJS_PUBLIC
    )
    return true
  } catch (e) {
    console.error('Error Email:', e)
    return false
  }
}

// ── LÓGICA DE ALERTAS ────────────────────────────────────────────────────────

export const UMBRALES = [
  { nombre: 'alerta_30', faltantes: 30, emoji: '🟡', label: '30 unidades para cambio' },
  { nombre: 'alerta_20', faltantes: 20, emoji: '🟠', label: '20 unidades para cambio' },
  { nombre: 'alerta_10', faltantes: 10, emoji: '🔴', label: '10 unidades para cambio' },
  { nombre: 'alerta_5',  faltantes: 5,  emoji: '🚨', label: '¡5 unidades para cambio!' },
]

export async function evaluarAlertas({ sesion, secuenciaActual, alertasYaEnviadas, onAlerta }) {
  const faltantes = sesion.secuencia_meta - secuenciaActual

  for (const umbral of UMBRALES) {
    if (faltantes <= umbral.faltantes && !alertasYaEnviadas.includes(umbral.nombre)) {
      const mensaje = buildMensaje({ sesion, faltantes, umbral, secuenciaActual })
      
      // Notificar UI
      onAlerta?.({ umbral, faltantes, mensaje })

      // Enviar notificaciones en paralelo
      await Promise.allSettled([
        enviarTelegram(mensaje),
        enviarEmail({
          asunto: `${umbral.emoji} Control Producción — ${umbral.label}`,
          cuerpo: mensaje,
        }),
      ])

      return umbral.nombre // retorna el tipo de alerta disparada
    }
  }
  return null
}

function buildMensaje({ sesion, faltantes, umbral, secuenciaActual }) {
  return `${umbral.emoji} <b>ALERTA CAMBIO DE MODELO</b>

📋 <b>Modelo:</b> ${sesion.modelo}
👤 <b>Operario:</b> ${sesion.operario || '—'}
🔢 <b>Secuencia actual:</b> ${secuenciaActual}
🎯 <b>Secuencia meta:</b> ${sesion.secuencia_meta}
⚠️ <b>Faltan:</b> ${faltantes} unidades

${umbral.label.toUpperCase()}`
}
