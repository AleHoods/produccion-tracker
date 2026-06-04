import { useState, useEffect } from 'react'
import {
  obtenerFranjas, actualizarFranja, agregarFranja, eliminarFranja,
  obtenerHistoricoHoras, obtenerHistoricoDiario, agruparPorFecha
} from '../lib/dashboard'

export default function PanelProduccion() {
  const [vista, setVista] = useState('horas') // 'horas' | 'dias' | 'config'
  const [franjas, setFranjas] = useState([])
  const [historicoHoras, setHistoricoHoras] = useState([])
  const [historicoDiario, setHistoricoDiario] = useState([])
  const [cargando, setCargando] = useState(true)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0])
  const [editandoFranja, setEditandoFranja] = useState(null)
  const [nuevaFranja, setNuevaFranja] = useState({ turno: 1, hora_inicio: '', hora_fin: '', target: 0 })
  const [mostrarFormNueva, setMostrarFormNueva] = useState(false)

  useEffect(() => { cargarTodo() }, [])
  useEffect(() => { if (vista === 'horas') cargarHoras() }, [fechaSeleccionada, vista])

  async function cargarTodo() {
    setCargando(true)
    try {
      const [f, d] = await Promise.all([obtenerFranjas(), obtenerHistoricoDiario()])
      setFranjas(f)
      setHistoricoDiario(d)
      await cargarHoras()
    } finally {
      setCargando(false)
    }
  }

  async function cargarHoras() {
    const h = await obtenerHistoricoHoras({ fecha: fechaSeleccionada })
    setHistoricoHoras(h)
  }

  async function handleGuardarFranja(id, target) {
    await actualizarFranja(id, parseInt(target))
    setEditandoFranja(null)
    const f = await obtenerFranjas()
    setFranjas(f)
  }

  async function handleEliminarFranja(id) {
    if (!confirm('¿Eliminar esta franja?')) return
    await eliminarFranja(id)
    const f = await obtenerFranjas()
    setFranjas(f)
  }

  async function handleAgregarFranja(e) {
    e.preventDefault()
    await agregarFranja(nuevaFranja)
    setMostrarFormNueva(false)
    setNuevaFranja({ turno: 1, hora_inicio: '', hora_fin: '', target: 0 })
    const f = await obtenerFranjas()
    setFranjas(f)
  }

  // Construir tabla hora a hora para la fecha seleccionada
  function buildTablaHoras(turno) {
    const franjasT = franjas.filter(f => f.turno === turno)
    return franjasT.map(f => {
      const hist = historicoHoras.find(h =>
        h.turno === turno && h.franja_inicio === f.hora_inicio
      )
      const producido = hist?.producido ?? null
      const diferencia = producido !== null ? producido - f.target : null
      return { ...f, producido, diferencia }
    })
  }

  const tablat1 = buildTablaHoras(1)
  const tablat2 = buildTablaHoras(2)
  const totalTargetT1 = tablat1.reduce((s, r) => s + r.target, 0)
  const totalTargetT2 = tablat2.reduce((s, r) => s + r.target, 0)
  const totalProdT1 = tablat1.reduce((s, r) => s + (r.producido ?? 0), 0)
  const totalProdT2 = tablat2.reduce((s, r) => s + (r.producido ?? 0), 0)
  const acumT1 = tablat1.reduce((acc, r, i) => {
    const prev = i > 0 ? acc[i-1] : 0
    return [...acc, prev + (r.producido ?? 0)]
  }, [])
  const acumT2 = tablat2.reduce((acc, r, i) => {
    const prev = i > 0 ? acc[i-1] : 0
    return [...acc, prev + (r.producido ?? 0)]
  }, [])

  const diasAgrupados = agruparPorFecha(historicoDiario)

  return (
    <div className="panel-produccion">
      {/* Tabs */}
      <div className="panel-tabs">
        <button className={`panel-tab ${vista === 'horas' ? 'active' : ''}`} onClick={() => setVista('horas')}>
          📊 Hora a Hora
        </button>
        <button className={`panel-tab ${vista === 'dias' ? 'active' : ''}`} onClick={() => setVista('dias')}>
          📅 Día a Día
        </button>
        <button className={`panel-tab ${vista === 'config' ? 'active' : ''}`} onClick={() => setVista('config')}>
          ⚙️ Configuración
        </button>
      </div>

      {cargando ? (
        <div className="loading"><div className="loading-spinner" /><span>Cargando...</span></div>
      ) : (
        <>
          {/* ── VISTA HORA A HORA ── */}
          {vista === 'horas' && (
            <div className="vista-horas">
              <div className="vista-header">
                <h2>Panel Hora a Hora</h2>
                <input
                  type="date"
                  value={fechaSeleccionada}
                  onChange={e => setFechaSeleccionada(e.target.value)}
                  className="input-fecha"
                />
              </div>

              {[{ turno: 1, tabla: tablat1, acum: acumT1, totalTarget: totalTargetT1, totalProd: totalProdT1, label: '1er TURNO' },
                { turno: 2, tabla: tablat2, acum: acumT2, totalTarget: totalTargetT2, totalProd: totalProdT2, label: '2do TURNO' }
              ].map(({ turno, tabla, acum, totalTarget, totalProd, label }) => (
                <div key={turno} className="turno-block">
                  <div className="turno-title">{label}</div>
                  <div className="tabla-scroll">
                    <table className="tabla-horas">
                      <thead>
                        <tr>
                          <td className="th-label">Franja</td>
                          {tabla.map(f => (
                            <th key={f.id}>{f.hora_inicio.slice(0,5)}-{f.hora_fin.slice(0,5)}</th>
                          ))}
                          <th className="th-total">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="tr-objetivo">
                          <td className="td-label">Objetivo</td>
                          {tabla.map(f => <td key={f.id}>{f.target}</td>)}
                          <td className="td-total">{totalTarget}</td>
                        </tr>
                        <tr className="tr-producido">
                          <td className="td-label">Producido</td>
                          {tabla.map(f => (
                            <td key={f.id} className={f.producido !== null ? '' : 'td-vacio'}>
                              {f.producido !== null ? f.producido : '—'}
                            </td>
                          ))}
                          <td className="td-total">{totalProd}</td>
                        </tr>
                        <tr className="tr-acumulado">
                          <td className="td-label">Acumulado</td>
                          {tabla.map((f, i) => (
                            <td key={f.id} className={f.producido !== null ? '' : 'td-vacio'}>
                              {f.producido !== null ? acum[i] : '—'}
                            </td>
                          ))}
                          <td className="td-total">{acum[acum.length - 1] || 0}</td>
                        </tr>
                        <tr className="tr-diferencia">
                          <td className="td-label">Diferencia</td>
                          {tabla.map(f => (
                            <td key={f.id}
                              className={f.diferencia === null ? 'td-vacio' : f.diferencia >= 0 ? 'td-pos' : 'td-neg'}>
                              {f.diferencia !== null ? (f.diferencia > 0 ? `+${f.diferencia}` : f.diferencia) : '—'}
                            </td>
                          ))}
                          <td className={`td-total ${totalProd - totalTarget >= 0 ? 'td-pos' : 'td-neg'}`}>
                            {totalProd - totalTarget > 0 ? `+${totalProd - totalTarget}` : totalProd - totalTarget}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Resumen del día */}
              <div className="resumen-dia">
                <div className="resumen-item">
                  <span className="r-label">Target total día</span>
                  <span className="r-val">{totalTargetT1 + totalTargetT2}</span>
                </div>
                <div className="resumen-item">
                  <span className="r-label">Producido total</span>
                  <span className="r-val">{totalProdT1 + totalProdT2}</span>
                </div>
                <div className={`resumen-item ${(totalProdT1 + totalProdT2) - (totalTargetT1 + totalTargetT2) >= 0 ? 'pos' : 'neg'}`}>
                  <span className="r-label">Diferencia</span>
                  <span className="r-val">
                    {(totalProdT1 + totalProdT2) - (totalTargetT1 + totalTargetT2) > 0
                      ? `+${(totalProdT1 + totalProdT2) - (totalTargetT1 + totalTargetT2)}`
                      : (totalProdT1 + totalProdT2) - (totalTargetT1 + totalTargetT2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── VISTA DÍA A DÍA ── */}
          {vista === 'dias' && (
            <div className="vista-dias">
              <h2>Panel Día a Día</h2>
              {diasAgrupados.length === 0 ? (
                <div className="empty-state">No hay datos históricos todavía. Se guardan automáticamente al cerrar cada lote.</div>
              ) : (
                <div className="tabla-scroll">
                  <table className="tabla-dias">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>T1 Modelo</th>
                        <th>T1 Líder</th>
                        <th>T1 Target</th>
                        <th>T1 Prod.</th>
                        <th>T1 Dif.</th>
                        <th>T2 Modelo</th>
                        <th>T2 Líder</th>
                        <th>T2 Target</th>
                        <th>T2 Prod.</th>
                        <th>T2 Dif.</th>
                        <th>Total Prod.</th>
                        <th>Total Dif.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diasAgrupados.map(dia => {
                        const totalProd = (dia.t1?.producido ?? 0) + (dia.t2?.producido ?? 0)
                        const totalTarget = (dia.t1?.target_total ?? 0) + (dia.t2?.target_total ?? 0)
                        const totalDif = totalProd - totalTarget
                        return (
                          <tr key={dia.fecha}>
                            <td className="td-fecha">{new Date(dia.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}</td>
                            <td>{dia.t1?.modelo ?? '—'}</td>
                            <td>{dia.t1?.lider ?? '—'}</td>
                            <td>{dia.t1?.target_total ?? '—'}</td>
                            <td>{dia.t1?.producido ?? '—'}</td>
                            <td className={dia.t1 ? (dia.t1.diferencia >= 0 ? 'td-pos' : 'td-neg') : ''}>
                              {dia.t1 ? (dia.t1.diferencia > 0 ? `+${dia.t1.diferencia}` : dia.t1.diferencia) : '—'}
                            </td>
                            <td>{dia.t2?.modelo ?? '—'}</td>
                            <td>{dia.t2?.lider ?? '—'}</td>
                            <td>{dia.t2?.target_total ?? '—'}</td>
                            <td>{dia.t2?.producido ?? '—'}</td>
                            <td className={dia.t2 ? (dia.t2.diferencia >= 0 ? 'td-pos' : 'td-neg') : ''}>
                              {dia.t2 ? (dia.t2.diferencia > 0 ? `+${dia.t2.diferencia}` : dia.t2.diferencia) : '—'}
                            </td>
                            <td className="td-total">{totalProd}</td>
                            <td className={`td-total ${totalDif >= 0 ? 'td-pos' : 'td-neg'}`}>
                              {totalDif > 0 ? `+${totalDif}` : totalDif}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── VISTA CONFIGURACIÓN ── */}
          {vista === 'config' && (
            <div className="vista-config">
              <h2>Configuración de Franjas Horarias</h2>
              <p className="config-sub">Editá los targets por franja para cada turno. Los cambios se aplican desde el próximo registro.</p>

              {[1, 2].map(turno => (
                <div key={turno} className="config-turno">
                  <div className="config-turno-title">Turno {turno}</div>
                  <div className="config-tabla">
                    <div className="config-header">
                      <span>Franja</span>
                      <span>Target</span>
                      <span>Acciones</span>
                    </div>
                    {franjas.filter(f => f.turno === turno).map(f => (
                      <div key={f.id} className="config-row">
                        <span className="config-franja">{f.hora_inicio.slice(0,5)} → {f.hora_fin.slice(0,5)}</span>
                        {editandoFranja === f.id ? (
                          <input
                            type="number"
                            defaultValue={f.target}
                            className="input-target"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleGuardarFranja(f.id, e.target.value)
                              if (e.key === 'Escape') setEditandoFranja(null)
                            }}
                            onBlur={e => handleGuardarFranja(f.id, e.target.value)}
                          />
                        ) : (
                          <span className="config-target">{f.target}</span>
                        )}
                        <div className="config-acciones">
                          <button className="btn-edit-small" onClick={() => setEditandoFranja(f.id)}>✏️</button>
                          <button className="btn-del-small" onClick={() => handleEliminarFranja(f.id)}>🗑</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <button className="btn-nueva-franja" onClick={() => setMostrarFormNueva(!mostrarFormNueva)}>
                + Agregar franja
              </button>

              {mostrarFormNueva && (
                <form onSubmit={handleAgregarFranja} className="form-nueva-franja">
                  <div className="form-row">
                    <div className="field">
                      <label>Turno</label>
                      <select value={nuevaFranja.turno} onChange={e => setNuevaFranja(f => ({ ...f, turno: parseInt(e.target.value) }))} className="select-modelo">
                        <option value={1}>Turno 1</option>
                        <option value={2}>Turno 2</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Hora inicio</label>
                      <input type="time" value={nuevaFranja.hora_inicio} onChange={e => setNuevaFranja(f => ({ ...f, hora_inicio: e.target.value }))} required className="input-secuencia" />
                    </div>
                    <div className="field">
                      <label>Hora fin</label>
                      <input type="time" value={nuevaFranja.hora_fin} onChange={e => setNuevaFranja(f => ({ ...f, hora_fin: e.target.value }))} required className="input-secuencia" />
                    </div>
                    <div className="field">
                      <label>Target</label>
                      <input type="number" value={nuevaFranja.target} onChange={e => setNuevaFranja(f => ({ ...f, target: parseInt(e.target.value) }))} min="0" required className="input-secuencia" />
                    </div>
                  </div>
                  <div className="modal-botones">
                    <button type="button" className="btn-cancelar" onClick={() => setMostrarFormNueva(false)}>Cancelar</button>
                    <button type="submit" className="btn-primary">Guardar franja</button>
                  </div>
                </form>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
