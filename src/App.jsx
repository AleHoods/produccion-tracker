import { useProduccion } from './lib/useProduccion'
import FormularioInicio from './components/FormularioInicio'
import Dashboard from './components/Dashboard'
import './App.css'

export default function App() {
  const {
    sesion, registros, alertaActiva, alertasEnviadas,
    cargando, error,
    iniciarSesion, registrarNuevaSecuencia, finalizarSesion,
    metricas,
  } = useProduccion()

  return (
    <div className="app">
      {/* Fondo industrial */}
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
          <div className="header-status">
            <div className={`status-dot ${sesion ? 'activo' : 'inactivo'}`} />
            <span>{sesion ? 'SESIÓN ACTIVA' : 'SIN SESIÓN'}</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-banner">
            ⚠️ Error: {error}
          </div>
        )}

        {cargando && !sesion ? (
          <div className="loading">
            <div className="loading-spinner" />
            <span>Cargando...</span>
          </div>
        ) : sesion ? (
          <Dashboard
            sesion={sesion}
            registros={registros}
            metricas={metricas}
            alertaActiva={alertaActiva}
            alertasEnviadas={alertasEnviadas}
            onRegistrar={registrarNuevaSecuencia}
            onFinalizar={finalizarSesion}
            cargando={cargando}
          />
        ) : (
          <FormularioInicio onIniciar={iniciarSesion} cargando={cargando} />
        )}
      </main>

      <footer className="app-footer">
        <span>Control de Producción v1.0</span>
      </footer>
    </div>
  )
}
