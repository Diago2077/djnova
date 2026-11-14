import { ApiError, DEMO, LS, post, readLS, writeLS } from '@/lib/api'
import { toTablas } from '@/lib/tables'
import type { Contratacion, SiteConfig } from '@/types'

export type Rol = 'admin' | 'editor'

export interface Perfil {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  creado?: string
  ultimoAcceso?: string
}

export const ROL_LABEL: Record<Rol, string> = { admin: 'Administrador', editor: 'Editor' }
export const LARGO_MINIMO_PASSWORD = 8

/** Se dispara cuando el servidor dice que la sesión ya no vale. */
export const EVENTO_SESION_CADUCADA = 'djnova:sesion-caducada'

export function getToken(): string | null {
  try {
    return localStorage.getItem(LS.token)
  } catch {
    return null
  }
}
export function setToken(t: string | null) {
  try {
    if (t) localStorage.setItem(LS.token, t)
    else localStorage.removeItem(LS.token)
  } catch {
    /* noop */
  }
}

async function llamar<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  try {
    if (DEMO) return demo(action, payload) as T
    return await post<T>({ action, token: getToken(), ...payload })
  } catch (e) {
    if (e instanceof ApiError && e.code === 'AUTH') {
      setToken(null)
      window.dispatchEvent(new Event(EVENTO_SESION_CADUCADA))
    }
    throw e
  }
}

// ---------------------------------------------------------------- Sesión

export async function login(email: string, password: string): Promise<Perfil> {
  const r = await llamar<{ token: string; perfil: Perfil }>('login', { email, password })
  setToken(r.token)
  return r.perfil
}

export async function yo(): Promise<Perfil> {
  return (await llamar<{ perfil: Perfil }>('me')).perfil
}

export async function logout() {
  try {
    await llamar('logout')
  } catch {
    /* si ya caducó da igual */
  }
  setToken(null)
}

export async function cambiarMiPassword(actual: string, nueva: string) {
  await llamar('miPassword', { actual, nueva })
}

// ---------------------------------------------------------------- Contenido

