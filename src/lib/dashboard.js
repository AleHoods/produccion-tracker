import { supabase } from './supabase'

// ── FRANJAS HORARIAS ─────────────────────────────────────────────────────────

export async function obtenerFranjas() {
  const { data, error } = await supabase
    .from('franjas_horarias')
    .select('*')
    .eq('activa', true)
    .order('turno')
    .order('hora_inicio')
  if (error) throw error
  return data || []
}

export async function actualizarFranja(id, target) {
  const { error } = await supabase
    .from('franjas_horarias')
    .update({ target })
    .eq('id', id)
  if (error) throw error
}

export async function agregarFranja({ turno, hora_inicio, hora_fin, target }) {
  const { error } = await supabase
    .from('franjas_horarias')
    .insert([{ turno, hora_inicio, hora_fin, target }])
  if (error) throw error
}

export async function eliminarFranja(id) {
  const { error } = await supabase
    .from('franjas_horarias')
    .update({ activa: false })
    .eq('id', id)
  if (error) throw error
}

// ── HISTÓRICO ────────────────────────────────────────────────────────────────

export async function obtenerHistoricoHoras({ fecha, turno } = {}) {
  let query = supabase
    .from('historico_horas')
    .select('*')
    .order('fecha', { ascending: false })
    .order('franja_inicio')
  if (fecha) query = query.eq('fecha', fecha)
  if (turno) query = query.eq('turno', turno)
  const { data, error } = await query.limit(200)
  if (error) throw error
  return data || []
}

export async function obtenerHistoricoDiario() {
  const { data, error } = await supabase
    .from('historico_diario')
    .select('*')
    .order('fecha', { ascending: false })
    .order('turno')
    .limit(100)
  if (error) throw error
  return data || []
}

export async function guardarHistoricoHora({ fecha, turno, franja_inicio, franja_fin, target, producido, sesion_id }) {
  const { error } = await supabase
    .from('historico_horas')
    .upsert([{ fecha, turno, franja_inicio, franja_fin, target, producido, sesion_id }],
      { onConflict: 'fecha,turno,franja_inicio' })
  if (error) throw error
}

export async function guardarHistoricoDiario({ fecha, turno, modelo, lider, target_total, producido }) {
  const { error } = await supabase
    .from('historico_diario')
    .upsert([{ fecha, turno, modelo, lider, target_total, producido }],
      { onConflict: 'fecha,turno' })
  if (error) throw error
}

export function detectarTurno(franjas, horaActual) {
  const [h, m] = horaActual.split(':').map(Number)
  const minutos = h * 60 + m
  for (const f of franjas) {
    const [fh, fm] = f.hora_inicio.split(':').map(Number)
    const [th, tm] = f.hora_fin.split(':').map(Number)
    if (minutos >= fh * 60 + fm && minutos < th * 60 + tm) return f.turno
  }
  return 1
}

export function franjaActual(franjas, horaActual) {
  const [h, m] = horaActual.split(':').map(Number)
  const minutos = h * 60 + m
  return franjas.find(f => {
    const [fh, fm] = f.hora_inicio.split(':').map(Number)
    const [th, tm] = f.hora_fin.split(':').map(Number)
    return minutos >= fh * 60 + fm && minutos < th * 60 + tm
  }) || null
}

export function agruparPorFecha(historicoDiario) {
  const mapa = {}
  for (const r of historicoDiario) {
    if (!mapa[r.fecha]) mapa[r.fecha] = { fecha: r.fecha, t1: null, t2: null }
    if (r.turno === 1) mapa[r.fecha].t1 = r
    if (r.turno === 2) mapa[r.fecha].t2 = r
  }
  return Object.values(mapa).sort((a, b) => b.fecha.localeCompare(a.fecha))
}
