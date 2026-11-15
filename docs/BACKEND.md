# Backend de djnova (Google Sheets + Apps Script)

Mismo esquema que **Pedidos ON**: un script de Google Apps Script (`apps-script/Code.gs`)
hace de API sobre una Google Sheet. La hoja guarda el contenido de la web, las
solicitudes de contratación y los usuarios del /admin; los archivos van a una
carpeta de Drive.

## 1. Instalar

1. Crea el script: **script.google.com → Nuevo proyecto** (independiente; crea
   la hoja «djnova» en tu Drive y guarda su ID en `SPREADSHEET_ID`) **o** abre una
   Google Sheet y entra por **Extensiones → Apps Script** (script vinculado).
2. Pega `apps-script/Code.gs` como `Código.gs`.
3. **Configuración del proyecto (⚙️) → «Mostrar el archivo appsscript.json»** y
   pega el contenido de `apps-script/appsscript.json` (zona horaria
   `America/Asuncion`, permisos de Hojas, Drive y Gmail, acceso web «Cualquier usuario»).
4. Elige la función **`instalar`** y pulsa **Ejecutar**. Acepta los permisos.
   Crea de una vez:
   - las pestañas con sus encabezados, formatos y listas desplegables,
   - la carpeta de Drive «djnova - Archivos»,
   - el usuario **ADMIN** con una contraseña aleatoria.
5. Mira el resultado en **Registro de ejecución** (o en el aviso de la hoja): ahí
   sale la contraseña del ADMIN y el enlace a la hoja. También está en la
   pestaña `Usuarios`. Es idempotente: puedes volver a ejecutarla sin perder datos.
   Tras recargar la hoja aparece el menú **djnova** con «Instalar / reparar hoja».

## 2. Publicar la API

1. **Implementar → Nueva implementación → Aplicación web**.
2. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier usuario**.
3. Copia la URL que termina en `/exec`: es `VITE_API_URL` (en `.env` y en Vercel).

> Cada vez que cambies `Code.gs`: **Implementar → Gestionar implementaciones →
> editar (lápiz) → Versión: nueva → Implementar**. La URL no cambia.

## 3. Primer ingreso

Entra en `/admin` con `ADMIN` y la contraseña que dejó `instalar`; cámbiala con
la llave 🔑. Después ve a **Contenido**, revisa los textos de ejemplo y pulsa
**Guardar y publicar**: desde ese momento la web muestra tu contenido.
(Hasta el primer guardado la web usa el contenido de ejemplo del código.)

## Pestañas de la hoja

| Pestaña | Qué guarda | Columnas |
|---|---|---|
| `Usuarios` | cuentas del /admin | `usuario` · `password` · `rol` · `activo` · `nombre` |
| `Ajustes` | textos, colores, enlaces | `clave` · `valor` (ej. `hero.titulo`, `tema.acento`) |
| `Secciones` | orden y visibilidad | `id` · `menu` · `visible` · `orden` |
| `Numeros` | contadores | `numero` · `prefijo` · `etiqueta` |
| `Paises` | alcance | `bandera` · `nombre` · `regiones` · `ciudades` |
| `Barras` | barras de progreso | `etiqueta` · `porcentaje` |
| `Agenda` | shows | `fecha` · `lugar` · `ciudad` · `estado` · `entradas` |
| `Videos` | videos extra | `youtube` · `titulo` |
| `Galeria` | fotos | `imagen` · `descripcion` |
| `Tira` | fotos bajo la portada | `imagen` |
| `Redes` | redes sociales | `red` · `url` |
| `Beneficios` | puntos fuertes | `texto` |
| `Contrataciones` | solicitudes del formulario (privada) | `id` · `recibido` · `nombre` · `contacto` · `fechaEvento` · `ciudad` · `evento` · `mensaje` · `estado` |
| `Archivos` | registro de lo subido a Drive | `id` · `driveId` · `nombre` · `mime` · `bytes` · `url` · `subidoPor` · `fecha` |
| `Config` | `carpetaDriveId` y `emailAvisos` | `clave` · `valor` |

`Usuarios`, `Contrataciones`, `Archivos` y `Config` nunca se envían a la web
pública. Para que cada solicitud te llegue también por email, escribe tu email
en `Config` → `emailAvisos`.

## Roles

| | admin | operador | consulta |
|---|:-:|:-:|:-:|
| Ver contenido y contrataciones | ✔ | ✔ | ✔ |
| Guardar contenido y subir archivos | ✔ | ✔ | — |
| Cambiar el estado de una contratación | ✔ | ✔ | — |
| Gestionar usuarios | ✔ | — | — |
| Cambiar su propia contraseña | ✔ | ✔ | ✔ |

## Cómo funciona la sesión

No hay token: cada llamada del /admin lleva `usuario` y `password` y el script las
valida (con una caché de 5 minutos que guarda solo una huella SHA-256, no la
contraseña). Cualquier cambio de usuarios hecho desde la app invalida esa caché
al instante. En el navegador las credenciales viven en `sessionStorage`: se
olvidan al cerrar la pestaña. Si el servidor responde `codigo: "SESION"`
(contraseña cambiada, usuario desactivado o borrado) el panel vuelve al login.

> Igual que en Pedidos ON, **las contraseñas se guardan en claro en la pestaña
> `Usuarios`**. Por eso: no compartas la hoja con nadie que no deba verlas y usa
> contraseñas que no repitas en otros servicios. Siempre queda al menos un admin
> activo y nadie puede borrarse a sí mismo.

## Si editas la hoja a mano

El contenido de la web y los usuarios se leen con una revisión («sitio»,
«usuarios»…) que sube al guardar desde el /admin. Si cambias algo directamente en
la hoja, usa el menú **djnova → Publicar cambios hechos a mano** para que la web
y el panel lo vean ya (si no, tardan hasta 6 h en refrescarse).
Las fechas van como `2026-12-05` y las casillas como `TRUE`/`FALSE`.

## Archivos

Se suben a `djnova - Archivos/{Imagenes, Audio, Video, Documentos}`, compartidos
como «cualquiera con el enlace». Límite 20 MB. Para videos largos usa YouTube; el
video de fondo de la portada debe ser un MP4 corto.

Drive **no deja** usar sus enlaces directamente en `<audio>`/`<video>` de otra web
(devuelve una página, no el archivo). Por eso el audio y el video se sirven así:

1. **Normal (Vercel)**: la función `api/media.js` pide a Drive el rango que necesita
   el reproductor (trozos de hasta 4 MB) y se lo reenvía. Empieza al instante y se
   puede adelantar. Solo sirve archivos que aparecen en el contenido publicado
   (lo comprueba con `getSitio`, usando la variable `VITE_API_URL` de Vercel).
2. **Plan B**: si `/api/media` no responde (por ejemplo en local con `npm run dev`),
   la web baja el archivo por trozos del script (acción pública `getArchivo`, solo
   de archivos de la pestaña `Archivos`) y lo reproduce desde el navegador. Es más
   lento (varios segundos por trozo). Si cambias `Code.gs`, publica una **nueva
   versión** de la implementación.
