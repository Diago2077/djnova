import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'

// La web pública y el /admin son dos apps distintas con estilos distintos:
// cada una se carga en su propio chunk para que no se mezclen sus CSS ni el
// visitante descargue el código del panel.
const esAdmin = /^\/admin(\/|$)/.test(location.pathname)
const App = esAdmin ? lazy(() => import('./admin/AdminApp')) : lazy(() => import('./site/Site'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </StrictMode>,
)
