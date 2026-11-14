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
  Paperclip,
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

export interface GrupoDef {
  grupo: keyof Ajustes
  titulo?: string
  fields: FieldDef[]
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

export interface Panel {
  id: string
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
    id: 'identidad',
    titulo: 'Identidad y SEO',
    icono: UserRound,
    descripcion: 'Tu nombre artístico, logo y cómo aparece la web en Google y al compartirla.',
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
    ],
  },
  {
    id: 'tema',
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
    titulo: 'Secciones y menú',
    icono: LayoutList,
    descripcion: 'Activa, oculta y reordena las secciones. El texto de menú vacío las oculta del menú pero no de la página.',
    listas: [
      {
        key: 'secciones',
        titulo: 'Secciones',
        resumen: 'menu',
        fija: true,
        fields: [
          { key: 'id', label: 'Sección', type: 'readonly' },
          { key: 'menu', label: 'Texto en el menú' },
          { key: 'visible', label: 'Visible', type: 'bool' },
        ],
      },
    ],
  },
  {
    id: 'numeros',
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
    id: 'envivo',
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
    titulo: 'Mapa / alcance',
    icono: Globe,
    grupos: [{ grupo: 'alcance', fields: cabecera([{ key: 'texto', label: 'Texto', type: 'textarea' }]) }],
    listas: [
      {
        key: 'paises',
        titulo: 'Países',
        resumen: 'nombre',
        fields: [
          { key: 'bandera', label: 'Bandera (emoji)' },
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
    id: 'agenda',
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
    id: 'spotify',
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
    id: 'galeria',
    titulo: 'Galería',
    icono: Images,
    grupos: [{ grupo: 'galeria', fields: cabecera() }],
    listas: [
      {
        key: 'galeria',
        titulo: 'Fotos',
        resumen: 'descripcion',
        fields: [
          { key: 'imagen', label: 'Foto', type: 'image' },
          { key: 'descripcion', label: 'Descripción (opcional)' },
        ],
      },
    ],
  },
  {
    id: 'bio',
    titulo: 'Bio y redes',
    icono: FileText,
    grupos: [
      {
        grupo: 'bio',
        fields: cabecera([
          { key: 'texto', label: 'Biografía', type: 'textarea', help: 'Deja una línea en blanco entre párrafos.' },
          { key: 'foto', label: 'Foto', type: 'image' },
        ]),
      },
    ],
    listas: [
      {
        key: 'redes',
        titulo: 'Redes sociales',
        resumen: 'red',
        help: 'Se muestran en la bio y en el pie de página.',
        fields: [
          { key: 'red', label: 'Nombre' },
          { key: 'url', label: 'Enlace', type: 'url' },
        ],
      },
    ],
  },
  {
    id: 'contratacion',
    titulo: 'Contratación',
    icono: Handshake,
    grupos: [
      {
        grupo: 'contratacion',
        fields: cabecera([
          { key: 'texto', label: 'Texto', type: 'textarea' },
          { key: 'whatsapp', label: 'WhatsApp (con código de país)', help: 'Ej. 5491112345678. Activa también el botón flotante.' },
          { key: 'mensajeWhatsapp', label: 'Mensaje prellenado de WhatsApp' },
          { key: 'boton', label: 'Texto del botón de WhatsApp' },
          { key: 'email', label: 'Email de contacto (opcional)' },
          { key: 'formularioActivo', label: 'Mostrar formulario de solicitud', type: 'bool' },
          { key: 'formularioTitulo', label: 'Título del formulario' },
          { key: 'formularioGracias', label: 'Mensaje tras enviar' },
        ]),
      },
    ],
    listas: [{ key: 'beneficios', titulo: 'Puntos fuertes', resumen: 'texto', fields: [{ key: 'texto', label: 'Texto' }] }],
  },
  {
    id: 'extras',
    titulo: 'Instagram, presskit y pie',
    icono: Paperclip,
    grupos: [
      {
        grupo: 'instagram',
        titulo: 'Instagram',
        fields: [
          { key: 'etiqueta', label: 'Etiqueta superior' },
          { key: 'usuario', label: 'Usuario (sin @)' },
          { key: 'descripcion', label: 'Descripción' },
          { key: 'seguidores', label: 'Seguidores (texto, ej. 8,4K)' },
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
        ],
      },
      { grupo: 'footer', titulo: 'Pie de página', fields: [{ key: 'texto', label: 'Texto', help: '{año} se reemplaza por el año actual.' }] },
    ],
  },
]
