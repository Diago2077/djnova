import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import * as api from './lib/api'
import type { Perfil } from './lib/api'

// Adaptado de contable/src/hooks/useAuth.tsx: misma forma de contexto, pero la
// sesión la valida el Apps Script de la Google Sheet en vez de Supabase Auth.

interface AuthState {
  perfil: Perfil | null
  loading: boolean
  esAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refrescarPerfil: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)

  const refrescarPerfil = useCallback(async () => {
    if (!api.getToken()) {
      setPerfil(null)
      return
    }
    try {
      setPerfil(await api.yo())
    } catch {
      setPerfil(null)
    }
  }, [])

  // Restaura la sesión guardada al abrir el admin (F5 o URL directa).
  useEffect(() => {
    refrescarPerfil().finally(() => setLoading(false))
  }, [refrescarPerfil])

  // Si cualquier llamada responde "sesión caducada" (desactivado, contraseña
  // cambiada, 6 h sin uso…), se vuelve al login en vez de fallar a medias.
  useEffect(() => {
    const onCaducada = () => {
      setPerfil((p) => {
        if (p) toast.error('Tu sesión caducó. Vuelve a entrar.')
        return null
      })
    }
    window.addEventListener(api.EVENTO_SESION_CADUCADA, onCaducada)
    return () => window.removeEventListener(api.EVENTO_SESION_CADUCADA, onCaducada)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setPerfil(await api.login(email.trim(), password))
      return { error: null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'No se pudo iniciar sesión. Inténtalo de nuevo.' }
    }
  }, [])

  const signOut = useCallback(async () => {
    await api.logout()
    setPerfil(null)
  }, [])

  const valor = useMemo<AuthState>(
    () => ({ perfil, loading, esAdmin: perfil?.rol === 'admin', signIn, signOut, refrescarPerfil }),
    [perfil, loading, signIn, signOut, refrescarPerfil],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth tiene que usarse dentro de <AuthProvider>')
  return ctx
}
