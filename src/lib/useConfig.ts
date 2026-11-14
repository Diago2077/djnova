import { useEffect, useState } from 'react'
import { DEFAULT_CONFIG } from '../defaults'
import type { SiteConfig } from '../types'
import { cachedConfig, fetchConfig } from './api'

/**
 * Pinta al instante con la última configuración guardada en el navegador y la
 * actualiza en segundo plano con la versión de Google Sheets.
 */
export function useConfig() {
  const [cfg, setCfg] = useState<SiteConfig | null>(() => cachedConfig())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    fetchConfig()
      .then((c) => vivo && setCfg(c))
      .catch((e) => {
        if (!vivo) return
        setError(String(e?.message ?? e))
        setCfg((prev) => prev ?? structuredClone(DEFAULT_CONFIG))
      })
    return () => {
      vivo = false
    }
  }, [])

  return { cfg, error }
}
