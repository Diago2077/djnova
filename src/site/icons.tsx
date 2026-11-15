// Iconos de la web pública: SVG en línea (no dependen de la fuente de emojis del
// sistema, así se ven igual en Windows, Android e iOS). Heredan el color del texto
// (currentColor) y miden 1em salvo que se indique otro tamaño con CSS.
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

function Icono({ children, ...p }: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="icono"
      {...p}
    >
      {children}
    </svg>
  )
}

export const IconoPlay = (p: P) => (
  <Icono {...p} fill="currentColor" stroke="none">
    <path d="M7 4.6v14.8a1 1 0 0 0 1.5.86l12-7.4a1 1 0 0 0 0-1.72l-12-7.4A1 1 0 0 0 7 4.6Z" />
  </Icono>
)

export const IconoChat = (p: P) => (
  <Icono {...p}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
  </Icono>
)

export const IconoDescarga =(p: P) => (
  <Icono {...p}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M4 20h16" />
  </Icono>
)

export const IconoCerrar = (p: P) => (
  <Icono {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Icono>
)

export const IconoSonido = (p: P) => (
  <Icono {...p}>
    <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.4 5.6a9 9 0 0 1 0 12.8" />
  </Icono>
)

export const IconoSilencio = (p: P) => (
  <Icono {...p}>
    <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
    <path d="m16 9 6 6" />
    <path d="m22 9-6 6" />
  </Icono>
)

export const IconoAuriculares = (p: P) => (
  <Icono {...p}>
    <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
    <path d="M4 15h2.5a1.5 1.5 0 0 1 1.5 1.5v2A1.5 1.5 0 0 1 6.5 20H5a1 1 0 0 1-1-1v-4Z" fill="currentColor" />
    <path d="M20 15h-2.5a1.5 1.5 0 0 0-1.5 1.5v2a1.5 1.5 0 0 0 1.5 1.5H19a1 1 0 0 0 1-1v-4Z" fill="currentColor" />
  </Icono>
)

/** Bandera como imagen SVG (flagcdn.com) a partir de un código de país («AR») o de un emoji de bandera. */
export function codigoPais(valor: string): string {
  const v = (valor || '').trim()
  if (/^[a-z]{2}$/i.test(v)) return v.toLowerCase()
  // Un emoji de bandera son dos «indicadores regionales» (U+1F1E6–U+1F1FF) = dos letras.
  const letras = [...v].map((c) => c.codePointAt(0)!).filter((cp) => cp >= 0x1f1e6 && cp <= 0x1f1ff)
  return letras.length === 2 ? letras.map((cp) => String.fromCharCode(cp - 0x1f1e6 + 97)).join('') : ''
}

export function Bandera({ valor, nombre }: { valor: string; nombre?: string }) {
  const codigo = codigoPais(valor)
  if (!codigo) return valor ? <span>{valor}</span> : null
  return (
    <img
      className="bandera"
      src={`https://flagcdn.com/${codigo}.svg`}
      alt={nombre ? `Bandera de ${nombre}` : ''}
      loading="lazy"
      decoding="async"
    />
  )
}

/** Quita un emoji suelto del principio de un texto editable (p. ej. «🎧 Activa el sonido»). */
export function sinEmojiInicial(texto: string): string {
  return (texto || '').replace(/^[\p{Extended_Pictographic}️‍\s]+/u, '')
}

/** Logo de cada red social (ver REDES_FIJAS en defaults.ts). */
export function IconoRed({ red, ...p }: P & { red: string }) {
  switch (red) {
    case 'Instagram':
      return (
        <Icono {...p}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
        </Icono>
      )
    case 'YouTube':
      return (
        <Icono {...p}>
          <rect x="2.5" y="5" width="19" height="14" rx="4" />
          <path d="m10 9.2 5 2.8-5 2.8Z" fill="currentColor" />
        </Icono>
      )
    case 'Spotify':
      return (
        <Icono {...p}>
          <circle cx="12" cy="12" r="9.5" />
          <path d="M7 9.4c3.4-1 7-.7 10 1" />
          <path d="M7.6 12.6c2.8-.8 5.6-.5 8 .9" />
          <path d="M8.3 15.6c2.2-.6 4.4-.4 6.2.6" />
        </Icono>
      )
    case 'TikTok':
      return (
        <Icono {...p}>
          <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
          <path d="M14 3c.4 2.6 2 4.2 5 4.5" />
        </Icono>
      )
    case 'Facebook':
      return (
        <Icono {...p}>
          <path d="M17.5 3h-2.7A4.8 4.8 0 0 0 10 7.8V10H7v4h3v7h4v-7h3l.8-4H14V7.8c0-.5.4-.8.8-.8h2.7Z" />
        </Icono>
      )
    case 'X':
      return (
        <Icono {...p}>
          <path d="M4 4l16 16" />
          <path d="M20 4 4 20" />
        </Icono>
      )
    case 'SoundCloud':
      return (
        <Icono {...p}>
          <path d="M3 15v3" />
          <path d="M5.8 13v5" />
          <path d="M8.6 11.5V18" />
          <path d="M11.4 9.5V18h7.1a3.2 3.2 0 0 0 .4-6.4A5.6 5.6 0 0 0 11.4 9.5Z" />
        </Icono>
      )
    default:
      return (
        <Icono {...p}>
          <circle cx="12" cy="12" r="9.5" />
          <path d="M2.5 12h19" />
          <path d="M12 2.5c2.6 2.8 2.6 16.2 0 19" />
          <path d="M12 2.5c-2.6 2.8-2.6 16.2 0 19" />
        </Icono>
      )
  }
}
