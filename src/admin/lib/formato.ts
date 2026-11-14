export function fechaHora(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })
}

/** Minúsculas y sin acentos, para buscar. */
export function normalizar(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}
