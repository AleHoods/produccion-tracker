import { useState } from 'react'

export default function FormularioInicio({ onIniciar, cargando }) {
  const [form, setForm] = useState({
    modelo: '',
    operario: '',
    secuenciaInicio: '',
    cantidadLote: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onIniciar({
      modelo: form.modelo,
      operario: form.operario,
      secuenciaInicio: parseInt(form.secuenciaInicio),
      cantidadLote: parseInt(form.cantidadLote),
    })
  }

  const metaCalculada =
    form.secuenciaInicio && form.cantidadLote
      ? parseInt(form.secuenciaInicio) + parseInt(form.cantidadLote)
      : null

  return (
    <div className="form-card">
      <div className="form-header">
        <div className="form-icon">⚙️</div>
        <h2>Nueva sesión de producción</h2>
        <p>Configurá los parámetros del lote actual</p>
      </div>

      <form onSubmit={handleSubmit} className="form-body">
        <div className="form-row">
          <div className="field">
            <label>Modelo / Referencia</label>
            <input
              type="text"
              placeholder="Ej: MOD-2024-A"
              value={form.modelo}
              onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))}
              required
            />
          </div>
          <div className="field">
            <label>Operario</label>
            <input
              type="text"
              placeholder="Nombre del operario"
              value={form.operario}
              onChange={e => setForm(f => ({ ...f, operario: e.target.value }))}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>Secuencia de inicio</label>
            <input
              type="number"
              placeholder="Ej: 4500"
              value={form.secuenciaInicio}
              onChange={e => setForm(f => ({ ...f, secuenciaInicio: e.target.value }))}
              required
              min="0"
            />
          </div>
          <div className="field">
            <label>Cantidad a producir (lote)</label>
            <input
              type="number"
              placeholder="Ej: 96"
              value={form.cantidadLote}
              onChange={e => setForm(f => ({ ...f, cantidadLote: e.target.value }))}
              required
              min="1"
            />
          </div>
        </div>

        {metaCalculada && (
          <div className="meta-preview">
            <div className="meta-row">
              <span className="meta-label">🎯 Secuencia meta</span>
              <span className="meta-value">{metaCalculada.toLocaleString()}</span>
            </div>
            <div className="alertas-preview">
              <span className="ap-label">Alertas en:</span>
              {[30, 20, 10, 5].map(u => (
                <span key={u} className={`ap-badge ap-${u}`}>
                  {(metaCalculada - u).toLocaleString()}
                </span>
              ))}
            </div>
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={cargando}>
          {cargando ? '⏳ Iniciando...' : '▶ Iniciar producción'}
        </button>
      </form>
    </div>
  )
}
