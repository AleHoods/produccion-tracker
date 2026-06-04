import { useState } from 'react'
import { useProduccion } from './lib/useProduccion'
import FormularioInicio from './components/FormularioInicio'
import Dashboard from './components/Dashboard'
import PanelProduccion from './components/PanelProduccion'
import './App.css'

export default function App() {
  const [paginaActiva, setPaginaActiva] = useState('produccion') // 'produccion' | 'panel'
  const {
    sesion, registros, alertaActiva, alertasEnviadas,
    cargando, error,
    iniciarSesion, registrarNuevaSecuencia, finalizarSesion, editarTamanoLote,
    metricas,
  } = useProduccion()

  return (
    <div className="app">
      <div className="bg-grid" />

      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <div>
              <div className="logo-title">CONTROL DE PRODUCCIÓN</div>
              <div className="logo-sub">Sistema de seguimiento de lotes</div>
            </div>
          </div>
          <nav className="header-nav">
            <button
              className={`nav-btn ${paginaActiva === 'produccion' ? 'active' : ''}`}
              onClick={() => setPaginaActiva('produccion')}
            >
              ⚙️ Producción
            </button>
            <button
              className={`nav-btn ${paginaActiva === 'panel' ? 'active' : ''}`}
              onClick={() => setPaginaActiva('panel')}
            >
              📊 Panel
            </button>
          </nav>
          <div className="header-status">
            <div className={`status-dot ${sesion ? 'activo' : 'inactivo'}`} />
            <span>{sesion ? 'SESIÓN ACTIVA' : 'SIN SESIÓN'}</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        {error && <div className="error-banner">⚠️ Error: {error}</div>}

        {paginaActiva === 'produccion' && (
          <>
            {cargando && !sesion ? (
              <div className="loading"><div className="loading-spinner" /><span>Cargando...</span></div>
            ) : sesion ? (
              <Dashboard
                sesion={sesion}
                registros={registros}
                metricas={metricas}
                alertaActiva={alertaActiva}
                alertasEnviadas={alertasEnviadas}
                onRegistrar={registrarNuevaSecuencia}
                onFinalizar={finalizarSesion}
                onEditarLote={editarTamanoLote}
                cargando={cargando}
              />
            ) : (
              <FormularioInicio onIniciar={iniciarSesion} cargando={cargando} />
            )}
          </>
        )}

        {paginaActiva === 'panel' && <PanelProduccion />}
      </main>

      <footer className="app-footer">
        <span>Control de Producción v2.0</span>
      </footer>
    </div>
  )
}
