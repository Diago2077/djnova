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

export const IconoDescarga = (p: P) => (
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
