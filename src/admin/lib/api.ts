import { ApiError, DEMO, LS, post, readLS, writeLS } from '@/lib/api'
import { toTablas } from '@/lib/tables'
import type { Contratacion, SiteConfig } from '@/types'

// Cliente del backend con la estructura de Pedidos ON: no hay token, cada
// llamada lleva { usuario, password } y el Apps Script las valida (con caché
// de 5 min). Una sesión caída vuelve con codigo 'SESION'.

export type Rol = 'admin' | 'operador' | 'consulta'

export interface Perfil {
  usuario: string
  nombre: string
  rol: Rol
  activo: boolean
}

export const ROL_LABEL: Record<Rol, string> = { admin: 'Administrador', operador: 'Operador', consulta: 'Consulta' }
export const ROL_AYUDA: Record<Rol, string> = {
  admin: 'Control total, incluida la gestión de usuarios.',
  operador: 'Edita el contenido de la web y gestiona las contrataciones.',
  consulta: 'Solo lectura: ve el contenido y las contrataciones.',
}
export const ESTADOS_CONTRATACION = ['Nuevo', 'Contactado', 'Negociando', 'Cerrado', 'Descartado'] as const

/** Se dispara cuando el servidor dice que la sesión ya no vale. */
export const EVENTO_SESION_CADUCADA = 'djnova:sesion-caducada'

interface Sesion {
  usuario: string
  password: string
}

// sessionStorage: las credenciales se olvidan al cerrar la pestaña.
function leerSesion(): Sesion | null {
  try {
    const raw = sessionStorage.getItem(LS.sesion)
    return raw ? (JSON.parse(raw) as Sesion) : null
  } catch {
    return null
  }
}
function guardarSesion(s: Sesion | null) {
  try {
    if (s) sessionStorage.setItem(LS.sesion, JSON.stringify(s))
    else sessionStorage.removeItem(LS.sesion)
  } catch {
    /* noop */
  }
}
export function haySesion() {
  return !!leerSesion()
}

async function llamar<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const s = leerSesion()
  try {
    if (DEMO) return demo(action, { ...payload, ...s }) as T
    return await post<T>({ action, ...s, ...payload })
  } catch (e) {
    if (e instanceof ApiError && e.codigo === 'SESION') {
      guardarSesion(null)
      window.dispatchEvent(new Event(EVENTO_SESION_CADUCADA))
    }
    throw e
  }
}

// ---------------------------------------------------------------- Sesión

export async function login(usuario: string, password: string): Promise<Perfil> {
  const r = await llamar<{ usuario: string; nombre: string; rol: Rol }>('login', { usuario, password })
  guardarSesion({ usuario: r.usuario, password })
  return { usuario: r.usuario, nombre: r.nombre, rol: r.rol, activo: true }
}

/** Vuelve a validar las credenciales guardadas (al recargar el admin). */
export async function yo(): Promise<Perfil | null> {
  const s = leerSesion()
  if (!s) return null
  try {
    return await login(s.usuario, s.password)
  } catch {
    guardarSesion(null)
    return null
  }
}

export function logout() {
  guardarSesion(null)
}

export async function cambiarMiPassword(nuevaPassword: string) {
  await llamar('cambiarMiPassword', { nuevaPassword })
  const s = leerSesion()
  if (s) guardarSesion({ ...s, password: nuevaPassword })
}

export async function revisiones(): Promise<Record<string, number>> {
  return (await llamar<{ revisiones: Record<string, number> }>('getRevisions')).revisiones
}

// ---------------------------------------------------------------- Contenido de la web

