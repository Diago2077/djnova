// Función de Vercel: GET /api/media?id=<id de Drive>
//
// Drive no deja usar sus enlaces como fuente de <audio>/<video> desde el navegador,
// pero sí responde (con soporte de rangos) a una petición desde un servidor. Esta
// función hace de intermediario: el navegador pide rangos de /api/media y se los
// reenvía a Drive, así el audio y el video empiezan a sonar al instante y se pueden
// adelantar/atrasar.
//
// Solo sirve archivos que aparecen en el contenido publicado de la web (los lee del
// Apps Script con VITE_API_URL), no cualquier archivo de Drive.

import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const ID =/^[\w-]{10,100}$/

let permitidos = { ids: new Set(), hasta: 0 }

async function idsPermitidos(forzar) {
  const ahora = Date.now()
  if (!forzar && ahora < permitidos.hasta) return permitidos.ids
  const api = (process.env.VITE_API_URL || '').trim()
  if (!api) throw new Error('Falta VITE_API_URL en Vercel.')
  const r = await fetch(api, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'getSitio' }),
  })
  const j = await r.json()
  const texto = JSON.stringify(j.tablas || {})
  const ids = new Set([...texto.matchAll(/drive\.google\.com\/uc\?export=download&id=([\w-]+)/g)].map((m) => m[1]))
  permitidos = { ids, hasta: ahora + 5 * 60 * 1000 }
  return ids
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end()
    const id = String(req.query.id || '')
    if (!ID.test(id)) return res.status(400).send('id inválido')

    let ids = await idsPermitidos(false)
    if (!ids.has(id)) ids = await idsPermitidos(true) // quizá se publicó hace poco
    if (!ids.has(id)) return res.status(404).send('Archivo no disponible')

    // Rango pedido por el navegador (sin Range = desde el principio hasta el final).
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''))
    const inicio = m && m[1] !== '' ? Number(m[1]) : 0
    const rango = m && m[2] !== '' ? `bytes=${inicio}-${Number(m[2])}` : `bytes=${inicio}-`

    // Si el visitante se va (o salta de posición) se corta también la descarga de Drive.
    const corte = new AbortController()
    res.on('close', () => corte.abort())

    const drive = await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`, {
      headers: { Range: rango },
      signal: corte.signal,
    })
    const tipo = drive.headers.get('content-type') || ''
    if (drive.status === 416) return res.status(416).setHeader('Content-Range', drive.headers.get('content-range') || '*').end()
    if (drive.status !== 206 || /text\/html/i.test(tipo) || !drive.body) {
      return res.status(502).send('Drive no entregó el archivo (¿está compartido con «cualquiera con el enlace»?)')
    }

    res.status(206)
    res.setHeader('Content-Type', tipo)
    res.setHeader('Content-Range', drive.headers.get('content-range') || '')
    if (drive.headers.get('content-length')) res.setHeader('Content-Length', drive.headers.get('content-length'))
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.setHeader('X-Content-Type-Options', 'nosniff')

    if (req.method === 'HEAD') {
      corte.abort()
      return res.end()
    }
    // Streaming: el navegador empieza a reproducir con los primeros bytes, sin esperar
    // a que se descargue el archivo y sin el tope de 4,5 MB de las respuestas no streaming.
    await pipeline(Readable.fromWeb(drive.body), res)
  } catch (e) {
    if (res.headersSent) return res.end() // cortado a mitad (el visitante se fue): nada que responder
    return res.status(500).send(String((e && e.message) || e))
  }
}
