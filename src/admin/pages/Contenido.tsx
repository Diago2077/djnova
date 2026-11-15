import { ChevronDown, ExternalLink, Info, Loader2, RotateCcw, Save } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Navigate, useParams } from 'react-router-dom'
import type { Ajustes } from '@/types'
import { useAuth } from '../auth'
import { useContenido } from '../contenido'
import { Campo, EditorLista } from '../fields'
import { cn } from '../lib/cn'
import { BLOQUES, PANELES, type GuiaDef, type Panel } from '../schema'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardBody, CardHeader } from '../ui/card'
import { Cargando, ErrorBox } from '../ui/estado'
import { Select } from '../ui/field'
import { useNavigate } from 'react-router-dom'

type Valor = string | number | boolean

function Guia({ guia }: { guia: GuiaDef }) {
  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
      <p className="flex items-center gap-2 font-medium text-foreground">
        <Info className="size-4 shrink-0 text-primary" /> {guia.titulo}
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-9 text-muted-foreground">
        {guia.pasos.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
      {guia.enlace && (
        <a
          href={guia.enlace.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 pl-9 text-sm font-medium text-primary hover:underline"
        >
          {guia.enlace.texto} <ExternalLink className="size-3.5" />
        </a>
      )}
    </div>
  )
}

function EnlacePanel({ p }: { p: Panel }) {
  return (
    <NavLink
      to={`/admin/contenido/${p.id}`}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors [&_svg]:size-4',
          isActive ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )
      }
    >
      <p.icono />
      {p.titulo}
    </NavLink>
  )
}

export default function Contenido() {
  const { panel: panelId } = useParams()
  const navigate = useNavigate()
  const { puedeEditar } = useAuth()
  const { cfg, error, cambios, guardando, setAjuste, setLista, guardar, descartar } = useContenido()

  const panel = PANELES.find((p) => p.id === panelId)
  // «Configuración» va plegada, salvo que estés dentro de uno de sus paneles.
  const [confAbierta, setConfAbierta] = useState(false)
  if (!panelId) return <Navigate to={`/admin/contenido/${PANELES[0].id}`} replace />
  if (!panel) return <Navigate to="/admin/contenido" replace />

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Secciones del contenido */}
      <aside>
        <Select className="lg:hidden" value={panel.id} onChange={(e) => navigate(`/admin/contenido/${e.target.value}`)}>
          {BLOQUES.map((b) => (
            <optgroup key={b.id} label={b.titulo}>
              {PANELES.filter((p) => p.bloque === b.id).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.titulo}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
        <nav className="sticky top-20 hidden flex-col gap-4 lg:flex">
          {BLOQUES.map((b) => {
            const paneles = PANELES.filter((p) => p.bloque === b.id)
            const plegable = b.id === 'config'
            const abierto = !plegable || confAbierta || panel.bloque === 'config'
            return (
              <div key={b.id} className="flex flex-col gap-0.5">
                {plegable ? (
                  <button
                    type="button"
                    onClick={() => setConfAbierta((v) => !(v || panel.bloque === 'config'))}
                    className="mb-1 flex items-center justify-between px-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    aria-expanded={abierto}
                  >
                    {b.titulo}
                    <ChevronDown className={cn('size-3.5 transition-transform', !abierto && '-rotate-90')} />
                  </button>
                ) : (
                  <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{b.titulo}</p>
                )}
                {abierto && paneles.map((p) => <EnlacePanel key={p.id} p={p} />)}
              </div>
            )
          })}
        </nav>
      </aside>

      <section className="min-w-0">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{panel.titulo}</h1>
            {panel.descripcion && <p className="text-sm text-muted-foreground">{panel.descripcion}</p>}
          </div>
          {puedeEditar ? (
          <div className="flex gap-2">
            {cambios && (
              <Button variant="outline" onClick={descartar} disabled={guardando}>
                <RotateCcw /> Descartar
              </Button>
            )}
            <Button onClick={guardar} disabled={!cambios || guardando}>
              {guardando ? <Loader2 className="animate-spin" /> : <Save />}
              {guardando ? 'Guardando…' : cambios ? 'Guardar y publicar' : 'Sin cambios'}
            </Button>
          </div>
          ) : (
            <Badge tono="warning">Solo lectura</Badge>
          )}
        </div>

        {error ? (
          <ErrorBox mensaje={error} />
        ) : !cfg ? (
          <Cargando texto="Cargando contenido…" />
        ) : (
          // Rol consulta: los controles quedan deshabilitados (fieldset disabled).
          <fieldset disabled={!puedeEditar} className="min-w-0 space-y-5">
            {panel.grupos?.map((g) => (
              <Card key={g.grupo}>
                {g.titulo && <CardHeader title={g.titulo} />}
                <CardBody className="grid gap-4">
                  {g.guia?.cuando(cfg.ajustes[g.grupo] as unknown as Record<string, Valor>) && <Guia guia={g.guia} />}
                  {g.fields.map((f) => (
                    <Campo
                      key={f.key}
                      def={f}
                      value={(cfg.ajustes[g.grupo as keyof Ajustes] as unknown as Record<string, Valor>)[f.key]}
                      onChange={(v) => setAjuste(g.grupo, f.key, v)}
                    />
                  ))}
                </CardBody>
              </Card>
            ))}
            {panel.listas?.map((l) => (
              <Card key={l.key}>
                <EditorLista def={l} items={cfg[l.key] as unknown as Record<string, Valor>[]} onChange={(items) => setLista(l.key, items)} />
              </Card>
            ))}
          </fieldset>
        )}
      </section>
    </div>
  )
}
