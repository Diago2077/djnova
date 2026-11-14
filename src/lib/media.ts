// Audio y video subidos desde el /admin.
//
// Drive no permite usar sus enlaces como fuente de <audio>/<video> desde otra
// web (devuelve una página, no el archivo). Por eso, si la URL es de un archivo
// de Drive subido por la app, se pide por trozos al Apps Script (acción pública
// getArchivo) y se reproduce desde un blob local. Cualquier otra URL (MP4 externo,
// etc.) se usa tal cual.
import { useEffect, useState } from 'react'
import { DEMO, post } from './api'

const DRIVE = /drive\.google\.com\/uc\?export=download&id=([\w-]+)/
const EN_PARALELO = 3

interface Trozo {
  mime: string
  partes: number
  base64: string
}

const cache = new Map<string, Promise<string>>()

function driveId(url: string): string | null {
  return DEMO ? null : (DRIVE.exec(url)?.[1] ?? null)
}

function aBytes(base64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(base64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function descargar(driveId: string): Promise<string> {
  const pedir = (parte: number) => post<Trozo>({ action: 'getArchivo', driveId, parte })
  const primero = await pedir(0)
  const trozos: Uint8Array<ArrayBuffer>[] = new Array(primero.partes)
  trozos[0] = aBytes(primero.base64)

  let siguiente = 1
  async function worker() {
    while (siguiente < primero.partes) {
      const n = siguiente++
      trozos[n] = aBytes((await pedir(n)).base64)
    }
  }
  await Promise.all(Array.from({ length: Math.min(EN_PARALELO, primero.partes - 1) }, worker))

  return URL.createObjectURL(new Blob(trozos, { type: primero.mime }))
}

/** URL reproducible del archivo (descarga una sola vez por sesión). */
export function cargarMedia(url: string): Promise<string> {
  const id = driveId(url)
  if (!id) return Promise.resolve(url)
  let p = cache.get(id)
  if (!p) {
    p = descargar(id).catch((e) => {
      cache.delete(id) // permitir reintentar
      console.warn('No se pudo cargar el archivo', e)
      return ''
    })
    cache.set(id, p)
  }
  return p
}

/** Como cargarMedia para componentes: devuelve '' mientras se descarga (o si falló). */
export function useMedia(url: string): string {
  const [src, setSrc] = useState(() => (url && !driveId(url) ? url : ''))
  useEffect(() => {
    let vivo = true
    if (!url) setSrc('')
    else if (!driveId(url)) setSrc(url)
    else {
      setSrc('')
      cargarMedia(url).then((s) => vivo && setSrc(s))
    }
    return () => {
      vivo = false
    }
  }, [url])
  return src
}