export async function guardarConfig(cfg: SiteConfig) {
  const tablas = toTablas(cfg)
  await llamar('save', { tablas })
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

/** Sube un archivo a la carpeta de Google Drive y devuelve su URL pública. */
export async function subirArchivo(file: File): Promise<string> {
  if (DEMO) return URL.createObjectURL(file) // solo se ve en esta sesión
  if (file.size > 25 * 1024 * 1024) {
    throw new ApiError('El archivo supera 25 MB. Para videos usa YouTube o un enlace externo.')
  }
  const base64 = await fileToBase64(file)
  const { url } = await llamar<{ url: string }>('upload', {
    name: file.name,
    mime: file.type || 'application/octet-stream',
    base64,
  })
  return url
}

// ---------------------------------------------------------------- Contrataciones

export async function listarContrataciones(): Promise<Contratacion[]> {
  return (await llamar<{ items: Contratacion[] }>('bookings')).items
}

export async function cambiarEstadoContratacion(fila: number, estado: string) {
  await llamar('bookingStatus', { fila, estado })
}

// ---------------------------------------------------------------- Usuarios (solo admin)

export async function listarUsuarios(): Promise<Perfil[]> {
  return (await llamar<{ items: Perfil[] }>('usuarios')).items
}
export async function crearUsuario(p: { nombre: string; email: string; password: string; rol: Rol }) {
  await llamar('usuarioCrear', p)
}
export async function editarUsuario(p: { id: string; nombre: string; email: string; rol: Rol }) {
  await llamar('usuarioEditar', p)
}
export async function activarUsuario(id: string, activo: boolean) {
  await llamar('usuarioActivo', { id, activo })
}
export async function passwordDeUsuario(id: string, password: string) {
  await llamar('usuarioPassword', { id, password })
}
export async function eliminarUsuario(id: string) {
  await llamar('usuarioEliminar', { id })
}

// ---------------------------------------------------------------- Modo demo
// Simula el backend en localStorage para poder probar el admin sin Google Sheets.
// Las contraseñas se guardan en claro: SOLO para pruebas locales.

type UsuarioDemo = Perfil & { password: string }

function demo(action: string, p: Record<string, unknown>): unknown {
  const users = readLS<UsuarioDemo[]>(LS.demoUsers) ?? []
  const guardar = () => writeLS(LS.demoUsers, users)
  const publico = ({ password: _pw, ...u }: UsuarioDemo): Perfil => u
  const actual = users.find((u) => u.id === getToken())
  const exigir = (admin = false) => {
    if (!actual || !actual.activo) throw new ApiError('Sesión caducada. Vuelve a entrar.', 'AUTH')
    if (admin && actual.rol !== 'admin') throw new ApiError('No tienes permiso para esta operación.')
    return actual
  }
  const buscar = (id: unknown) => {
    const u = users.find((x) => x.id === id)
    if (!u) throw new ApiError('Usuario no encontrado.')
    return u
  }
  const email = String(p.email ?? '').trim().toLowerCase()

  switch (action) {
    case 'login': {
      if (!users.length) {
        users.push({ id: crypto.randomUUID(), nombre: 'Administrador', email, rol: 'admin', activo: true, password: String(p.password), creado: new Date().toISOString() })
        guardar()
      }
      const u = users.find((x) => x.email === email && x.password === p.password)
      if (!u) throw new ApiError('Email o contraseña incorrectos.')
      if (!u.activo) throw new ApiError('Tu usuario está desactivado. Contacta al administrador.')
      u.ultimoAcceso = new Date().toISOString()
      guardar()
      return { token: u.id, perfil: publico(u) }
    }
    case 'me':
      return { perfil: publico(exigir()) }
    case 'logout':
      return { ok: true }
    case 'miPassword': {
      const u = exigir()
      if (u.password !== p.actual) throw new ApiError('La contraseña actual no es correcta.')
      u.password = String(p.nueva)
      guardar()
      return { ok: true }
    }
    case 'save':
      exigir()
      return { ok: true }
    case 'bookings':
      exigir()
      return { items: readLS<Contratacion[]>(LS.demoBookings) ?? [] }
    case 'bookingStatus': {
      exigir()
      const list = readLS<Contratacion[]>(LS.demoBookings) ?? []
      writeLS(LS.demoBookings, list.map((b) => (b.fila === p.fila ? { ...b, estado: String(p.estado) } : b)))
      return { ok: true }
    }
    case 'usuarios':
      exigir(true)
      return { items: users.map(publico) }
    case 'usuarioCrear':
      exigir(true)
      if (users.some((u) => u.email === email)) throw new ApiError('Ya existe un usuario con ese email.')
      users.push({ id: crypto.randomUUID(), nombre: String(p.nombre), email, rol: p.rol as Rol, activo: true, password: String(p.password), creado: new Date().toISOString() })
      guardar()
      return { ok: true }
    case 'usuarioEditar': {
      const yo = exigir(true)
      const u = buscar(p.id)
      if (u.id === yo.id && p.rol !== 'admin') throw new ApiError('No puedes quitarte tu propio rol de administrador.')
      Object.assign(u, { nombre: p.nombre, email, rol: p.rol })
      guardar()
      return { ok: true }
    }
    case 'usuarioActivo': {
      const yo = exigir(true)
      if (p.id === yo.id) throw new ApiError('No puedes desactivar tu propia cuenta.')
      buscar(p.id).activo = !!p.activo
      guardar()
      return { ok: true }
    }
    case 'usuarioPassword':
      exigir(true)
      buscar(p.id).password = String(p.password)
      guardar()
      return { ok: true }
    case 'usuarioEliminar': {
      const yo = exigir(true)
      if (p.id === yo.id) throw new ApiError('No puedes eliminar tu propia cuenta.')
      users.splice(users.indexOf(buscar(p.id)), 1)
      guardar()
      return { ok: true }
    }
    default:
      throw new ApiError('Acción desconocida')
  }
}
