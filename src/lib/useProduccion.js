import { useState, useEffect, useCallback } from 'react'
import {
  crearSesion, obtenerSesionActiva, cerrarSesion,
  registrarSecuencia, obtenerRegistros,
  marcarAlertaEnviada, obtenerAlertasEnviadas,
  supabase
} from './supabase'
import { evaluarAlertas, UMBRALES } from './alertas'
import {
  obtenerFranjas, franjaActual, detectarTurno,
  guardarHistoricoHora, guardarHistoricoDiario
} from './dashboard'

export function useProduccion() {
  const [sesion, setSesion] = useState(null)
  const [registros, setRegistros] = useState([])
  const [alertasEnviadas, setAlertasEnviadas] = useState([])
  const [alertaActiva, setAlertaActiva] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [franjas, setFranjas] = useState([])

  useEffect(() => {
    cargarSesionActiva()
    obtenerFranjas().then(setFranjas).catch(console.error)
  }, [])

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

      // Guardar histórico hora a hora
      try {
        const ahora = new Date()
        const horaStr = ahora.toTimeString().slice(0, 5)
        const fecha = ahora.toISOString().split('T')[0]
        const franjasActuales = franjas.length > 0 ? franjas : await obtenerFranjas()
        const franja = franjaActual(franjasActuales, horaStr)
        if (franja) {
          const turno = detectarTurno(franjasActuales, horaStr)
          // Calcular producido en esta franja
          const regsEnFranja = nuevosRegistros.filter(r => {
            const h = new Date(r.created_at).toTimeString().slice(0, 5)
            return h >= franja.hora_inicio.slice(0, 5) && h < franja.hora_fin.slice(0, 5)
          })
          const producidoFranja = regsEnFranja.length > 0
            ? regsEnFranja[regsEnFranja.length - 1].secuencia_actual - (regsEnFranja[0].secuencia_actual - (registros.length > 0 ? registros[registros.length - 1].secuencia_actual - sesion.secuencia_inicio : 0))
            : secuencia - sesion.secuencia_inicio
          await guardarHistoricoHora({
            fecha,
            turno,
            franja_inicio: franja.hora_inicio,
            franja_fin: franja.hora_fin,
            target: franja.target,
            producido: secuencia - sesion.secuencia_inicio,
            sesion_id: sesion.id
          })
        }
      } catch (e) {
        console.warn('Error guardando histórico hora:', e)
      }

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
  }, [sesion, registros, alertasEnviadas, franjas])

  const editarTamanoLote = useCallback(async (nuevaCantidad) => {
    if (!sesion) return
    try {
      setError(null)
      const nuevaMeta = sesion.secuencia_inicio + nuevaCantidad
      const { data, error } = await supabase
        .from('sesiones')
        .update({ cantidad_lote: nuevaCantidad, secuencia_meta: nuevaMeta })
        .eq('id', sesion.id)
        .select()
        .single()
      if (error) throw error
      setSesion(data)
      await supabase.from('alertas_enviadas').delete().eq('sesion_id', sesion.id)
      setAlertasEnviadas([])
      setAlertaActiva(null)
    } catch (e) {
      setError(e.message)
      throw e
    }
  }, [sesion])

  const finalizarSesion = useCallback(async () => {
    if (!sesion) return
    try {
      // Guardar histórico diario al cerrar
      try {
        const ahora = new Date()
        const horaStr = ahora.toTimeString().slice(0, 5)
        const fecha = ahora.toISOString().split('T')[0]
        const franjasActuales = franjas.length > 0 ? franjas : await obtenerFranjas()
        const turno = detectarTurno(franjasActuales, horaStr)
        const totalTarget = franjasActuales
          .filter(f => f.turno === turno)
          .reduce((s, f) => s + f.target, 0)
        const ultimoReg = registros[registros.length - 1]
        const producido = ultimoReg
          ? ultimoReg.secuencia_actual - sesion.secuencia_inicio
          : 0
        await guardarHistoricoDiario({
          fecha,
          turno,
          modelo: sesion.modelo,
          lider: sesion.operario,
          target_total: totalTarget,
          producido
        })
      } catch (e) {
        console.warn('Error guardando histórico diario:', e)
      }

      await cerrarSesion(sesion.id)
      setSesion(null)
      setRegistros([])
      setAlertasEnviadas([])
      setAlertaActiva(null)
    } catch (e) {
      setError(e.message)
      throw e
    }
  }, [sesion, registros, franjas])

  const metricas = calcularMetricas(sesion, registros)

  return {
    sesion, registros, alertaActiva, alertasEnviadas,
    cargando, error,
    iniciarSesion, registrarNuevaSecuencia, finalizarSesion, editarTamanoLote,
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
  let velocidad = null
  let etaHoras = null
  if (registros.length >= 2) {
    const primero = registros[0]
    const ult = registros[registros.length - 1]
    const difMs = new Date(ult.created_at) - new Date(primero.created_at)
    const difHoras = difMs / 1000 / 3600
    if (difHoras > 0) {
      velocidad = Math.round((ult.secuencia_actual - primero.secuencia_actual) / difHoras)
      etaHoras = velocidad > 0 ? (faltantes / velocidad).toFixed(1) : null
    }
  }
  return { secuenciaActual, producidas, faltantes, porcentaje, velocidad, etaHoras }
}
