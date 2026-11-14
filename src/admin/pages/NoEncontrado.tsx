import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/button'
import { Vacio } from '../ui/estado'

export default function NoEncontrado() {
  return (
    <Vacio
      icono={Compass}
      titulo="Página no encontrada"
      descripcion="La dirección no existe en el panel."
      accion={
        <Link to="/admin">
          <Button variant="outline">Volver al inicio</Button>
        </Link>
      }
    />
  )
}
