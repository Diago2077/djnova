import { Loader2, RotateCcw, Save } from 'lucide-react'
import { NavLink, Navigate, useParams } from 'react-router-dom'
import type { Ajustes } from '@/types'
import { useAuth } from '../auth'
import { useContenido } from '../contenido'
import { Campo, EditorLista } from '../fields'
import { cn } from '../lib/cn'
import { PANELES } from '../schema'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardBody, CardHeader } from '../ui/card'
import { Cargando, ErrorBox } from '../ui/estado'
import { Select } from '../ui/field'
import { useNavigate } from 'react-router-dom'

type Valor = string | number | boolean

export default function Contenido() {
  const { panel: panelId } = useParams()
  const navigate = useNavigate()
  const { puedeEditar } = useAuth()
  const { cfg, error, cambios, guardando, setAjuste, setLista, guardar, descartar } = useContenido()

  const panel = PANELES.find((p) => p.id === panelId)
  if (!panelId) return <Navigate to={`/admin/contenido/${PANELES[0].id}`} replace />
  if (!panel) return <Navigate to="/admin/contenido" replace />

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Secciones del contenido */}
      <aside>
        <Select className="lg:hidden" value={panel.id} onChange={(e) => navigate(`/admin/contenido/${e.target.value}`)}>
          {PANELES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.titulo}
            </option>
          ))}
        </Select>
        <nav className="sticky top-20 hidden flex-col gap-0.5 lg:flex">
          {PANELES.map((p) => (
            <NavLink
              key={p.id}
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
          ))}
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
