import { ArrowDown, ArrowUp, ChevronRight, Loader2, Plus, Trash2, Upload, X } from 'lucide-react'
import { useId, useState } from 'react'
import { LIST_TEMPLATES } from '@/defaults'
import { cn } from './lib/cn'
import { subirArchivo } from './lib/api'
import type { FieldDef, ListaDef } from './schema'
import { Button } from './ui/button'
import { Field, Input, Select, Textarea } from './ui/field'
import { ConfirmModal } from './ui/modal'

type Valor = string | number | boolean

export function Interruptor({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          checked ? 'bg-primary' : 'bg-input',
        )}
      >
        <span className={cn('absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-xs transition-transform', checked && 'translate-x-4')} />
      </button>
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  )
}

export function Campo({ def, value, onChange }: { def: FieldDef; value: Valor; onChange: (v: Valor) => void }) {
  const type = def.type ?? 'text'
  const id = useId()

  if (type === 'bool') return <Interruptor checked={!!value} onChange={onChange} label={def.label} hint={def.help} />

  let control: React.ReactNode
  switch (type) {
    case 'textarea':
      control = <Textarea id={id} rows={5} value={String(value)} onChange={(e) => onChange(e.target.value)} />
      break
    case 'number':
      control = <Input id={id} type="number" className="tabular max-w-40" value={Number(value)} onChange={(e) => onChange(Number(e.target.value))} />
      break
    case 'date':
      control = <Input id={id} type="date" className="max-w-48" value={String(value)} onChange={(e) => onChange(e.target.value)} />
      break
    case 'color':
      control = (
        <div className="flex max-w-56 gap-2">
          <input
            type="color"
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            aria-label={def.label}
            className="h-9.5 w-11 shrink-0 cursor-pointer rounded-md border border-input bg-card p-1"
          />
          <Input id={id} className="font-mono" value={String(value)} onChange={(e) => onChange(e.target.value)} />
        </div>
      )
      break
    case 'select': {
      const opts = def.options ?? []
      const v = String(value)
      control = (
        <Select id={id} value={v} onChange={(e) => onChange(e.target.value)}>
          {!opts.includes(v) && <option value={v}>{v || '—'}</option>}
          {opts.map((o) => (
            <option key={o} value={o}>
              {o || '(vacío)'}
            </option>
          ))}
        </Select>
      )
      break
    }
    case 'readonly':
      control = <p className="font-mono text-sm text-muted-foreground">{String(value)}</p>
      break
    case 'image':
    case 'file':
      control = <CampoArchivo def={def} value={String(value)} onChange={onChange} />
      break
    default:
      control = <Input id={id} type={type === 'url' ? 'url' : 'text'} value={String(value)} onChange={(e) => onChange(e.target.value)} />
  }

  return (
    <Field label={def.label} hint={def.help}>
      {control}
    </Field>
  )
}

