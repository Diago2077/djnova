import { Inbox, Mail, MessageCircle, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { Contratacion } from '@/types'
import { useAuth } from '../auth'
import * as api from '../lib/api'
import { ESTADOS_CONTRATACION as ESTADOS } from '../lib/api'
import { cn } from '../lib/cn'
import { fechaHora } from '../lib/formato'
import { Badge, type TonoBadge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Cargando, ErrorBox, Vacio } from '../ui/estado'
import { Select } from '../ui/field'

const TONO: Record<string, TonoBadge> = {
  Nuevo: 'primary',
  Contactado: 'warning',
  Negociando: 'warning',
  Cerrado: 'success',
  Descartado: 'neutral',
}

function enlaceContacto(c: string) {
  if (c.includes('@')) return { href: `mailto:${c}`, icono: Mail }
  const n = c.replace(/\D/g, '')
  return n.length >= 8 ? { href: `https://wa.me/${n}`, icono: MessageCircle } : null
}

export default function Contrataciones() {
  const { puedeEditar } = useAuth()
  const [items, setItems] = useState<Contratacion[] | null>(null)
  const [filtro, setFiltro] = useState('Todos')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const cargar = useCallback(async () => {
    setError(null)
    setCargando(true)
    try {
      setItems(await api.listarContrataciones())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las solicitudes.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Igual que Pedidos ON: cada minuto se pregunta la revisión de «contrataciones»
  // (sin leer la hoja) y solo si cambió se vuelve a cargar la lista.
  const revision = useRef<number | null>(null)
  useEffect(() => {
    const id = window.setInterval(async () => {
      if (document.hidden) return
      try {
        const rev = (await api.revisiones()).contrataciones ?? 0
        if (revision.current !== null && rev !== revision.current) cargar()
        revision.current = rev
      } catch {
        /* sin conexión: se reintenta en el siguiente minuto */
      }
    }, 60_000)
    return () => window.clearInterval(id)
  }, [cargar])

  async function cambiar(id: string, estado: string) {
    setItems((list) => list?.map((b) => (b.id === id ? { ...b, estado } : b)) ?? null)
    try {
      await api.cambiarEstadoContratacion(id, estado)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo actualizar.')
      cargar()
    }
  }

  const estadoDe = (b: Contratacion) => b.estado || 'Nuevo'
  const visibles = (items ?? []).filter((b) => filtro === 'Todos' || estadoDe(b) === filtro)
  const contar = (e: string) => (e === 'Todos' ? items?.length ?? 0 : (items ?? []).filter((b) => estadoDe(b) === e).length)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Contrataciones</h1>
          <p className="text-sm text-muted-foreground">Solicitudes recibidas desde el formulario de la web.</p>
        </div>
        <Button variant="outline" onClick={cargar} disabled={cargando}>
          <RefreshCw className={cn(cargando && 'animate-spin')} /> Actualizar
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {['Todos', ...ESTADOS].map((e) => (
          <button
            key={e}
            onClick={() => setFiltro(e)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filtro === e ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {e} <span className="tabular ml-1 opacity-70">{contar(e)}</span>
          </button>
        ))}
      </div>

      {error && <ErrorBox mensaje={error} />}
      {!items ? (
        !error && <Cargando />
      ) : visibles.length === 0 ? (
        <Card>
          <Vacio
            icono={Inbox}
            titulo={filtro === 'Todos' ? 'Todavía no hay solicitudes' : `Nada en "${filtro}"`}
            descripcion="Cuando alguien complete el formulario de contratación aparecerá aquí."
          />
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visibles.map((b) => {
            const link = enlaceContacto(b.contacto)
            const estado = estadoDe(b)
            return (
              <Card key={b.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-sm font-semibold text-foreground">{b.nombre || 'Sin nombre'}</h2>
                      <Badge tono={TONO[estado] ?? 'neutral'}>{estado}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">Recibido {fechaHora(b.recibido)}</p>
                  </div>
                  <Select className="h-8 w-36 text-xs" value={estado} onChange={(e) => cambiar(b.id, e.target.value)} disabled={!puedeEditar}>
                    {ESTADOS.map((e) => (
                      <option key={e}>{e}</option>
                    ))}
                  </Select>
                </div>

                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Contacto</dt>
                  <dd>
                    {link ? (
                      <a href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        <link.icono className="size-3.5" /> {b.contacto}
                      </a>
                    ) : (
                      b.contacto
                    )}
                  </dd>
                  {b.fechaEvento && (
                    <>
                      <dt className="text-muted-foreground">Fecha</dt>
                      <dd className="tabular">{b.fechaEvento}</dd>
                    </>
                  )}
                  {b.ciudad && (
                    <>
                      <dt className="text-muted-foreground">Ciudad</dt>
                      <dd>{b.ciudad}</dd>
                    </>
                  )}
                  {b.evento && (
                    <>
                      <dt className="text-muted-foreground">Evento</dt>
                      <dd>{b.evento}</dd>
                    </>
                  )}
                </dl>
                {b.mensaje && <p className="mt-3 whitespace-pre-wrap rounded-md bg-muted px-3 py-2 text-sm text-foreground">{b.mensaje}</p>}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
