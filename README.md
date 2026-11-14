# djnova

Web de artista (DJ) con panel `/admin` para configurarlo todo. Los datos viven
en una **Google Sheet** y se despliega en **Vercel**.

- **Web pública**: pantalla de entrada con música, portada con video y
  partículas, números animados, videos en vivo, mapa/alcance, agenda (oculta
  fechas pasadas), Spotify, galería, bio, contratación (WhatsApp + formulario),
  Instagram, presskit.
- **/admin**: mismo sistema de diseño y de usuarios que *contable* (Tailwind v4,
  lucide, sonner, modo claro/oscuro). Editor de contenido por secciones,
  bandeja de contrataciones y gestión de usuarios con roles admin / operador / consulta.

## Desarrollo local

```bash
npm install
npm run dev
```

- Web: http://localhost:5173 · Panel: http://localhost:5173/admin
- Sin `.env` funciona en **modo demo**: todo se guarda en el navegador y el
  primer usuario que entra al admin se crea como administrador.
- Para usar la Google Sheet real: `docs/BACKEND.md` y luego
  `.env` con `VITE_API_URL=https://script.google.com/macros/s/…/exec`.

## Despliegue en Vercel

1. En Vercel: **Add New → Project → Import** el repositorio `Diago2077/djnova`.
   Detecta Vite solo (`vercel.json` ya fija build y salida).
2. **Settings → Environment Variables**: `VITE_API_URL` = URL `/exec` del Apps
   Script (Production y Preview).
3. Deploy. Cada push a `main` vuelve a desplegar.

`vercel.json` reescribe todas las rutas a `index.html` (para que `/admin/…` no
dé 404 al recargar), cachea `/assets/*` para siempre (llevan hash) y marca
`/admin` como `noindex` y no embebible.

## Estructura

```
apps-script/Code.gs      API en la Google Sheet (estructura Pedidos ON): contenido, contrataciones, usuarios y archivos
apps-script/appsscript.json   manifiesto (zona horaria, permisos, acceso web)
src/main.tsx             decide si carga la web o el admin (cada uno en su chunk)
src/site/                web pública (CSS propio, GSAP)
src/admin/               panel (Tailwind; ui/ copiado de contable)
  auth.tsx               AuthProvider (usuario + contraseña validados en cada llamada)
  contenido.tsx          borrador del contenido compartido entre pantallas
  schema.ts              qué campos edita cada sección del panel
  pages/                 Login, Contenido, Contrataciones, Usuarios
src/types.ts · defaults.ts   modelo de datos y contenido de ejemplo
```

**Añadir un campo nuevo**: declararlo en `types.ts` + `defaults.ts`, pintarlo en
`src/site/sections.tsx` y añadirlo en `src/admin/schema.ts`. La hoja se
actualiza sola en el siguiente guardado.
