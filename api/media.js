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

const TROZO_MAX = 4 * 1024 * 1024 // por debajo del límite de 4,5 MB de una respuesta de Vercel
const ID = /^[\w-]{10,100}$/

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

    // Rango pedido por el navegador (sin Range = desde el principio), recortado a TROZO_MAX.
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''))
    const inicio = m && m[1] !== '' ? Number(m[1]) : 0
    const pedidoFin = m && m[2] !== '' ? Number(m[2]) : Infinity
    const fin = Math.min(pedidoFin, inicio + TROZO_MAX - 1)

    const drive = await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`, {
      headers: { Range: `bytes=${inicio}-${fin}` },
    })
    const tipo = drive.headers.get('content-type') || ''
    if (drive.status === 416) return res.status(416).setHeader('Content-Range', drive.headers.get('content-range') || '*').end()
    if (drive.status !== 206 || /text\/html/i.test(tipo)) {
      return res.status(502).send('Drive no entregó el archivo (¿está compartido con «cualquiera con el enlace»?)')
    }

    const cuerpo = Buffer.from(await drive.arrayBuffer())
    res.status(206)
    res.setHeader('Content-Type', tipo)
    res.setHeader('Content-Range', drive.headers.get('content-range') || `bytes ${inicio}-${inicio + cuerpo.length - 1}/*`)
    res.setHeader('Content-Length', String(cuerpo.length))
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    return res.end(req.method === 'HEAD' ? undefined : cuerpo)
  } catch (e) {
    return res.status(500).send(String((e && e.message) || e))
  }
}
