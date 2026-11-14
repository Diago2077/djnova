import { KeyRound, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import * as api from '../lib/api'
import { ROL_AYUDA, ROL_LABEL, type Perfil, type Rol } from '../lib/api'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ErrorBox } from '../ui/estado'
import { Field, Input, Select } from '../ui/field'
import { Modal } from '../ui/modal'

// Diseño de contable/src/components/usuarios/UsuarioModales.tsx con el modelo
// de usuarios de Pedidos ON (usuario en mayúsculas + nombre + rol + activo).

function mensaje(e: unknown, porDefecto: string) {
  return e instanceof Error ? e.message : porDefecto
}

const ROLES: Rol[] = ['admin', 'operador', 'consulta']

function SelectorDeRol({ valor, onCambiar, disabled }: { valor: Rol; onCambiar: (rol: Rol) => void; disabled?: boolean }) {
  return (
    <Field label="Rol" hint={ROL_AYUDA[valor]}>
      <Select value={valor} onChange={(e) => onCambiar(e.target.value as Rol)} disabled={disabled}>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROL_LABEL[r]}
          </option>
        ))}
      </Select>
    </Field>
  )
}

export function NuevoUsuarioModal({ abierto, onCerrar, onCreado }: { abierto: boolean; onCerrar: () => void; onCreado: () => void }) {
  const [usuario, setUsuario] = useState('')
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<Rol>('operador')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (abierto) {
      setUsuario('')
      setNombre('')
      setPassword('')
      setRol('operador')
      setError(null)
    }
  }, [abierto])

  async function onGuardar() {
    if (!usuario.trim() || !password) return setError('El usuario y la contraseña son obligatorios.')
    setGuardando(true)
    setError(null)
    try {
      await api.crearUsuario({ usuario: usuario.trim(), nombre: nombre.trim(), password, rol, activo: true })
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
        <Field label="Usuario *" hint="Con el que inicia sesión. Se guarda en mayúsculas.">
          <Input value={usuario} onChange={(e) => setUsuario(e.target.value.toUpperCase())} autoComplete="off" autoFocus />
        </Field>
        <Field label="Nombre">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Contraseña inicial *" hint="Compártela por un canal seguro; la puede cambiar al entrar.">
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
              {usuario.usuario} {esYo && <span className="text-xs font-normal text-muted-foreground">(tú)</span>}
            </h2>
            <p className="text-sm text-muted-foreground">{usuario.nombre || 'Sin nombre'}</p>
          </div>
          <button onClick={esYo ? undefined : onToggleActivo} disabled={esYo} className={esYo ? 'cursor-default' : ''}>
            <Badge tono={usuario.activo ? 'success' : 'neutral'}>{usuario.activo ? 'Activo' : 'Inactivo'}</Badge>
          </button>
        </div>

        <div className="text-sm">
          <p className="text-xs text-muted-foreground">Rol</p>
          <p className="text-foreground">{ROL_LABEL[usuario.rol]}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{ROL_AYUDA[usuario.rol]}</p>
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

export function EditarUsuarioModal({
  usuario,
  esYo,
  onCerrar,
  onGuardado,
}: {
  usuario: Perfil | null
  esYo: boolean
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [nuevoUsuario, setNuevoUsuario] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<Rol>('operador')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!usuario) return
    setNuevoUsuario(usuario.usuario)
    setNombre(usuario.nombre)
    setRol(usuario.rol)
    setError(null)
  }, [usuario])

  async function onGuardar() {
    if (!usuario) return
    if (!nuevoUsuario.trim()) return setError('El usuario es obligatorio.')
    setGuardando(true)
    setError(null)
    try {
      await api.actualizarUsuario(usuario.usuario, { usuario: nuevoUsuario.trim(), nombre: nombre.trim(), rol, activo: usuario.activo })
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
      titulo={`Editar usuario — ${usuario?.usuario ?? ''}`}
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
        <Field
          label="Usuario *"
          hint={esYo ? 'No puedes renombrar tu propio usuario mientras lo usas.' : 'Es con el que inicia sesión: cambiarlo cambia su login.'}
        >
          <Input value={nuevoUsuario} onChange={(e) => setNuevoUsuario(e.target.value.toUpperCase())} disabled={esYo} autoFocus />
        </Field>
        <Field label="Nombre">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <SelectorDeRol valor={rol} onCambiar={setRol} disabled={esYo} />
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
    if (!password) return setError('Escribe la nueva contraseña.')
    setGuardando(true)
    try {
      await api.actualizarUsuario(usuario.usuario, { ...usuario, password })
      toast.success('Contraseña actualizada')
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
      titulo={`Cambiar contraseña — ${usuario?.usuario ?? ''}`}
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
        <Field label="Nueva contraseña">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
        </Field>
        {error && <ErrorBox mensaje={error} />}
      </div>
    </Modal>
  )
}
