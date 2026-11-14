// API pública: lo único que necesita la web (leer configuración y enviar
// solicitudes de contratación). Lo del /admin vive en src/admin/lib/api.ts
// para que no viaje en el bundle de la web pública.
import type { Contratacion, SiteConfig, Tablas } from '../types'
import { fromTablas } from './tables'

export const API = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || ''

/** Sin VITE_API_URL la app funciona en modo demo (sin Google Sheets). */
export const DEMO = !API

export const LS = {
  cache: 'djnova:config',
  demoConfig: 'djnova:demo-config',
  demoBookings: 'djnova:demo-bookings',
  demoUsers: 'djnova:demo-users',
  token: 'djnova:token',
}

export function readLS<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
export function writeLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* almacenamiento no disponible */
  }
}

export class ApiError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
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
  const json = await res.json().catch(() => ({ error: 'Respuesta inválida del servidor.' }))
  if (json.error) throw new ApiError(json.error, json.code)
  return json as T
}

/** Configuración guardada en el navegador (para pintar al instante). */
export function cachedConfig(): SiteConfig | null {
  const t = readLS<Tablas>(DEMO ? LS.demoConfig : LS.cache)
  return t ? fromTablas(t) : null
}

export async function fetchConfig(): Promise<SiteConfig> {
  if (DEMO) return fromTablas(readLS<Tablas>(LS.demoConfig))
  const res = await fetch(`${API}?action=config`)
  const json = await res.json()
  if (json.error) throw new ApiError(json.error)
  writeLS(LS.cache, json.tablas)
  return fromTablas(json.tablas)
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

export async function enviarContratacion(data: SolicitudContratacion) {
  if (DEMO) {
    const list = readLS<Contratacion[]>(LS.demoBookings) ?? []
    list.unshift({ ...data, fila: Date.now(), recibido: new Date().toISOString(), estado: 'Nuevo' })
    writeLS(LS.demoBookings, list)
    return
  }
  await post({ action: 'booking', data })
}
