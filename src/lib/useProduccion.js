import { useState, useEffect, useCallback } from 'react'
import {
  crearSesion, obtenerSesionActiva, cerrarSesion,
  registrarSecuencia, obtenerRegistros,
  marcarAlertaEnviada, obtenerAlertasEnviadas,
} from '../lib/supabase'
import { evaluarAlertas, UMBRALES } from '../lib/alertas'

export function useProduccion() {
  const [sesion, setSesion] = useState(null)
  const [registros, setRegistros] = useState([])
  const [alertasEnviadas, setAlertasEnviadas] = useState([])
  const [alertaActiva, setAlertaActiva] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  // Carga sesión activa al montar
  useEffect(() => {
    cargarSesionActiva()
  }, [])

  // Polling cada 60 segundos para mantener sincronizado si hay múltiples usuarios
  useEffect(() => {
    if (!sesion) return
    const interval = setInterval(() => cargarRegistros(sesion.id), 60_000)
    return () => clearInterval(interval)
  }, [sesion])

  async function cargarSesionActiva() {
    try {
      setCargando(true)
      const s = await obtenerSesionActiva()
      if (s) {
        setSesion(s)
        await cargarRegistros(s.id)
        const enviadas = await obtenerAlertasEnviadas(s.id)
        setAlertasEnviadas(enviadas)
        calcularAlertaActiva(s, enviadas)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  async function cargarRegistros(sesionId) {
    const regs = await obtenerRegistros(sesionId)
    setRegistros(regs)
    return regs
  }

  function calcularAlertaActiva(s, enviadas) {
    const ultimo = registros[registros.length - 1]
    if (!ultimo) return
    const faltantes = s.secuencia_meta - ultimo.secuencia_actual
    for (const u of [...UMBRALES].reverse()) {
      if (faltantes <= u.faltantes && enviadas.includes(u.nombre)) {
        setAlertaActiva(u)
        return
      }
    }
  }

  const iniciarSesion = useCallback(async (datos) => {
    try {
      setCargando(true)
      setError(null)
      const nueva = await crearSesion(datos)
      setSesion(nueva)
      setRegistros([])
      setAlertasEnviadas([])
      setAlertaActiva(null)
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setCargando(false)
    }
  }, [])

  const registrarNuevaSecuencia = useCallback(async (secuencia, operario) => {
    if (!sesion) return
    try {
      setError(null)
      const reg = await registrarSecuencia({ sesionId: sesion.id, secuencia, operario })
      const nuevosRegistros = [...registros, reg]
      setRegistros(nuevosRegistros)

      // Evaluar alertas
      const tipoAlerta = await evaluarAlertas({
        sesion,
        secuenciaActual: secuencia,
        alertasYaEnviadas: alertasEnviadas,
        onAlerta: ({ umbral }) => setAlertaActiva(umbral),
      })

      if (tipoAlerta) {
        await marcarAlertaEnviada({ sesionId: sesion.id, tipo: tipoAlerta })
        setAlertasEnviadas(prev => [...prev, tipoAlerta])
      }

      return reg
    } catch (e) {
      setError(e.message)
      throw e
    }
  }, [sesion, registros, alertasEnviadas])

  const finalizarSesion = useCallback(async () => {
    if (!sesion) return
    try {
      await cerrarSesion(sesion.id)
      setSesion(null)
      setRegistros([])
      setAlertasEnviadas([])
      setAlertaActiva(null)
    } catch (e) {
      setError(e.message)
      throw e
    }
  }, [sesion])

  // Métricas calculadas
  const metricas = calcularMetricas(sesion, registros)

  return {
    sesion, registros, alertaActiva, alertasEnviadas,
    cargando, error,
    iniciarSesion, registrarNuevaSecuencia, finalizarSesion,
    metricas,
  }
}

function calcularMetricas(sesion, registros) {
  if (!sesion) return null

  const ultimo = registros[registros.length - 1]
  const secuenciaActual = ultimo?.secuencia_actual ?? sesion.secuencia_inicio
  const producidas = secuenciaActual - sesion.secuencia_inicio
  const faltantes = sesion.secuencia_meta - secuenciaActual
  const porcentaje = Math.min(100, Math.round((producidas / sesion.cantidad_lote) * 100))

  // Velocidad: unidades por hora
  let velocidad = null
  let etaHoras = null
  if (registros.length >= 2) {
    const primero = registros[0]
    const ultimo = registros[registros.length - 1]
    const difMs = new Date(ultimo.created_at) - new Date(primero.created_at)
    const difHoras = difMs / 1000 / 3600
    if (difHoras > 0) {
      velocidad = Math.round((ultimo.secuencia_actual - primero.secuencia_actual) / difHoras)
      etaHoras = velocidad > 0 ? (faltantes / velocidad).toFixed(1) : null
    }
  }

  return { secuenciaActual, producidas, faltantes, porcentaje, velocidad, etaHoras }
}
