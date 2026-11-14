// Instagram automático con Behold (https://behold.so): conectas la cuenta profesional
// de Instagram allí, Behold publica un feed JSON y la web lo lee en cada visita.
// Instagram no ofrece una API pública sin cuenta/aplicación, por eso se usa este servicio.
import { useEffect, useState } from 'react'

export interface IgPost {
  id: string
  permalink: string
  tipo: string // IMAGE | VIDEO | CAROUSEL_ALBUM
  texto: string
  imagen: string
}

export interface IgPerfil {
  usuario: string
  bio: string
  foto: string
  seguidores: number | null
  posts: IgPost[]
}

/** Acepta el ID del feed o su enlace (https://feeds.behold.so/ID). Devuelve '' si no es válido. */
export function feedId(valor: string): string {
  const v = (valor || '').trim()
  const m = /^(?:https?:\/\/feeds\.behold\.so\/)?([A-Za-z0-9]{10,40})\/?$/.exec(v)
  return m ? m[1] : ''
}

interface FeedPost {
  id?: string
  permalink?: string
  mediaType?: string
  caption?: string
  mediaUrl?: string
  thumbnailUrl?: string
  sizes?: Record<string, { mediaUrl?: string } | undefined>
}

function normalizar(j: Record<string, unknown>): IgPerfil {
  const posts = ((j.posts as FeedPost[] | undefined) ?? []).slice(0, 6).map((p, i) => ({
    id: p.id ?? String(i),
    permalink: p.permalink ?? '',
    tipo: p.mediaType ?? 'IMAGE',
    texto: p.caption ?? '',
    // Las miniaturas de Behold (sizes) son estables; las URLs de Instagram caducan.
    imagen: p.sizes?.medium?.mediaUrl || p.sizes?.small?.mediaUrl || p.thumbnailUrl || p.mediaUrl || '',
  }))
  return {
    usuario: String(j.username ?? ''),
    bio: String(j.biography ?? ''),
    foto: String(j.profilePictureUrl ?? ''),
    seguidores: typeof j.followersCount === 'number' ? j.followersCount : null,
    posts: posts.filter((p) => p.imagen && p.permalink),
  }
}

const cache = new Map<string, Promise<IgPerfil>>()

function cargar(id: string): Promise<IgPerfil> {
  let p = cache.get(id)
  if (!p) {
    p = fetch(`https://feeds.behold.so/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Behold ${r.status}`))))
      .then(normalizar)
      .catch((e) => {
        cache.delete(id) // permitir reintentar en la siguiente visita
        throw e
      })
    cache.set(id, p)
  }
  return p
}

/** Perfil y últimos posts del feed. `estado`: sin feed, cargando, listo o error. */
export function useInstagram(valor: string) {
  const id = feedId(valor)
  const [datos, setDatos] = useState<{ id: string; perfil: IgPerfil } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    let vivo = true
    cargar(id)
      .then((perfil) => vivo && (setDatos({ id, perfil }), setError('')))
      .catch(() => vivo && setError(id))
    return () => {
      vivo = false
    }
  }, [id])

  const perfil = datos?.id === id ? datos.perfil : null
  const estado = !id ? 'sin-feed' : perfil ? 'listo' : error === id ? 'error' : 'cargando'
  return { perfil, estado } as const
}

export function formatoSeguidores(n: number): string {
  return new Intl.NumberFormat('es', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}
