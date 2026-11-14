// API pública: lo único que necesita la web (leer su contenido y enviar
// solicitudes de contratación). Lo del /admin vive en src/admin/lib/api.ts
// para que no viaje en el bundle de la web pública.
//
// Contrato del backend (apps-script/Code.gs, estructura «Pedidos ON»):
//   POST text/plain { action, ...datos }  →  { ok: true, ... } | { ok: false, error, codigo }
import type { Contratacion, SiteConfig, Tablas } from '../types'
import { fromTablas } from './tables'

export const API = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || ''

/** Sin VITE_API_URL la app funciona en modo demo (sin Google Sheets). */
export const DEMO = !API

export const LS = {
  cache: 'djnova:sitio',
  demoConfig: 'djnova:demo-sitio',
  demoBookings: 'djnova:demo-contrataciones',
  demoUsers: 'djnova:demo-usuarios',
  sesion: 'djnova:sesion',
}

export function readLS<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
export function writeLS(key: string, value: unknown): boolean {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false // almacenamiento no disponible o lleno
  }
}

export class ApiError extends Error {
  codigo?: string
  constructor(message: string, codigo?: string) {
    super(message)
    this.codigo = codigo
  }
}

// Apps Script acepta POST con text/plain sin "preflight" CORS.
export async function post<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  let res: Response
  try {
    res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError('No hay conexión con el servidor.')
  }
  const json = await res.json().catch(() => ({ ok: false, error: 'Respuesta inválida del servidor.' }))
  if (!json.ok) throw new ApiError(json.error || 'Error del servidor.', json.codigo || undefined)
  return json as T
}

/** Contenido guardado en el navegador (para pintar al instante). */
export function cachedConfig(): SiteConfig | null {
  const t = readLS<Tablas>(DEMO ? LS.demoConfig : LS.cache)
  return t ? fromTablas(t) : null
}

/** tablas = null mientras nunca se publicó desde el /admin: se usa el contenido de ejemplo. */
export async function fetchConfig(): Promise<SiteConfig> {
  if (DEMO) return fromTablas(readLS<Tablas>(LS.demoConfig))
  const { tablas } = await post<{ tablas: Tablas | null }>({ action: 'getSitio' })
  writeLS(LS.cache, tablas)
  return fromTablas(tablas)
}

export interface SolicitudContratacion {
  nombre: string
  contacto: string
  fechaEvento: string
  ciudad: string
  evento: string
  mensaje: string
  web?: string // honeypot anti-spam
}

export async function enviarContratacion(datos: SolicitudContratacion) {
  if (DEMO) {
    const list = readLS<Contratacion[]>(LS.demoBookings) ?? []
    list.unshift({ ...datos, id: crypto.randomUUID().slice(0, 12), recibido: new Date().toISOString(), estado: 'Nuevo' })
    writeLS(LS.demoBookings, list)
    return
  }
  await post({ action: 'enviarContratacion', datos })
}
