// Modelo de datos de toda la web. Todo lo que aparece en la web pública sale de aquí
// y se edita desde /admin. En Google Sheets, `ajustes` se guarda como una pestaña
// clave/valor y cada lista como una pestaña con una fila por elemento.

export interface Ajustes {
  marca: { nombre: string; apodo: string; logo: string; eslogan: string }
  tema: {
    fondo: string
    superficie: string
    texto: string
    textoSuave: string
    acento: string
    acento2: string
    fuenteTitulos: string
    fuenteTexto: string
    radio: number
    particulas: boolean
  }
  entrada: { activa: boolean; boton: string; aviso: string; musica: string }
  hero: { video: string; imagen: string; titulo: string; ctaPrimario: string; ctaSecundario: string }
  envivo: { etiqueta: string; titulo: string; texto: string; youtube: string }
  alcance: { etiqueta: string; titulo: string; texto: string }
  agenda: { etiqueta: string; titulo: string; vacio: string }
  spotify: { etiqueta: string; titulo: string; url: string }
  galeria: { etiqueta: string; titulo: string }
  bio: { etiqueta: string; titulo: string; texto: string; foto: string }
  contratacion: {
    etiqueta: string
    titulo: string
    texto: string
    boton: string
    whatsapp: string
    mensajeWhatsapp: string
    botonFlotante: boolean
    email: string
    formularioActivo: boolean
    formularioTitulo: string
    formularioGracias: string
    fondo: string
  }
  instagram: { etiqueta: string; feed: string; usuario: string; descripcion: string; seguidores: string }
  presskit: { etiqueta: string; titulo: string; boton: string; url: string; fondo: string }
  footer: { texto: string }
  seo: { titulo: string; descripcion: string; imagen: string }
}

export type SeccionId =
  | 'numeros'
  | 'envivo'
  | 'alcance'
  | 'agenda'
  | 'spotify'
  | 'galeria'
  | 'bio'
  | 'contratacion'
  | 'instagram'
  | 'presskit'

export interface Seccion { id: SeccionId; menu: string; visible: boolean; enMenu: boolean; orden: number }
export interface Numero { numero: number; prefijo: string; etiqueta: string }
export interface Pais { bandera: string; nombre: string; regiones: string; ciudades: string }
export interface Barra { etiqueta: string; porcentaje: number }
export interface Show { fecha: string; lugar: string; ciudad: string; estado: string; entradas: string }
export interface Video { youtube: string; titulo: string }
export interface Foto { imagen: string; descripcion: string }
export interface FotoTira { imagen: string }
export interface Red { red: string; url: string }
export interface Beneficio { texto: string }

export interface Listas {
  secciones: Seccion[]
  numeros: Numero[]
  paises: Pais[]
  barras: Barra[]
  agenda: Show[]
  videos: Video[]
  galeria: Foto[]
  tira: FotoTira[]
  redes: Red[]
  beneficios: Beneficio[]
}

export type ListaKey = keyof Listas

export interface SiteConfig extends Listas {
  ajustes: Ajustes
}

/** Fila de la pestaña "contrataciones" (solo visible en /admin). */
export interface Contratacion {
  id: string
  recibido: string
  nombre: string
  contacto: string
  fechaEvento: string
  ciudad: string
  evento: string
  mensaje: string
  estado: string
}

/** Forma en que viaja la configuración hacia/desde Google Sheets. */
export type Tablas = Record<string, Record<string, unknown>[]>
