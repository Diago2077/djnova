import type { Listas, SiteConfig } from './types'

// Contenido de ejemplo. Se usa en modo demo y como respaldo para cualquier campo
// que todavía no exista en la hoja de cálculo.
export const DEFAULT_CONFIG: SiteConfig = {
  ajustes: {
    marca: {
      nombre: 'TU NOMBRE',
      apodo: 'La energía de la pista',
      logo: '',
      eslogan: 'La energía que llena pistas',
    },
    tema: {
      fondo: '#09090b',
      superficie: '#141417',
      texto: '#ffffff',
      textoSuave: '#8a8a93',
      acento: '#ff3d7f',
      acento2: '#7b5cff',
      fuenteTitulos: 'Outfit',
      fuenteTexto: 'Inter',
      radio: 16,
      particulas: true,
    },
    entrada: {
      activa: true,
      boton: 'Entrar a la experiencia',
      aviso: 'Activa el sonido para vivirlo mejor',
      musica: '',
    },
    hero: {
      video: '',
      imagen: '',
      titulo: 'La energía que *llena pistas*',
      ctaPrimario: 'Quiero una fecha',
      ctaSecundario: 'Ver show en vivo',
    },
    envivo: {
      etiqueta: 'Experiencia',
      titulo: 'Siente la energía *en vivo*',
      texto: 'Cada show es una experiencia única.',
      youtube: '',
    },
    alcance: {
      etiqueta: 'Alcance',
      titulo: 'Dónde ya *toqué*',
      texto: 'Presencia en varios países de Latinoamérica',
    },
    agenda: { etiqueta: 'Próximos shows', titulo: 'Agenda *2026*', vacio: 'Pronto anunciaremos nuevas fechas.' },
    spotify: { etiqueta: 'Escucha ahora', titulo: 'En *Spotify*', url: '' },
    galeria: { etiqueta: 'Galería', titulo: '*Momentos*' },
    bio: {
      etiqueta: 'Sobre mí',
      titulo: 'Quién es *TU NOMBRE*',
      texto:
        'TU NOMBRE es un artista open format reconocido por la energía en el escenario y la conexión con el público.\n\nCada show está pensado como una experiencia completa: pista llena, producción impecable y una atmósfera inolvidable.',
      foto: '',
    },
    contratacion: {
      etiqueta: 'Contratación',
      titulo: 'Lleva el show a *tu evento*',
      texto: '',
      boton: 'Quiero cerrar una fecha',
      whatsapp: '',
      mensajeWhatsapp: 'Hola, quiero consultar una fecha',
      email: '',
      formularioActivo: true,
      formularioTitulo: 'Solicita tu fecha',
      formularioGracias: '¡Gracias! Te contactaremos muy pronto.',
    },
    instagram: { etiqueta: 'Backstage', feed: '', usuario: '', descripcion: '', seguidores: '' },
    presskit: { etiqueta: 'Para productores', titulo: 'Presskit', boton: 'Descargar presskit', url: '' },
    footer: { texto: '© {año} TU NOMBRE — Todos los derechos reservados' },
    seo: {
      titulo: 'TU NOMBRE — La energía que llena pistas',
      descripcion: 'Shows que llenan pistas. Contrata ahora.',
      imagen: '',
    },
  },
  secciones: [
    { id: 'numeros', menu: 'Números', visible: true, orden: 1 },
    { id: 'envivo', menu: 'En vivo', visible: true, orden: 2 },
    { id: 'alcance', menu: 'Mapa', visible: true, orden: 3 },
    { id: 'agenda', menu: 'Agenda', visible: true, orden: 4 },
    { id: 'spotify', menu: 'Música', visible: true, orden: 5 },
    { id: 'galeria', menu: 'Galería', visible: true, orden: 6 },
    { id: 'bio', menu: 'Bio', visible: true, orden: 7 },
    { id: 'contratacion', menu: 'Contratar', visible: true, orden: 8 },
    { id: 'instagram', menu: 'Instagram', visible: true, orden: 9 },
    { id: 'presskit', menu: 'Presskit', visible: true, orden: 10 },
  ],
  numeros: [
    { numero: 100, prefijo: '+', etiqueta: 'Clubs' },
    { numero: 60, prefijo: '+', etiqueta: 'Ciudades' },
    { numero: 3, prefijo: '', etiqueta: 'Países' },
    { numero: 500, prefijo: '+', etiqueta: 'Shows' },
  ],
  paises: [
    { bandera: 'AR', nombre: 'Argentina', regiones: 'Buenos Aires · Córdoba · Rosario', ciudades: '+30 ciudades' },
    { bandera: 'UY', nombre: 'Uruguay', regiones: 'Montevideo · Punta del Este', ciudades: '+10 ciudades' },
    { bandera: 'CL', nombre: 'Chile', regiones: 'Santiago · Viña del Mar', ciudades: '+10 ciudades' },
  ],
  barras: [
    { etiqueta: 'Cobertura nacional', porcentaje: 85 },
    { etiqueta: 'Expansión internacional', porcentaje: 40 },
  ],
  agenda: [
    { fecha: '2026-12-05', lugar: 'Club Ejemplo', ciudad: 'Buenos Aires', estado: 'Confirmado', entradas: '' },
    { fecha: '2026-12-12', lugar: 'Fiesta de Fin de Año', ciudad: 'Rosario', estado: 'Confirmado', entradas: '' },
    { fecha: '2026-12-31', lugar: 'Año Nuevo Open Air', ciudad: 'Punta del Este', estado: 'Últimas entradas', entradas: '' },
  ],
  videos: [],
  galeria: [
    { imagen: 'https://picsum.photos/seed/dj1/800/1000', descripcion: '' },
    { imagen: 'https://picsum.photos/seed/dj2/800/600', descripcion: '' },
    { imagen: 'https://picsum.photos/seed/dj3/800/1000', descripcion: '' },
    { imagen: 'https://picsum.photos/seed/dj4/800/600', descripcion: '' },
    { imagen: 'https://picsum.photos/seed/dj5/800/1000', descripcion: '' },
    { imagen: 'https://picsum.photos/seed/dj6/800/600', descripcion: '' },
  ],
  redes: [
    { red: 'Instagram', url: '' },
    { red: 'YouTube', url: '' },
    { red: 'Spotify', url: '' },
    { red: 'TikTok', url: '' },
  ],
  beneficios: [
    { texto: 'Show con impacto real' },
    { texto: 'Público enganchado de principio a fin' },
    { texto: 'Contenido que se viraliza en redes' },
    { texto: 'Profesionalismo y puntualidad' },
  ],
}

/** Un elemento vacío por lista: define columnas y tipos de cada pestaña. */
export const LIST_TEMPLATES: { [K in keyof Listas]: Listas[K][number] } = {
  secciones: { id: 'numeros', menu: '', visible: true, orden: 0 },
  numeros: { numero: 0, prefijo: '', etiqueta: '' },
  paises: { bandera: '', nombre: '', regiones: '', ciudades: '' },
  barras: { etiqueta: '', porcentaje: 0 },
  agenda: { fecha: '', lugar: '', ciudad: '', estado: 'Confirmado', entradas: '' },
  videos: { youtube: '', titulo: '' },
  galeria: { imagen: '', descripcion: '' },
  redes: { red: '', url: '' },
  beneficios: { texto: '' },
}

export const LIST_KEYS = Object.keys(LIST_TEMPLATES) as (keyof Listas)[]
