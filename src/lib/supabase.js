import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// ── Sesiones de producción ──────────────────────────────────────────────────

export async function crearSesion({ secuenciaInicio, cantidadLote, modelo, operario }) {
  const meta = secuenciaInicio + cantidadLote
  const { data, error } = await supabase
    .from('sesiones')
    .insert([{ secuencia_inicio: secuenciaInicio, secuencia_meta: meta, cantidad_lote: cantidadLote, modelo, operario, activa: true }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function obtenerSesionActiva() {
  const { data, error } = await supabase
    .from('sesiones')
    .select('*')
    .eq('activa', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function cerrarSesion(id) {
  const { error } = await supabase
    .from('sesiones')
    .update({ activa: false, cerrada_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ── Registros horarios ──────────────────────────────────────────────────────

export async function registrarSecuencia({ sesionId, secuencia, operario }) {
  const { data, error } = await supabase
    .from('registros')
    .insert([{ sesion_id: sesionId, secuencia_actual: secuencia, operario }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function obtenerRegistros(sesionId) {
  const { data, error } = await supabase
    .from('registros')
    .select('*')
    .eq('sesion_id', sesionId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function obtenerHistorialSesiones() {
  const { data, error } = await supabase
    .from('sesiones')
    .select('*, registros(count)')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data || []
}

// ── Alertas enviadas ────────────────────────────────────────────────────────

export async function marcarAlertaEnviada({ sesionId, tipo }) {
  const { error } = await supabase
    .from('alertas_enviadas')
    .insert([{ sesion_id: sesionId, tipo }])
  if (error && error.code !== '23505') throw error // ignora duplicados
}

export async function obtenerAlertasEnviadas(sesionId) {
  const { data, error } = await supabase
    .from('alertas_enviadas')
    .select('tipo')
    .eq('sesion_id', sesionId)
  if (error) throw error
  return (data || []).map(a => a.tipo)
}
