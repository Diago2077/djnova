import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import * as api from './lib/api'
import type { Perfil } from './lib/api'

// Misma forma de contexto que contable/src/hooks/useAuth.tsx; la sesión sigue
// el modelo de Pedidos ON (usuario + contraseña validados en cada llamada).

interface AuthState {
  perfil: Perfil | null
  loading: boolean
  esAdmin: boolean
  /** admin u operador: puede guardar contenido y cambiar contrataciones. */
  puedeEditar: boolean
  signIn: (usuario: string, password: string) => Promise<{ error: string | null }>
  signOut: () => void
  refrescarPerfil: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)

  const refrescarPerfil = useCallback(async () => {
    setPerfil(await api.yo())
  }, [])

  // Restaura la sesión de esta pestaña al recargar el admin.
  useEffect(() => {
    refrescarPerfil().finally(() => setLoading(false))
  }, [refrescarPerfil])

  // Si cualquier llamada responde codigo 'SESION' (contraseña cambiada, usuario
  // desactivado o borrado), se vuelve al login en vez de fallar a medias.
  useEffect(() => {
    const onCaducada = () => {
      setPerfil((p) => {
        if (p) toast.error('Tu sesión ya no es válida. Vuelve a entrar.')
        return null
      })
    }
    window.addEventListener(api.EVENTO_SESION_CADUCADA, onCaducada)
    return () => window.removeEventListener(api.EVENTO_SESION_CADUCADA, onCaducada)
  }, [])

  const signIn = useCallback(async (usuario: string, password: string) => {
    try {
      setPerfil(await api.login(usuario.trim(), password))
      return { error: null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'No se pudo iniciar sesión. Inténtalo de nuevo.' }
    }
  }, [])

  const signOut = useCallback(() => {
    api.logout()
    setPerfil(null)
  }, [])

  const valor = useMemo<AuthState>(
    () => ({
      perfil,
      loading,
      esAdmin: perfil?.rol === 'admin',
      puedeEditar: perfil?.rol === 'admin' || perfil?.rol === 'operador',
      signIn,
      signOut,
      refrescarPerfil,
    }),
    [perfil, loading, signIn, signOut, refrescarPerfil],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth tiene que usarse dentro de <AuthProvider>')
  return ctx
}
