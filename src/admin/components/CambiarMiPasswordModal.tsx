import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../auth'
import { cambiarMiPassword, LARGO_MINIMO_PASSWORD } from '../lib/api'
import { Button } from '../ui/button'
import { ErrorBox } from '../ui/estado'
import { Field, Input } from '../ui/field'
import { Modal } from '../ui/modal'

/** Cualquier usuario cambia su propia contraseña (pide la actual). Tomado de contable. */
export function CambiarMiPasswordModal({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { signOut } = useAuth()
  const [actual, setActual] = useState('')
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (abierto) {
      setActual('')
      setPassword('')
      setConfirmacion('')
      setError(null)
    }
  }, [abierto])

  async function onGuardar() {
    if (!actual) return setError('Escribe tu contraseña actual.')
    if (password.length < LARGO_MINIMO_PASSWORD) return setError(`Mínimo ${LARGO_MINIMO_PASSWORD} caracteres.`)
    if (password !== confirmacion) return setError('Las contraseñas no coinciden.')

    setGuardando(true)
    setError(null)
    try {
      await cambiarMiPassword(actual, password)
      toast.success('Contraseña actualizada. Vuelve a entrar con la nueva.')
      onCerrar()
      // El servidor invalida todas las sesiones abiertas al cambiar la contraseña.
      await signOut()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar la contraseña.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Cambiar mi contraseña"
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
        <Field label="Contraseña actual">
          <Input type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" autoFocus />
        </Field>
        <Field label="Nueva contraseña" hint={`Mínimo ${LARGO_MINIMO_PASSWORD} caracteres`}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Repetir contraseña">
          <Input type="password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} autoComplete="new-password" />
        </Field>
        {error && <ErrorBox mensaje={error} />}
      </div>
    </Modal>
  )
}
