import { KeyRound, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import * as api from '../lib/api'
import { LARGO_MINIMO_PASSWORD, ROL_LABEL, type Perfil, type Rol } from '../lib/api'
import { fechaHora } from '../lib/formato'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ErrorBox } from '../ui/estado'
import { Field, Input, Select } from '../ui/field'
import { Modal } from '../ui/modal'

// Adaptado de contable/src/components/usuarios/UsuarioModales.tsx.
// Aquí solo hay un "estudio" (la web), así que el admin siempre elige el rol.

function mensaje(e: unknown, porDefecto: string) {
  return e instanceof Error ? e.message : porDefecto
}

function SelectorDeRol({ valor, onCambiar }: { valor: Rol; onCambiar: (rol: Rol) => void }) {
  return (
    <Field label="Rol" hint={valor === 'admin' ? 'Puede gestionar usuarios.' : 'Edita el contenido y ve las contrataciones.'}>
      <Select value={valor} onChange={(e) => onCambiar(e.target.value as Rol)}>
        <option value="editor">{ROL_LABEL.editor}</option>
        <option value="admin">{ROL_LABEL.admin}</option>
      </Select>
    </Field>
  )
}

export function NuevoUsuarioModal({ abierto, onCerrar, onCreado }: { abierto: boolean; onCerrar: () => void; onCreado: () => void }) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<Rol>('editor')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (abierto) {
      setNombre('')
      setEmail('')
      setPassword('')
      setRol('editor')
      setError(null)
    }
  }, [abierto])

  async function onGuardar() {
    if (!nombre.trim() || !email.trim() || !password) return setError('Completa todos los campos.')
    if (password.length < LARGO_MINIMO_PASSWORD) return setError(`La contraseña necesita al menos ${LARGO_MINIMO_PASSWORD} caracteres.`)
    setGuardando(true)
    setError(null)
    try {
      await api.crearUsuario({ nombre: nombre.trim(), email: email.trim(), password, rol })
      toast.success('Usuario creado')
      onCreado()
    } catch (e) {
      setError(mensaje(e, 'Error al crear el usuario.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Nuevo usuario"
      onCerrar={onCerrar}
      footer={
        <>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={onGuardar} disabled={guardando}>
            {guardando ? 'Creando…' : 'Crear usuario'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre *">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" autoFocus />
        </Field>
        <Field label="Email *" hint="Es con el que inicia sesión. Cada cuenta necesita uno distinto.">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Contraseña *" hint={`Mínimo ${LARGO_MINIMO_PASSWORD} caracteres. Compártela por un canal seguro.`}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <SelectorDeRol valor={rol} onCambiar={setRol} />
        {error && <ErrorBox mensaje={error} />}
      </div>
    </Modal>
  )
}

export function UsuarioDetalleModal({
  usuario,
  esYo,
  onCerrar,
  onEditar,
  onCambiarPassword,
  onEliminar,
  onToggleActivo,
}: {
  usuario: Perfil | null
  esYo: boolean
  onCerrar: () => void
  onEditar: () => void
  onCambiarPassword: () => void
  onEliminar: () => void
  onToggleActivo: () => void
}) {
  if (!usuario) return null

  return (
    <Modal
      abierto={usuario !== null}
      titulo="Detalle de usuario"
      onCerrar={onCerrar}
      ancho="max-w-md"
      footer={
        <>
          {!esYo && (
            <Button variant="outline" onClick={onEliminar}>
              <Trash2 className="text-destructive" /> Eliminar
            </Button>
          )}
          {!esYo && (
            <Button variant="outline" onClick={onCambiarPassword}>
              <KeyRound /> Contraseña
            </Button>
          )}
          <Button onClick={onEditar}>
            <Pencil /> Editar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {usuario.nombre} {esYo && <span className="text-xs font-normal text-muted-foreground">(tú)</span>}
            </h2>
            <p className="text-sm text-muted-foreground">{usuario.email}</p>
          </div>
          <button onClick={esYo ? undefined : onToggleActivo} disabled={esYo} className={esYo ? 'cursor-default' : ''}>
            <Badge tono={usuario.activo ? 'success' : 'neutral'}>{usuario.activo ? 'Activo' : 'Inactivo'}</Badge>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Rol</p>
            <p className="text-foreground">{ROL_LABEL[usuario.rol]}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Alta</p>
            <p className="text-foreground">{fechaHora(usuario.creado)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Último acceso</p>
            <p className="text-foreground">{fechaHora(usuario.ultimoAcceso) || 'Nunca'}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {esYo
            ? 'Tu propia contraseña se cambia con la llave de arriba a la derecha.'
            : `Toca el estado para ${usuario.activo ? 'desactivarlo' : 'activarlo'}.`}
        </p>
      </div>
    </Modal>
  )
}

export function EditarUsuarioModal({ usuario, onCerrar, onGuardado }: { usuario: Perfil | null; onCerrar: () => void; onGuardado: () => void }) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState<Rol>('editor')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!usuario) return
    setNombre(usuario.nombre)
    setEmail(usuario.email)
    setRol(usuario.rol)
    setError(null)
  }, [usuario])

  async function onGuardar() {
    if (!usuario) return
    if (!nombre.trim() || !email.trim()) return setError('Completa todos los campos.')
    setGuardando(true)
    setError(null)
    try {
      await api.editarUsuario({ id: usuario.id, nombre: nombre.trim(), email: email.trim(), rol })
      toast.success('Usuario actualizado')
      onGuardado()
    } catch (e) {
      setError(mensaje(e, 'Error al guardar el usuario.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={usuario !== null}
      titulo={`Editar usuario — ${usuario?.nombre ?? ''}`}
      onCerrar={onCerrar}
      footer={
        <>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={onGuardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre *">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
        </Field>
        <Field label="Email *" hint="Es el email con el que inicia sesión: cambiarlo cambia su login.">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <SelectorDeRol valor={rol} onCambiar={setRol} />
        {error && <ErrorBox mensaje={error} />}
      </div>
    </Modal>
  )
}

export function CambiarPasswordModal({ usuario, onCerrar }: { usuario: Perfil | null; onCerrar: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    setPassword('')
    setError(null)
  }, [usuario])

  async function onGuardar() {
    if (!usuario) return
    if (password.length < LARGO_MINIMO_PASSWORD) return setError(`Mínimo ${LARGO_MINIMO_PASSWORD} caracteres.`)
    setGuardando(true)
    try {
      await api.passwordDeUsuario(usuario.id, password)
      toast.success('Contraseña actualizada. Sus sesiones abiertas se cerraron.')
      onCerrar()
    } catch (e) {
      setError(mensaje(e, 'Error al cambiar la contraseña.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={usuario !== null}
      titulo={`Cambiar contraseña — ${usuario?.nombre ?? ''}`}
      onCerrar={onCerrar}
      ancho="max-w-sm"
      footer={
        <>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={onGuardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Cambiar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nueva contraseña" hint={`Mínimo ${LARGO_MINIMO_PASSWORD} caracteres`}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </Field>
        {error && <ErrorBox mensaje={error} />}
      </div>
    </Modal>
  )
}
