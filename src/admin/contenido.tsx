import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { fetchConfig } from '@/lib/api'
import type { Ajustes, ListaKey, SiteConfig } from '@/types'
import { guardarConfig } from './lib/api'

type Valor = string | number | boolean

interface ContenidoState {
  cfg: SiteConfig | null
  error: string | null
  cambios: boolean
  guardando: boolean
  setAjuste: (grupo: keyof Ajustes, campo: string, valor: Valor) => void
  setLista: (key: ListaKey, items: Record<string, Valor>[]) => void
  guardar: () => Promise<void>
  descartar: () => void
}

const Ctx = createContext<ContenidoState | null>(null)

/**
 * Borrador del contenido de la web. Vive en el layout para que los cambios sin
 * guardar sobrevivan al pasar a Contrataciones o Usuarios y volver.
 */
export function ContenidoProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<SiteConfig | null>(null)
  const [original, setOriginal] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    fetchConfig()
      .then((c) => {
        setCfg(c)
        setOriginal(JSON.stringify(c))
      })
      .catch((e) => setError(`No se pudo cargar el contenido: ${e.message}`))
  }, [])

  const cambios = useMemo(() => !!cfg && JSON.stringify(cfg) !== original, [cfg, original])

  useEffect(() => {
    const avisar = (e: BeforeUnloadEvent) => {
      if (cambios) e.preventDefault()
    }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [cambios])

  const setAjuste = useCallback((grupo: keyof Ajustes, campo: string, valor: Valor) => {
    setCfg((c) => c && { ...c, ajustes: { ...c.ajustes, [grupo]: { ...c.ajustes[grupo], [campo]: valor } } })
  }, [])

  const setLista = useCallback((key: ListaKey, items: Record<string, Valor>[]) => {
    setCfg((c) => c && { ...c, [key]: items })
  }, [])

  const guardar = useCallback(async () => {
    if (!cfg) return
    setGuardando(true)
    try {
      await guardarConfig(cfg)
      setOriginal(JSON.stringify(cfg))
      toast.success('Cambios publicados en la web')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar.')
    } finally {
      setGuardando(false)
    }
  }, [cfg])

  const descartar = useCallback(() => setCfg(JSON.parse(original)), [original])

  const valor = useMemo(
    () => ({ cfg, error, cambios, guardando, setAjuste, setLista, guardar, descartar }),
    [cfg, error, cambios, guardando, setAjuste, setLista, guardar, descartar],
  )
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useContenido() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useContenido tiene que usarse dentro de <ContenidoProvider>')
  return ctx
}
