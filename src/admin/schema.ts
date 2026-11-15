import {
  CalendarDays,
  Clapperboard,
  FileText,
  Globe,
  Handshake,
  Hash,
  Images,
  LayoutList,
  MonitorPlay,
  Music,
  Palette,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import type { Ajustes, ListaKey } from '@/types'

export type FieldType = 'text' | 'textarea' | 'color' | 'number' | 'bool' | 'image' | 'file' | 'url' | 'date' | 'select' | 'readonly'

export interface FieldDef {
  key: string
  label: string
  type?: FieldType
  help?: string
  options?: string[]
  accept?: string
}

/** Recuadro de pasos que solo se muestra mientras `cuando` devuelva true (p. ej. campo aún vacío). */
export interface GuiaDef {
  cuando: (valores: Record<string, string | number | boolean>) => boolean
  titulo: string
  pasos: string[]
  enlace?: { texto: string; url: string }
}

export interface GrupoDef {
  grupo: keyof Ajustes
  titulo?: string
  fields: FieldDef[]
  guia?: GuiaDef
}

export interface ListaDef {
  key: ListaKey
  titulo: string
  fields: FieldDef[]
  /** Campo que se usa como título de cada fila. */
  resumen: string
  /** Lista de tamaño fijo (no se añaden ni borran filas). */
  fija?: boolean
  help?: string
}

/** frecuente = lo que se actualiza a menudo; config = se configura una vez y casi no se toca. */
export type Bloque = 'frecuente' | 'config'

export const BLOQUES: { id: Bloque; titulo: string }[] = [
  { id: 'frecuente', titulo: 'Lo que actualizas seguido' },
  { id: 'config', titulo: 'Configuración (se toca una vez)' },
]

export interface Panel {
  id: string
  bloque: Bloque
  titulo: string
  icono: LucideIcon
  descripcion?: string
  grupos?: GrupoDef[]
  listas?: ListaDef[]
}

const TITULO_HELP = 'Pon *entre asteriscos* las palabras que quieras resaltar con el color de acento.'
const FUENTES = ['Outfit', 'Inter', 'Montserrat', 'Bebas Neue', 'Anton', 'Oswald', 'Poppins', 'Space Grotesk', 'Syne', 'Unbounded', 'Archivo Black', 'Manrope', 'DM Sans', 'Sora']
const cabecera = (extra: FieldDef[] = []): FieldDef[] => [
  { key: 'etiqueta', label: 'Etiqueta superior' },
  { key: 'titulo', label: 'Título', help: TITULO_HELP },
  ...extra,
]

export const PANELES: Panel[] = [
  {
    id: 'agenda',
    bloque: 'frecuente',
    titulo: 'Agenda',
    icono: CalendarDays,
    descripcion: 'Los shows pasados se ocultan solos al día siguiente.',
    grupos: [{ grupo: 'agenda', fields: cabecera([{ key: 'vacio', label: 'Texto cuando no hay fechas' }]) }],
    listas: [
      {
        key: 'agenda',
        titulo: 'Shows',
        resumen: 'lugar',
        fields: [
          { key: 'fecha', label: 'Fecha', type: 'date' },
          { key: 'lugar', label: 'Local / evento' },
          { key: 'ciudad', label: 'Ciudad - país' },
          { key: 'estado', label: 'Estado', type: 'select', options: ['Confirmado', 'Últimas entradas', 'Agotado', 'Por confirmar', ''] },
          { key: 'entradas', label: 'Link de entradas', type: 'url' },
        ],
      },
    ],
  },
  {
    id: 'multimedia',
    bloque: 'frecuente',
    titulo: 'Fotos',
    icono: Images,
    descripcion: 'Galería y tira de fotos bajo la portada.',
    grupos: [{ grupo: 'galeria', fields: cabecera() }],
    listas: [
      {
        key: 'galeria',
        titulo: 'Galería (fotos)',
        resumen: 'descripcion',
        fields: [
          { key: 'imagen', label: 'Foto', type: 'image' },
          { key: 'descripcion', label: 'Descripción (opcional)' },
        ],
      },
      {
        key: 'tira',
        titulo: 'Tira bajo la portada',
        resumen: 'imagen',
        fields: [{ key: 'imagen', label: 'Foto', type: 'image', help: 'Se ven en una tira a ancho completo, entre la portada y los números. Mejor cuadradas; con 4 fotos queda como en la referencia. Sin fotos, la tira no aparece.' }],
      },
    ],
  },
  {
    id: 'numeros',
    bloque: 'frecuente',
    titulo: 'Números',
    icono: Hash,
    descripcion: 'Contadores animados. Los tres primeros también aparecen en la portada.',
    listas: [
      {
        key: 'numeros',
        titulo: 'Contadores',
        resumen: 'etiqueta',
        fields: [
          { key: 'prefijo', label: 'Prefijo (ej. +)' },
          { key: 'numero', label: 'Número', type: 'number' },
          { key: 'etiqueta', label: 'Etiqueta' },
        ],
      },
    ],
  },
  {
    id: 'identidad',
    bloque: 'config',
    titulo: 'Identidad, SEO y pie',
    icono: UserRound,
    descripcion: 'Tu nombre artístico, logo, cómo aparece la web en Google, el presskit y el pie de página.',
    grupos: [
      {
        grupo: 'marca',
        titulo: 'Marca',
        fields: [
          { key: 'nombre', label: 'Nombre artístico' },
          { key: 'apodo', label: 'Apodo / subtítulo' },
          { key: 'logo', label: 'Logo (PNG transparente)', type: 'image', help: 'Si lo dejas vacío se muestra el nombre en texto.' },
        ],
      },
      {
        grupo: 'seo',
        titulo: 'Google y redes',
        fields: [
          { key: 'titulo', label: 'Título de la pestaña' },
          { key: 'descripcion', label: 'Descripción', type: 'textarea' },
          { key: 'imagen', label: 'Imagen al compartir (1200×630)', type: 'image' },
        ],
      },
      {
        grupo: 'presskit',
        titulo: 'Presskit',
        fields: [
          { key: 'etiqueta', label: 'Etiqueta superior' },
          { key: 'titulo', label: 'Título', help: TITULO_HELP },
          { key: 'boton', label: 'Texto del botón' },
          { key: 'url', label: 'Archivo PDF o enlace', type: 'file', accept: 'application/pdf' },
          { key: 'fondo', label: 'Foto de fondo (efecto fijo)', type: 'image', help: 'Queda quieta detrás de la sección y se va descubriendo al hacer scroll. Sin foto, fondo liso.' },
        ],
      },
      { grupo: 'footer', titulo: 'Pie de página', fields: [{ key: 'texto', label: 'Texto', help: '{año} se reemplaza por el año actual.' }] },
    ],
  },
  {
    id: 'tema',
    bloque: 'config',
    titulo: 'Diseño y colores',
    icono: Palette,
    grupos: [
      {
        grupo: 'tema',
        fields: [
          { key: 'fondo', label: 'Fondo', type: 'color' },
          { key: 'superficie', label: 'Tarjetas', type: 'color' },
          { key: 'texto', label: 'Texto', type: 'color' },
          { key: 'textoSuave', label: 'Texto secundario', type: 'color' },
          { key: 'acento', label: 'Acento principal', type: 'color' },
          { key: 'acento2', label: 'Acento secundario (degradado)', type: 'color' },
          { key: 'fuenteTitulos', label: 'Fuente de títulos', type: 'select', options: FUENTES, help: 'Fuentes de Google Fonts.' },
          { key: 'fuenteTexto', label: 'Fuente de texto', type: 'select', options: FUENTES },
          { key: 'radio', label: 'Redondeo de esquinas (px)', type: 'number' },
          { key: 'particulas', label: 'Partículas animadas en la portada', type: 'bool' },
        ],
      },
    ],
  },
  {
    id: 'portada',
    bloque: 'config',
    titulo: 'Entrada y portada',
    icono: Clapperboard,
    grupos: [
      {
        grupo: 'entrada',
        titulo: 'Pantalla de entrada',
        fields: [
          { key: 'activa', label: 'Mostrar pantalla de entrada', type: 'bool', help: 'Permite arrancar la música de fondo con el primer clic.' },
          { key: 'boton', label: 'Texto del botón' },
          { key: 'aviso', label: 'Aviso bajo el botón' },
          { key: 'musica', label: 'Música de fondo (MP3)', type: 'file', accept: 'audio/*' },
        ],
      },
      {
        grupo: 'hero',
        titulo: 'Portada',
        fields: [
          { key: 'video', label: 'Video de fondo (MP4, URL)', type: 'file', accept: 'video/mp4,video/webm', help: 'Mejor un MP4 corto (<15 MB) alojado en un enlace directo.' },
          { key: 'imagen', label: 'Imagen de fondo / póster', type: 'image' },
          { key: 'titulo', label: 'Frase principal', help: TITULO_HELP },
          { key: 'ctaPrimario', label: 'Botón principal (va a Contratación)' },
          { key: 'ctaSecundario', label: 'Botón secundario (va a En vivo)' },
        ],
      },
    ],
  },
  {
    id: 'secciones',
    bloque: 'config',
    titulo: 'Secciones y menú',
    icono: LayoutList,
    descripcion: 'Elige qué secciones se ven en la página y cuáles aparecen en el menú de arriba. Quitar una del menú no la oculta de la página.',
    listas: [
      {
        key: 'secciones',
        titulo: 'Secciones',
        resumen: 'menu',
        fija: true,
        fields: [
          { key: 'id', label: 'Sección', type: 'readonly' },
          { key: 'menu', label: 'Texto en el menú' },
          { key: 'enMenu', label: 'Mostrar en el menú de arriba', type: 'bool', help: 'Si lo apagas, la sección sigue en la página pero no sale en el menú.' },
          { key: 'visible', label: 'Mostrar la sección en la página', type: 'bool' },
        ],
      },
    ],
  },
  {
    id: 'envivo',
    bloque: 'config',
    titulo: 'En vivo (videos)',
    icono: MonitorPlay,
    grupos: [
      {
        grupo: 'envivo',
        fields: cabecera([
          { key: 'texto', label: 'Texto', type: 'textarea' },
          { key: 'youtube', label: 'Video principal de YouTube', type: 'url', help: 'Pega el enlace del video; se reproduce en silencio y en bucle.' },
        ]),
      },
    ],
    listas: [
      {
        key: 'videos',
        titulo: 'Más videos',
        resumen: 'titulo',
        fields: [
          { key: 'youtube', label: 'Enlace de YouTube', type: 'url' },
          { key: 'titulo', label: 'Título' },
        ],
      },
    ],
  },
  {
    id: 'alcance',
    bloque: 'config',
    titulo: 'Mapa / alcance',
    icono: Globe,
    grupos: [{ grupo: 'alcance', fields: cabecera([{ key: 'texto', label: 'Texto', type: 'textarea' }]) }],
    listas: [
      {
        key: 'paises',
        titulo: 'Países',
        resumen: 'nombre',
        fields: [
          { key: 'bandera', label: 'Bandera (código de país)', help: 'Dos letras: AR, UY, CL, PY, MX, ES… Se muestra como imagen SVG.' },
          { key: 'nombre', label: 'País' },
          { key: 'regiones', label: 'Regiones / ciudades destacadas' },
          { key: 'ciudades', label: 'Dato destacado (ej. +30 ciudades)' },
        ],
      },
      {
        key: 'barras',
        titulo: 'Barras de progreso',
        resumen: 'etiqueta',
        fields: [
          { key: 'etiqueta', label: 'Etiqueta' },
          { key: 'porcentaje', label: 'Porcentaje (0-100)', type: 'number' },
        ],
      },
    ],
  },
  {
    id: 'spotify',
    bloque: 'config',
    titulo: 'Música',
    icono: Music,
    grupos: [
      {
        grupo: 'spotify',
        fields: cabecera([
          { key: 'url', label: 'Enlace de Spotify', type: 'url', help: 'Artista, álbum, playlist o canción (open.spotify.com/…).' },
        ]),
      },
    ],
  },
  {
    id: 'bio',
    bloque: 'config',
    titulo: 'Bio, redes e Instagram',
    icono: FileText,
    grupos: [
      {
        grupo: 'bio',
        fields: cabecera([
          { key: 'texto', label: 'Biografía', type: 'textarea', help: 'Deja una línea en blanco entre párrafos.' },
          { key: 'foto', label: 'Foto', type: 'image' },
        ]),
      },
      {
        grupo: 'instagram',
        titulo: 'Instagram',
        guia: {
          cuando: (v) => !String(v.feed ?? '').trim(),
          titulo: 'Cómo mostrar tus últimos posts automáticamente',
          pasos: [
            'Crea una cuenta gratuita en behold.so.',
            'Conecta tu Instagram. La cuenta debe ser profesional (Creador o Empresa); si no lo es, se cambia en Instagram → Configuración → Tipo de cuenta.',
            'Crea un feed nuevo y elige la salida «JSON» (los nombres exactos pueden variar un poco).',
            'Copia la URL del feed (empieza por https://feeds.behold.so/) y pégala en «Feed automático».',
            'Pulsa «Guardar y publicar». Desde ahí la web muestra tu foto, bio, seguidores y los últimos 6 posts, y se actualiza sola.',
          ],
          enlace: { texto: 'Abrir behold.so', url: 'https://behold.so' },
        },
        fields: [
          { key: 'etiqueta', label: 'Etiqueta superior' },
          {
            key: 'feed',
            label: 'Feed automático (Behold)',
            help: 'Pega aquí el enlace del feed (https://feeds.behold.so/…). Si lo dejas vacío se usa la tarjeta manual de abajo.',
          },
          { key: 'usuario', label: 'Usuario (sin @)', help: 'Solo si no usas el feed automático.' },
          { key: 'descripcion', label: 'Descripción', help: 'Solo si no usas el feed automático.' },
          { key: 'seguidores', label: 'Seguidores (texto, ej. 8,4K)', help: 'Solo si no usas el feed automático.' },
        ],
      },
    ],
    listas: [
      {
        key: 'redes',
        titulo: 'Redes sociales',
        resumen: 'red',
        fija: true,
        help: 'Pega el enlace de cada red que uses. Las que dejes vacías no aparecen. Se muestran con su logo en la bio y en el pie de página.',
        fields: [
          { key: 'red', label: 'Red', type: 'readonly' },
          { key: 'url', label: 'Enlace', type: 'url' },
        ],
      },
    ],
  },
  {
    id: 'contratacion',
    bloque: 'config',
    titulo: 'Contratación',
    icono: Handshake,
    grupos: [
      {
        grupo: 'contratacion',
        fields: cabecera([
          { key: 'texto', label: 'Texto', type: 'textarea' },
          { key: 'whatsapp', label: 'WhatsApp (con código de país)', help: 'Ej. 5491112345678.' },
          { key: 'mensajeWhatsapp', label: 'Mensaje prellenado de WhatsApp' },
          { key: 'botonFlotante', label: 'Mostrar botón flotante de WhatsApp', type: 'bool', help: 'El círculo verde fijo en la esquina de la web. Solo aparece si hay número de WhatsApp.' },
          { key: 'boton', label: 'Texto del botón de WhatsApp' },
          { key: 'email', label: 'Email de contacto (opcional)' },
          { key: 'formularioActivo', label: 'Mostrar formulario de solicitud', type: 'bool' },
          { key: 'formularioTitulo', label: 'Título del formulario' },
          { key: 'formularioGracias', label: 'Mensaje tras enviar' },
          { key: 'fondo', label: 'Foto de fondo (efecto fijo)', type: 'image', help: 'Queda quieta detrás de la sección y se va descubriendo al hacer scroll. Mejor una foto horizontal y oscura; se oscurece sola. Sin foto, se usa el fondo de colores.' },
        ]),
      },
    ],
    listas: [{ key: 'beneficios', titulo: 'Puntos fuertes', resumen: 'texto', fields: [{ key: 'texto', label: 'Texto' }] }],
  },
]
