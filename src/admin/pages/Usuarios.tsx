import { Plus, Search, UserRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../auth'
import { CambiarPasswordModal, EditarUsuarioModal, NuevoUsuarioModal, UsuarioDetalleModal } from '../components/UsuarioModales'
import * as api from '../lib/api'
import { ROL_LABEL, type Perfil } from '../lib/api'
import { normalizar } from '../lib/formato'
import { Badge, type TonoBadge } from '../ui/badge'
import { Button } from '../ui/button'
import { Cargando, ErrorBox, Vacio } from '../ui/estado'
import { Input } from '../ui/field'
import { ConfirmModal } from '../ui/modal'

// Adaptado de contable/src/pages/Usuarios.tsx

const TONO_ROL: Record<Perfil['rol'], TonoBadge> = { admin: 'primary', operador: 'neutral', consulta: 'warning' }

export default function Usuarios() {
  const { perfil, esAdmin, refrescarPerfil } = useAuth()
  const navigate = useNavigate()

  // Solo un administrador gestiona usuarios (el servidor también lo exige).
  useEffect(() => {
    if (perfil && !esAdmin) navigate('/admin', { replace: true })
  }, [perfil, esAdmin, navigate])

  const [data, setData] = useState<Perfil[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const refetch = useCallback(async () => {
    setError(null)
    try {
      const items = await api.listarUsuarios()
      setData(items.sort((a, b) => a.usuario.localeCompare(b.usuario, 'es')))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los usuarios.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (esAdmin) refetch()
  }, [esAdmin, refetch])

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda)
    if (!q) return data
    return data.filter((u) => normalizar(u.usuario).includes(q) || normalizar(u.nombre).includes(q))
  }, [data, busqueda])

  const [modalNuevo, setModalNuevo] = useState(false)
  const [modalDetalle, setModalDetalle] = useState<Perfil | null>(null)
  const [modalEditar, setModalEditar] = useState<Perfil | null>(null)
  const [modalPassword, setModalPassword] = useState<Perfil | null>(null)
  const [modalEliminar, setModalEliminar] = useState<Perfil | null>(null)
  const [eliminando, setEliminando] = useState(false)

  const esYo = (u: Perfil | null) => !!u && u.usuario === perfil?.usuario

  if (!esAdmin) return null

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Quiénes tienen acceso al panel de la web.</p>
        </div>
        <Button onClick={() => setModalNuevo(true)}>
          <Plus /> Nuevo usuario
        </Button>
      </div>

      {data.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por usuario o nombre…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
      )}

      {loading ? (
        <Cargando />
      ) : error ? (
        <ErrorBox mensaje={error} />
      ) : data.length === 0 ? (
        <Vacio icono={UserRound} titulo="Sin usuarios" />
      ) : filtrados.length === 0 ? (
        <Vacio icono={UserRound} titulo="Sin resultados" descripcion="Prueba con otra búsqueda." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Usuario</th>
                <th className="px-4 py-2.5 font-medium">Nombre</th>
                <th className="px-4 py-2.5 font-medium">Rol</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <tr
                  key={u.usuario}
                  onClick={() => setModalDetalle(u)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/40"
                >
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {u.usuario}
                    {esYo(u) && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(tú)</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{u.nombre || '—'}</td>
                  <td className="px-4 py-2.5">
                    <Badge tono={TONO_ROL[u.rol]}>{ROL_LABEL[u.rol]}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tono={u.activo ? 'success' : 'neutral'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NuevoUsuarioModal
        abierto={modalNuevo}
        onCerrar={() => setModalNuevo(false)}
        onCreado={() => {
          setModalNuevo(false)
          refetch()
        }}
      />

      <UsuarioDetalleModal
        usuario={modalDetalle}
        esYo={esYo(modalDetalle)}
        onCerrar={() => setModalDetalle(null)}
        onEditar={() => {
          setModalEditar(modalDetalle)
          setModalDetalle(null)
        }}
        onCambiarPassword={() => {
          setModalPassword(modalDetalle)
          setModalDetalle(null)
        }}
        onEliminar={() => {
          setModalEliminar(modalDetalle)
          setModalDetalle(null)
        }}
        onToggleActivo={async () => {
          if (!modalDetalle) return
          try {
            await api.actualizarUsuario(modalDetalle.usuario, { ...modalDetalle, activo: !modalDetalle.activo })
            toast.success(modalDetalle.activo ? 'Usuario desactivado' : 'Usuario activado')
            setModalDetalle({ ...modalDetalle, activo: !modalDetalle.activo })
            refetch()
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'No se pudo actualizar.')
          }
        }}
      />

      <EditarUsuarioModal
        usuario={modalEditar}
        esYo={esYo(modalEditar)}
        onCerrar={() => setModalEditar(null)}
        onGuardado={() => {
          if (esYo(modalEditar)) refrescarPerfil()
          setModalEditar(null)
          refetch()
        }}
      />

      <CambiarPasswordModal usuario={modalPassword} onCerrar={() => setModalPassword(null)} />

      <ConfirmModal
        abierto={modalEliminar !== null}
        titulo="Eliminar usuario"
        procesando={eliminando}
        mensaje={
          <>
            Se va a eliminar a <strong>{modalEliminar?.usuario}</strong>
            {modalEliminar?.nombre ? ` (${modalEliminar.nombre})` : ''}. Esta acción no se puede deshacer.
          </>
        }
        onCancelar={() => setModalEliminar(null)}
        onConfirmar={async () => {
          if (!modalEliminar) return
          setEliminando(true)
          try {
            await api.eliminarUsuario(modalEliminar.usuario)
            toast.success('Usuario eliminado')
            refetch()
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'No se pudo eliminar.')
          } finally {
            setEliminando(false)
            setModalEliminar(null)
          }
        }}
      />
    </div>
  )
}
