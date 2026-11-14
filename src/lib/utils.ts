import type { Ajustes } from '../types'

export function youtubeId(input: string): string {
  const s = (input || '').trim()
  if (/^[\w-]{11}$/.test(s)) return s
  const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/)
  return m ? m[1] : ''
}

export function spotifyEmbed(input: string): string {
  const m = (input || '').match(/open\.spotify\.com\/(?:intl-\w+\/)?(artist|album|playlist|track)\/([A-Za-z0-9]+)/)
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?theme=0` : ''
}

export function whatsappLink(numero: string, mensaje: string): string {
  const n = (numero || '').replace(/\D/g, '')
  if (!n) return ''
  return `https://wa.me/${n}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`
}

export function textoAnio(t: string) {
  return (t || '').replace(/\{año\}/gi, String(new Date().getFullYear()))
}

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

/** Acepta AAAA-MM-DD o DD/MM/AAAA. */
export function parseFecha(s: string): Date | null {
  const t = (s || '').trim()
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3])
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return new Date(+m[3], +m[2] - 1, +m[1])
  return null
}

export function diaMes(d: Date) {
  return { dia: String(d.getDate()).padStart(2, '0'), mes: MESES[d.getMonth()] }
}

/** Aplica colores, radio y fuentes del tema como variables CSS. */
export function aplicarTema(tema: Ajustes['tema']) {
  const r = document.documentElement.style
  r.setProperty('--bg', tema.fondo)
  r.setProperty('--surface', tema.superficie)
  r.setProperty('--text', tema.texto)
  r.setProperty('--muted', tema.textoSuave)
  r.setProperty('--accent', tema.acento)
  r.setProperty('--accent2', tema.acento2)
  r.setProperty('--radius', `${tema.radio}px`)
  r.setProperty('--font-display', `'${tema.fuenteTitulos}', system-ui, sans-serif`)
  r.setProperty('--font-body', `'${tema.fuenteTexto}', system-ui, sans-serif`)

  const familias = [...new Set([tema.fuenteTitulos, tema.fuenteTexto].filter(Boolean))]
  const href =
    'https://fonts.googleapis.com/css2?' +
    familias.map((f) => `family=${encodeURIComponent(f)}:wght@300;400;600;800;900`).join('&') +
    '&display=swap'
  let link = document.getElementById('theme-fonts') as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = 'theme-fonts'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  if (link.href !== href) link.href = href
}

export function aplicarSeo(seo: Ajustes['seo']) {
  if (seo.titulo) document.title = seo.titulo
  const setMeta = (attr: string, name: string, content: string) => {
    if (!content) return
    let el = document.head.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute(attr, name)
      document.head.appendChild(el)
    }
    el.content = content
  }
  setMeta('name', 'description', seo.descripcion)
  setMeta('property', 'og:title', seo.titulo)
  setMeta('property', 'og:description', seo.descripcion)
  setMeta('property', 'og:image', seo.imagen)
}
