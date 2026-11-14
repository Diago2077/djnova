# Conectar djnova con Google Sheets

Toda la información (contenido de la web, contrataciones y **usuarios del
/admin**) vive en una Google Sheet. Un script de Google Apps Script
(`apps-script/Code.gs`) hace de API. No hay servidor ni base de datos que mantener.

## 1. Crear la hoja y el script

1. Crea una Google Sheet nueva (ej. «djnova – datos»).
2. Menú **Extensiones → Apps Script**.
3. Borra el contenido de `Código.gs`, pega todo `apps-script/Code.gs` y guarda.
4. **Configuración del proyecto (⚙️) → Propiedades del script → Añadir**:

   | Propiedad | Valor |
   |---|---|
   | `ADMIN_EMAIL` | tu email (será el primer administrador) |
   | `ADMIN_PASSWORD` | contraseña inicial, mínimo 8 caracteres |
   | `NOTIFY_EMAIL` | (opcional) email que recibe aviso de cada solicitud |

5. En el editor, elige la función `autorizar` y pulsa **Ejecutar**. Acepta los
   permisos (Hojas, Drive para las fotos y Gmail para los avisos).

## 2. Publicar la API

1. **Implementar → Nueva implementación → tipo «Aplicación web»**.
2. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier usuario**.
3. Copia la URL que termina en `/exec`. Es el valor de `VITE_API_URL`
   (en `.env` para local y en Vercel para producción).

> Cada vez que cambies `Code.gs`: **Implementar → Gestionar implementaciones →
> editar (lápiz) → Versión: nueva → Implementar**. La URL no cambia.

## 3. Primer ingreso

1. Entra en `/admin` con `ADMIN_EMAIL` y `ADMIN_PASSWORD`. Se crea tu cuenta de
   administrador en la pestaña `usuarios` y **la propiedad `ADMIN_PASSWORD` se
   borra sola**: a partir de ahí la contraseña solo existe cifrada.
2. Cámbiala desde la llave 🔑 de arriba a la derecha.
3. En **Usuarios** da de alta a quien necesites (rol Administrador o Editor).
4. En **Contenido** revisa los textos de ejemplo y pulsa **Guardar y publicar**:
   eso crea el resto de pestañas (`ajustes`, `agenda`, `galeria`, …).

## Usuarios y seguridad

| | Administrador | Editor |
|---|:-:|:-:|
| Editar contenido y subir archivos | ✔ | ✔ |
| Ver y gestionar contrataciones | ✔ | ✔ |
| Cambiar su propia contraseña | ✔ | ✔ |
| Crear, editar, desactivar y eliminar usuarios | ✔ | — |

- Las contraseñas se guardan como hash (HMAC-SHA256 iterado, con sal por
  usuario). Ni la web ni la hoja guardan contraseñas en claro.
- Las sesiones caducan tras 6 horas sin uso. Al cambiar una contraseña o
  desactivar a alguien, sus sesiones abiertas dejan de valer al instante.
- Tras 5 intentos fallidos, ese email queda bloqueado 10 minutos.
- Siempre queda al menos un administrador activo. Nadie puede eliminarse,
  desactivarse ni quitarse el rol de admin a sí mismo.
- Las pestañas `usuarios` y `contrataciones` nunca se exponen en la web pública.
- **Quien tenga acceso de edición a la Google Sheet controla todo**: no la
  compartas. Si se pierde el acceso de todos los admins, borra las filas de la
  pestaña `usuarios`, vuelve a poner `ADMIN_EMAIL`/`ADMIN_PASSWORD` y entra.

## Notas

- **Caché**: la web pública se sirve desde la caché del script (rápida). Guardar
  desde `/admin` la limpia sola. Si editas la hoja a mano, ejecuta `limpiarCache`
  o añade un activador «Al editar» → `onEdit`.
- **Archivos**: las fotos subidas van a la carpeta de Drive «djnova - archivos
  subidos», compartidas como «cualquiera con el enlace». Límite práctico ~25 MB.
  Para videos usa YouTube; para el video de fondo, un MP4 corto con enlace directo.
