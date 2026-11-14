const KEY = 'djnova:admin-modo'
export type Modo = 'claro' | 'oscuro'

function guardado(): Modo | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'claro' || v === 'oscuro' ? v : null
  } catch {
    return null
  }
}

export function modoActual(): Modo {
  return guardado() ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro')
}

export function aplicarModo(m: Modo) {
  document.documentElement.classList.toggle('dark', m === 'oscuro')
  try {
    localStorage.setItem(KEY, m)
  } catch {
    /* noop */
  }
}

/** Sin preferencia guardada sigue al sistema operativo. */
export function aplicarModoInicial() {
  document.documentElement.classList.toggle('dark', modoActual() === 'oscuro')
}
