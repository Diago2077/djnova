import { DEFAULT_CONFIG, LIST_KEYS, LIST_TEMPLATES, REDES_FIJAS } from '../defaults'
import type { Ajustes, SiteConfig, Tablas } from '../types'

const TRUE_WORDS = ['true', 'verdadero', '1', 'si', 'sí', 'x', 'yes']

function cast(raw: unknown, sample: unknown): unknown {
  const s = raw == null ? '' : String(raw).trim()
  // Celda vacía = columna nueva que aún no se rellenó: se conserva el valor por defecto.
  if (typeof sample === 'boolean') return s === '' ? sample : TRUE_WORDS.includes(s.toLowerCase())
  if (typeof sample === 'number') {
    const n = Number(s.replace(',', '.'))
    return Number.isFinite(n) ? n : sample
  }
  return raw == null ? '' : String(raw)
}

/** Convierte la configuración en pestañas planas para Google Sheets. */
export function toTablas(cfg: SiteConfig): Tablas {
  const ajustes: Record<string, string>[] = []
  for (const [grupo, campos] of Object.entries(cfg.ajustes)) {
    for (const [campo, valor] of Object.entries(campos as Record<string, unknown>)) {
      ajustes.push({ clave: `${grupo}.${campo}`, valor: String(valor ?? '') })
    }
  }
  const tablas: Tablas = { ajustes }
  for (const key of LIST_KEYS) {
    const cols = Object.keys(LIST_TEMPLATES[key])
    tablas[key] = (cfg[key] as unknown as Record<string, unknown>[]).map((item) =>
      Object.fromEntries(cols.map((c) => [c, String(item[c] ?? '')])),
    )
  }
  return tablas
}

/**
 * Reconstruye la configuración desde las pestañas. Los campos que falten en la
 * hoja toman el valor por defecto, así la web nunca se rompe por una celda vacía.
 */
export function fromTablas(t: Tablas | null | undefined): SiteConfig {
  const cfg: SiteConfig = structuredClone(DEFAULT_CONFIG)
  if (!t) return cfg

  for (const row of t.ajustes ?? []) {
    const [grupo, campo] = String(row.clave ?? '').split('.')
    const g = (cfg.ajustes as unknown as Record<string, Record<string, unknown>>)[grupo]
    if (!g || !(campo in g)) continue
    g[campo] = cast(row.valor, (DEFAULT_CONFIG.ajustes as unknown as Record<string, Record<string, unknown>>)[grupo][campo])
  }

  for (const key of LIST_KEYS) {
    const rows = t[key]
    if (!Array.isArray(rows)) continue
    const tpl = LIST_TEMPLATES[key] as unknown as Record<string, unknown>
    ;(cfg as unknown as Record<string, unknown>)[key] = rows
      .filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''))
      .map((r) => Object.fromEntries(Object.entries(tpl).map(([c, sample]) => [c, cast(r[c], sample)])))
  }

  // Redes: una fila fija por red. Se respeta el orden guardado (flechas del admin), se descartan
  // nombres que no sean de la lista y las que falten se añaden vacías al final.
  const nombre = (n: string) => REDES_FIJAS.find((f) => f.toLowerCase() === n.trim().toLowerCase())
  const redes: SiteConfig['redes'] = []
  for (const r of cfg.redes) {
    const red = nombre(r.red)
    if (red && !redes.some((x) => x.red === red)) redes.push({ red, url: r.url })
  }
  for (const red of REDES_FIJAS) if (!redes.some((x) => x.red === red)) redes.push({ red, url: '' })
  cfg.redes = redes

  // Asegura que las secciones nuevas que añada el código aparezcan aunque la hoja sea antigua.
  for (const s of DEFAULT_CONFIG.secciones) {
    if (!cfg.secciones.some((x) => x.id === s.id)) cfg.secciones.push({ ...s, visible: false })
  }
  return cfg
}

export type { Ajustes }
