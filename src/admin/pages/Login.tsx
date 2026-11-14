import { Loader2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEMO } from '@/lib/api'
import { useAuth } from '../auth'
import { Button } from '../ui/button'
import { ErrorBox } from '../ui/estado'
import { Field, Input } from '../ui/field'

// Adaptado de contable/src/pages/Login.tsx

export default function Login() {
  const { perfil, loading, signIn } = useAuth()
  const navigate = useNavigate()

  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    document.title = 'djnova · Admin'
    if (!loading && perfil) navigate('/admin', { replace: true })
  }, [perfil, loading, navigate])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (enviando) return
    setError(null)
    setEnviando(true)
    const { error: err } = await signIn(usuario, password)
    setEnviando(false)
    if (err) setError(err)
    else navigate('/admin', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <img src="/logo.svg" alt="" className="mx-auto mb-3 size-12 rounded-xl" />
          <h1 className="text-lg font-semibold text-foreground">djnova</h1>
          <p className="mt-1 text-sm text-muted-foreground">Panel de administración de la web</p>
        </div>

        {DEMO && (
          <div className="mb-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-xs text-foreground">
            <strong>Modo demo</strong>: falta <code>VITE_API_URL</code>. Los datos quedan solo en este navegador. El primer
            usuario que entre se crea como administrador.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-xs">
          <Field label="Usuario">
            <Input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value.toUpperCase())}
              placeholder="ADMIN"
              autoComplete="username"
              autoCapitalize="characters"
              required
              autoFocus
            />
          </Field>

          <Field label="Contraseña">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </Field>

          {error && <ErrorBox mensaje={error} />}

          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? (
              <>
                <Loader2 className="animate-spin" /> Ingresando…
              </>
            ) : (
              'Ingresar'
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">Las cuentas las crea el administrador.</p>
      </div>
    </div>
  )
}