function CampoArchivo({ def, value, onChange }: { def: FieldDef; value: string; onChange: (v: Valor) => void }) {
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const esImagen = def.type === 'image'

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setSubiendo(true)
    setError('')
    try {
      onChange(await subirArchivo(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir.')
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="space-y-2">
      {esImagen && value && (
        <img
          src={value}
          alt=""
          className="max-h-36 w-auto max-w-full rounded-md border border-border bg-[repeating-conic-gradient(#8882_0_25%,transparent_0_50%)] bg-[length:16px_16px]"
        />
      )}
      <div className="flex gap-2">
        <Input type="url" placeholder="https://…" value={value} onChange={(e) => onChange(e.target.value)} />
        <label
          className={cn(
            'inline-flex h-9.5 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-accent [&_svg]:size-4',
            subiendo && 'pointer-events-none opacity-60',
          )}
        >
          {subiendo ? <Loader2 className="animate-spin" /> : <Upload />}
          <span className="hidden sm:inline">{subiendo ? 'Subiendo…' : 'Subir'}</span>
          <input type="file" hidden accept={def.accept ?? (esImagen ? 'image/*' : undefined)} onChange={subir} disabled={subiendo} />
        </label>
        {value && (
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange('')} title="Quitar">
            <X />
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

type Fila = Record<string, Valor>

export function EditorLista({ def, items, onChange }: { def: ListaDef; items: Fila[]; onChange: (items: Fila[]) => void }) {
  const [abierta, setAbierta] = useState<number | null>(null)
  const [borrar, setBorrar] = useState<number | null>(null)
  const conOrden = items.length > 0 && 'orden' in items[0]

  function actualizar(next: Fila[]) {
    onChange(conOrden ? next.map((it, i) => ({ ...it, orden: i + 1 })) : next)
  }
  function mover(i: number, d: number) {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    actualizar(next)
    if (abierta === i) setAbierta(j)
  }
  function set(i: number, key: string, v: Valor) {
    actualizar(items.map((it, k) => (k === i ? { ...it, [key]: v } : it)))
  }
  function agregar() {
    actualizar([...items, { ...(LIST_TEMPLATES[def.key] as unknown as Fila) }])
    setAbierta(items.length)
  }

  const imagen = def.fields.find((f) => f.type === 'image')

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {def.titulo} <span className="tabular ml-1 text-xs font-normal text-muted-foreground">{items.length}</span>
          </h2>
          {def.help && <p className="mt-0.5 text-xs text-muted-foreground">{def.help}</p>}
        </div>
        {!def.fija && (
          <Button size="sm" variant="outline" onClick={agregar}>
            <Plus /> Añadir
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-muted-foreground">Sin elementos todavía.</p>
      ) : (
        <ol className="divide-y divide-border">
          {items.map((it, i) => {
            const titulo = String(it[def.resumen] || it.id || `Elemento ${i + 1}`)
            const thumb = imagen ? String(it[imagen.key] || '') : ''
            const visible = 'visible' in it ? !!it.visible : true
            const open = abierta === i
            return (
              <li key={i} className={cn(open && 'bg-accent/30')}>
                <div className="flex items-center gap-1 pr-3">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 px-5 py-2.5 text-left text-sm"
                    onClick={() => setAbierta(open ? null : i)}
                    aria-expanded={open}
                  >
                    <ChevronRight className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
                    {thumb && <img src={thumb} alt="" className="size-8 shrink-0 rounded object-cover" />}
                    {it.fecha ? <span className="tabular shrink-0 text-xs text-muted-foreground">{String(it.fecha)}</span> : null}
                    <span className={cn('truncate text-foreground', !visible && 'text-muted-foreground line-through')}>{titulo}</span>
                  </button>
                  <Button variant="ghost" size="icon" onClick={() => mover(i, -1)} disabled={i === 0} title="Subir">
                    <ArrowUp />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => mover(i, 1)} disabled={i === items.length - 1} title="Bajar">
                    <ArrowDown />
                  </Button>
                  {!def.fija && (
                    <Button variant="ghost" size="icon" onClick={() => setBorrar(i)} title="Eliminar">
                      <Trash2 className="text-destructive" />
                    </Button>
                  )}
                </div>
                {open && (
                  <div className="grid gap-4 px-5 pt-1 pb-5 sm:pl-12">
                    {def.fields.map((f) => (
                      <Campo key={f.key} def={f} value={it[f.key] ?? ''} onChange={(v) => set(i, f.key, v)} />
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}

      <ConfirmModal
        abierto={borrar !== null}
        titulo="Eliminar elemento"
        mensaje="Se quita de la lista. No se publica hasta que pulses «Guardar y publicar»."
        onCancelar={() => setBorrar(null)}
        onConfirmar={() => {
          if (borrar === null) return
          actualizar(items.filter((_, k) => k !== borrar))
          setAbierta(null)
          setBorrar(null)
        }}
      />
    </div>
  )
}
