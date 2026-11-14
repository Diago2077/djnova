import { ExternalLink, KeyRound, LogOut, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { DEMO } from '@/lib/api'
import { useAuth } from '../auth'
import { CambiarMiPasswordModal } from '../components/CambiarMiPasswordModal'
import { ContenidoProvider, useContenido } from '../contenido'
import { cn } from '../lib/cn'
import { aplicarModo, modoActual, type Modo } from '../lib/tema'
import { ROL_LABEL } from '../lib/api'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Cargando } from '../ui/estado'

// Adaptado de contable/src/components/layout/AppLayout.tsx

export default function AdminLayout() {
  const { perfil, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !perfil) navigate('/admin/login', { replace: true })
  }, [perfil, loading, navigate])

  if (loading) return <Cargando className="min-h-screen" texto="Cargando tu cuenta…" />
  if (!perfil) return null

  return (
    <ContenidoProvider>
      <Shell />
    </ContenidoProvider>
  )
}

function Shell() {
  const { perfil, esAdmin, signOut } = useAuth()
  const { cambios } = useContenido()
  const [modalPassword, setModalPassword] = useState(false)
  const [modo, setModo] = useState<Modo>(modoActual)

  const NAV = [
    { to: '/admin/contenido', label: 'Contenido' },
    { to: '/admin/contrataciones', label: 'Contrataciones' },
    ...(esAdmin ? [{ to: '/admin/usuarios', label: 'Usuarios' }] : []),
  ]

  function alternarModo() {
    const m = modo === 'oscuro' ? 'claro' : 'oscuro'
    aplicarModo(m)
    setModo(m)
  }

  async function salir() {
    if (cambios && !confirm('Tienes cambios sin guardar. ¿Salir igualmente?')) return
    signOut()
  }

  const link = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-md px-3 py-1.5 text-sm transition-colors',
      isActive ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
    )

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/admin" className="flex min-w-0 items-center gap-2">
            <img src="/logo.svg" alt="" className="size-7 shrink-0 rounded-md" />
            <span className="truncate text-sm font-semibold text-foreground">djnova</span>
            {DEMO && <Badge tono="warning">demo</Badge>}
          </Link>

          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={link}>
                {item.label}
                {item.to === '/admin/contenido' && cambios && (
                  <span className="ml-1.5 inline-block size-1.5 rounded-full bg-warning align-middle" title="Cambios sin guardar" />
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground md:flex"
            >
              <ExternalLink className="size-3.5" /> Ver web
            </a>
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-foreground">{perfil?.nombre || perfil?.usuario}</p>
              <p className="text-[11px] text-muted-foreground">
                {perfil?.usuario} · {perfil ? ROL_LABEL[perfil.rol] : ''}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={alternarModo} title={modo === 'oscuro' ? 'Modo claro' : 'Modo oscuro'}>
              {modo === 'oscuro' ? <Sun /> : <Moon />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setModalPassword(true)} title="Cambiar mi contraseña">
              <KeyRound />
            </Button>
            <Button variant="ghost" size="icon" onClick={salir} title="Cerrar sesión">
              <LogOut />
            </Button>
          </div>
        </div>

        {/* Navegación en móvil: la fila de arriba se queda sin lugar */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-1.5 sm:hidden">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => cn(link({ isActive }), 'shrink-0')}>
              {item.label}
            </NavLink>
          ))}
          <a href="/" target="_blank" rel="noreferrer" className="shrink-0 rounded-md px-3 py-1.5 text-sm text-muted-foreground">
            Ver web
          </a>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <CambiarMiPasswordModal abierto={modalPassword} onCerrar={() => setModalPassword(false)} />
    </div>
  )
}
