import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './auth'
import AdminLayout from './layout/AdminLayout'
import Contenido from './pages/Contenido'
import Contrataciones from './pages/Contrataciones'
import Login from './pages/Login'
import NoEncontrado from './pages/NoEncontrado'
import Usuarios from './pages/Usuarios'
import { aplicarModoInicial } from './lib/tema'
import './admin.css'

aplicarModoInicial()

export default function AdminApp() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="contenido" replace />} />
            <Route path="contenido" element={<Contenido />} />
            <Route path="contenido/:panel" element={<Contenido />} />
            <Route path="contrataciones" element={<Contrataciones />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="*" element={<NoEncontrado />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
        <Toaster position="bottom-right" richColors closeButton />
      </AuthProvider>
    </BrowserRouter>
  )
}
