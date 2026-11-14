import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { cambiarMiPassword } from '../lib/api'
import { Button } from '../ui/button'
import { ErrorBox } from '../ui/estado'
import { Field, Input } from '../ui/field'
import { Modal } from '../ui/modal'

/** Cualquier usuario cambia su propia contraseña. Tomado de contable. */
export function CambiarMiPasswordModal({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (abierto) {
      setPassword('')
      setConfirmacion('')
      setError(null)
    }
  }, [abierto])

  async function onGuardar() {
    if (!password) return setError('Escribe la nueva contraseña.')
    if (password !== confirmacion) return setError('Las contraseñas no coinciden.')

    setGuardando(true)
    setError(null)
    try {
      await cambiarMiPassword(password)
      toast.success('Contraseña actualizada')
      onCerrar()
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
        <Field label="Nueva contraseña">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
        </Field>
        <Field label="Repetir contraseña">
          <Input type="password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} autoComplete="new-password" />
        </Field>
        {error && <ErrorBox mensaje={error} />}
      </div>
    </Modal>
  )
}
