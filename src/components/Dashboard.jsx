import { useState } from 'react'
import { UMBRALES } from '../lib/alertas'

export default function Dashboard({ sesion, registros, metricas, alertaActiva, alertasEnviadas, onRegistrar, onFinalizar, onEditarLote, cargando }) {
  const [secuenciaInput, setSecuenciaInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [ultimoRegistro, setUltimoRegistro] = useState(null)
  const [editandoLote, setEditandoLote] = useState(false)
  const [nuevoLote, setNuevoLote] = useState('')

  const handleRegistrar = async (e) => {
    e.preventDefault()
    const val = parseInt(secuenciaInput)
    if (isNaN(val)) return
    setEnviando(true)
    try {
      await onRegistrar(val, sesion.operario)
      setUltimoRegistro(val)
      setSecuenciaInput('')
    } finally {
      setEnviando(false)
    }
  }

  const handleEditarLote = async (e) => {
    e.preventDefault()
    const val = parseInt(nuevoLote)
    if (isNaN(val) || val < 1) return
    await onEditarLote(val)
    setEditandoLote(false)
    setNuevoLote('')
  }

  const colorAlerta = alertaActiva
    ? alertaActiva.faltantes <= 5 ? 'alerta-roja'
    : alertaActiva.faltantes <= 10 ? 'alerta-naranja'
    : alertaActiva.faltantes <= 20 ? 'alerta-amarilla'
    : 'alerta-verde'
    : ''

  return (
    <div className="dashboard">
      {/* Header de sesión */}
      <div className={`sesion-header ${colorAlerta}`}>
        <div className="sesion-info">
          <div className="sesion-badge">EN PRODUCCIÓN</div>
          <h2>{sesion.modelo}</h2>
          <span className="sesion-operario">👤 {sesion.operario || 'Sin asignar'}</span>
        </div>
        <div className="sesion-secuencias">
          <div className="seq-item">
            <span className="seq-label">INICIO</span>
            <span className="seq-val">{sesion.secuencia_inicio.toLocaleString()}</span>
          </div>
          <div className="seq-arrow">→</div>
          <div className="seq-item">
            <span className="seq-label">META</span>
            <span className="seq-val meta">{sesion.secuencia_meta.toLocaleString()}</span>
          </div>
          <div className="seq-item">
            <span className="seq-label">LOTE</span>
            <span className="seq-val lote-val">
              {sesion.cantidad_lote}
              <button className="btn-editar-lote" onClick={() => { setEditandoLote(true); setNuevoLote(sesion.cantidad_lote) }} title="Editar tamaño del lote">✏️</button>
            </span>
          </div>
        </div>
      </div>

      {/* Modal editar lote */}
      {editandoLote && (
        <div className="modal-overlay" onClick={() => setEditandoLote(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>✏️ Editar tamaño del lote</h3>
            <p className="modal-sub">Lote actual: <strong>{sesion.cantidad_lote} unidades</strong> — Meta actual: <strong>{sesion.secuencia_meta}</strong></p>
            <form onSubmit={handleEditarLote} className="modal-form">
              <div className="field">
                <label>Nueva cantidad del lote</label>
                <input
                  type="number"
                  value={nuevoLote}
                  onChange={e => setNuevoLote(e.target.value)}
                  min="1"
                  required
                  autoFocus
                  className="input-secuencia"
                />
              </div>
              {nuevoLote && !isNaN(parseInt(nuevoLote)) && (
                <div className="modal-preview">
                  <span>Nueva meta:</span>
                  <strong>{(sesion.secuencia_inicio + parseInt(nuevoLote)).toLocaleString()}</strong>
                </div>
              )}
              <div className="modal-botones">
                <button type="button" className="btn-cancelar" onClick={() => setEditandoLote(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Confirmar cambio</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alerta activa */}
      {alertaActiva && (
        <div className={`alerta-banner ${colorAlerta}`}>
          <span className="alerta-emoji">{alertaActiva.emoji}</span>
          <span className="alerta-texto">{alertaActiva.label.toUpperCase()}</span>
          <span className="alerta-faltantes">Faltan {metricas?.faltantes} unidades</span>
        </div>
      )}

      {/* Métricas principales */}
      {metricas && (
        <div className="metricas-grid">
          <div className="metrica-card">
            <div className="m-valor">{metricas.secuenciaActual.toLocaleString()}</div>
            <div className="m-label">Secuencia actual</div>
          </div>
          <div className="metrica-card">
            <div className="m-valor">{metricas.producidas.toLocaleString()}</div>
            <div className="m-label">Producidas</div>
          </div>
          <div className="metrica-card highlight">
            <div className="m-valor">{metricas.faltantes.toLocaleString()}</div>
            <div className="m-label">Faltan</div>
          </div>
          {metricas.velocidad && (
            <div className="metrica-card">
              <div className="m-valor">{metricas.velocidad}</div>
              <div className="m-label">Ud/hora</div>
            </div>
          )}
          {metricas.etaHoras && (
            <div className="metrica-card">
              <div className="m-valor">{metricas.etaHoras}h</div>
              <div className="m-label">ETA cambio</div>
            </div>
          )}
        </div>
      )}

      {/* Barra de progreso */}
      {metricas && (
        <div className="progreso-container">
          <div className="progreso-labels">
            <span>Progreso del lote</span>
            <span className="progreso-pct">{metricas.porcentaje}%</span>
          </div>
          <div className="progreso-bar">
            <div className="progreso-fill" style={{ width: `${metricas.porcentaje}%` }} />
            {[30, 20, 10, 5].map(u => {
              const pct = Math.round(((sesion.cantidad_lote - u) / sesion.cantidad_lote) * 100)
              return (
                <div
                  key={u}
                  className={`progreso-marker ${alertasEnviadas.includes(`alerta_${u}`) ? 'triggered' : ''}`}
                  style={{ left: `${pct}%` }}
                  title={`Alerta ${u} unidades`}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Umbrales */}
      <div className="umbrales-row">
        {UMBRALES.map(u => (
          <div key={u.nombre} className={`umbral-chip ${alertasEnviadas.includes(u.nombre) ? 'enviada' : 'pendiente'}`}>
            <span>{u.emoji}</span>
            <span>{u.faltantes} ud</span>
            {alertasEnviadas.includes(u.nombre) && <span className="check">✓</span>}
          </div>
        ))}
      </div>

      {/* Registro de secuencia */}
      <div className="registro-card">
        <h3>📥 Registrar secuencia actual</h3>
        <form onSubmit={handleRegistrar} className="registro-form">
          <input
            type="number"
            placeholder="Ingresá la secuencia actual"
            value={secuenciaInput}
            onChange={e => setSecuenciaInput(e.target.value)}
            min={sesion.secuencia_inicio}
            max={sesion.secuencia_meta + 100}
            required
            className="input-secuencia"
          />
          <button type="submit" className="btn-registrar" disabled={enviando || cargando}>
            {enviando ? '⏳' : '✓ Registrar'}
          </button>
        </form>
        {ultimoRegistro && (
          <div className="ultimo-registro">
            ✅ Último registrado: <strong>{ultimoRegistro.toLocaleString()}</strong>
          </div>
        )}
      </div>

      {/* Historial de registros */}
      {registros.length > 0 && (
        <div className="historial-card">
          <h3>📋 Historial de registros</h3>
          <div className="historial-tabla">
            <div className="hist-header">
              <span>Hora</span>
              <span>Secuencia</span>
              <span>Producidas</span>
            </div>
            {[...registros].reverse().map((r, i) => {
              const hora = new Date(r.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
              const producidas = r.secuencia_actual - sesion.secuencia_inicio
              return (
                <div key={r.id} className={`hist-row ${i === 0 ? 'latest' : ''}`}>
                  <span className="hist-hora">{hora}</span>
                  <span className="hist-seq">{r.secuencia_actual.toLocaleString()}</span>
                  <span className="hist-prod">{producidas.toLocaleString()}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Botón finalizar */}
      <button
        className="btn-finalizar"
        onClick={() => {
          if (confirm('¿Confirmar cierre del lote actual?')) onFinalizar()
        }}
      >
        ⏹ Cerrar lote
      </button>
    </div>
  )
}