export async function guardarConfig(cfg: SiteConfig) {
  const tablas = toTablas(cfg)
  await llamar('guardarSitio', { tablas })
  writeLS(DEMO ? LS.demoConfig : LS.cache, tablas)
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

export const MAX_ARCHIVO_MB = 20

/** Sube un archivo a la carpeta de Drive de la app y devuelve su URL pública. */
export async function subirArchivo(file: File): Promise<string> {
  if (DEMO) return URL.createObjectURL(file) // solo se ve en esta sesión
  if (file.size > MAX_ARCHIVO_MB * 1024 * 1024) {
    throw new ApiError(`El archivo supera los ${MAX_ARCHIVO_MB} MB. Para videos usa YouTube o un enlace externo.`)
  }
  const base64 = await fileToBase64(file)
  const { url } = await llamar<{ url: string }>('subirArchivo', {
    nombre: file.name,
    mime: file.type || 'application/octet-stream',
    base64,
  })
  return url
}

// ---------------------------------------------------------------- Contrataciones

export async function listarContrataciones(): Promise<Contratacion[]> {
  return (await llamar<{ contrataciones: Contratacion[] }>('listContrataciones')).contrataciones
}

export async function cambiarEstadoContratacion(id: string, estado: string) {
  await llamar('cambiarEstadoContratacion', { id, estado })
}

// ---------------------------------------------------------------- Usuarios (solo admin)

export async function listarUsuarios(): Promise<Perfil[]> {
  return (await llamar<{ usuarios: Perfil[] }>('listUsuarios')).usuarios
}

export async function crearUsuario(p: { usuario: string; nombre: string; password: string; rol: Rol; activo: boolean }) {
  await llamar('createUsuario', { nuevoUsuario: p.usuario, nuevaPassword: p.password, nombre: p.nombre, rol: p.rol, activo: p.activo })
}

/** Edita un usuario. `password` vacío = no se cambia. */
export async function actualizarUsuario(
  target: string,
  p: { usuario: string; nombre: string; rol: Rol; activo: boolean; password?: string },
) {
  await llamar('updateUsuario', {
    targetUsuario: target,
    nuevoUsuario: p.usuario,
    nombre: p.nombre,
    rol: p.rol,
    activo: p.activo,
    nuevaPassword: p.password ?? '',
  })
}

export async function eliminarUsuario(usuario: string) {
  await llamar('deleteUsuario', { targetUsuario: usuario })
}

// ---------------------------------------------------------------- Modo demo
// Simula el Apps Script en localStorage para probar el admin sin Google Sheets.
// Igual que en la hoja real, las contraseñas quedan en claro: SOLO para pruebas.

type UsuarioDemo = Perfil & { password: string }

function demo(action: string, p: Record<string, unknown>): unknown {
  const users = readLS<UsuarioDemo[]>(LS.demoUsers) ?? []
  const guardar = () => writeLS(LS.demoUsers, users)
  const publico = ({ password: _pw, ...u }: UsuarioDemo): Perfil => u
  const porNombre = (n: unknown) => users.find((u) => u.usuario === String(n ?? '').trim().toUpperCase())
  const auth = (roles?: Rol[]) => {
    const u = porNombre(p.usuario)
    if (!u || u.password !== p.password || !u.activo) throw new ApiError('Sesión no válida. Vuelve a iniciar sesión.', 'SESION')
    if (roles && !roles.includes(u.rol)) throw new ApiError('No autorizado para esta acción.')
    return u
  }
  const adminsActivos = () => users.filter((u) => u.rol === 'admin' && u.activo).length

  switch (action) {
    case 'login': {
      if (!users.length) {
        users.push({ usuario: String(p.usuario).trim().toUpperCase(), password: String(p.password), rol: 'admin', activo: true, nombre: 'Administrador' })
        guardar()
      }
      const u = porNombre(p.usuario)
      if (!u || u.password !== p.password || !u.activo) throw new ApiError('Usuario o contraseña incorrectos')
      return { usuario: u.usuario, nombre: u.nombre, rol: u.rol }
    }
    case 'getRevisions':
      auth()
      return { revisiones: {} }
    case 'cambiarMiPassword': {
      const u = auth()
      u.password = String(p.nuevaPassword)
      guardar()
      return {}
    }
    case 'guardarSitio':
      auth(['admin', 'operador'])
      return {}
    case 'listContrataciones':
      auth()
      return { contrataciones: readLS<Contratacion[]>(LS.demoBookings) ?? [] }
    case 'cambiarEstadoContratacion': {
      auth(['admin', 'operador'])
      const list = readLS<Contratacion[]>(LS.demoBookings) ?? []
      writeLS(LS.demoBookings, list.map((b) => (b.id === p.id ? { ...b, estado: String(p.estado) } : b)))
      return {}
    }
    case 'listUsuarios':
      auth(['admin'])
      return { usuarios: users.map(publico) }
    case 'createUsuario': {
      auth(['admin'])
      if (porNombre(p.nuevoUsuario)) throw new ApiError('Ya existe un usuario con ese nombre.')
      users.push({
        usuario: String(p.nuevoUsuario).trim().toUpperCase(),
        password: String(p.nuevaPassword),
        rol: p.rol as Rol,
        activo: p.activo !== false,
        nombre: String(p.nombre ?? ''),
      })
      guardar()
      return {}
    }
    case 'updateUsuario': {
      auth(['admin'])
      const u = porNombre(p.targetUsuario)
      if (!u) throw new ApiError('El usuario ya no existe.')
      const activo = p.activo !== false
      if (u.rol === 'admin' && u.activo && !(p.rol === 'admin' && activo) && adminsActivos() <= 1) {
        throw new ApiError('No puedes quitar el último Admin activo.')
      }
      const nuevo = String(p.nuevoUsuario ?? '').trim().toUpperCase()
      if (nuevo && nuevo !== u.usuario && porNombre(nuevo)) throw new ApiError('Ya existe un usuario con ese nombre.')
      Object.assign(u, { usuario: nuevo || u.usuario, nombre: String(p.nombre ?? ''), rol: p.rol, activo })
      if (p.nuevaPassword) u.password = String(p.nuevaPassword)
      guardar()
      return { usuario: u.usuario }
    }
    case 'deleteUsuario': {
      const yo = auth(['admin'])
      const u = porNombre(p.targetUsuario)
      if (!u) throw new ApiError('El usuario ya no existe.')
      if (u.usuario === yo.usuario) throw new ApiError('No puedes borrarte a ti mismo.')
      if (u.rol === 'admin' && u.activo && adminsActivos() <= 1) throw new ApiError('No puedes borrar el último Admin activo.')
      users.splice(users.indexOf(u), 1)
      guardar()
      return {}
    }
    default:
      throw new ApiError('Acción desconocida')
  }
}
