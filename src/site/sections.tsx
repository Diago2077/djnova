import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { enviarContratacion } from '../lib/api'
import { formatoSeguidores, useInstagram } from '../lib/instagram'
import { useMedia } from '../lib/media'
import { Bandera, IconoCerrar, IconoDescarga, IconoPlay } from './icons'
import { diaMes, parseFecha, spotifyEmbed, textoAnio, whatsappLink, youtubeId } from '../lib/utils'
import type { Seccion, SiteConfig } from '../types'
import { Particulas } from './Particulas'

type P = { cfg: SiteConfig }

/** Muestra el texto entre *asteriscos* con el degradado de acento. */
function Destacado({ texto }: { texto: string }) {
  const partes = (texto || '').split(/\*(.+?)\*/g)
  return (
    <>
      {partes.map((p, i) => (i % 2 ? <span key={i} className="grad">{p}</span> : p))}
    </>
  )
}

function Cabecera({ etiqueta, titulo, texto }: { etiqueta?: string; titulo?: string; texto?: string }) {
  return (
    <header className="sec-head reveal">
      {etiqueta && <span className="eyebrow">{etiqueta}</span>}
      {titulo && (
        <h2>
          <Destacado texto={titulo} />
        </h2>
      )}
      {texto && <p className="lead">{texto}</p>}
    </header>
  )
}

function Seccion({ id, children, className = '' }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`section ${className}`}>
      <div className="container">{children}</div>
    </section>
  )
}

// ---------------------------------------------------------------- Nav
export function Nav({ cfg, secciones }: P & { secciones: Seccion[] }) {
  const [scrolled, setScrolled] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const { marca, contratacion } = cfg.ajustes

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  // Con el menú móvil abierto el fondo no debe moverse; Escape lo cierra.
  useEffect(() => {
    if (!abierto) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false)
    const ancho = () => window.innerWidth > 1180 && setAbierto(false) // ya no es menú móvil
    window.addEventListener('keydown', esc)
    window.addEventListener('resize', ancho)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', esc)
      window.removeEventListener('resize', ancho)
    }
  }, [abierto])

  const links = secciones.filter((s) => s.menu && s.id !== 'contratacion')
  const hayContratar = secciones.some((s) => s.id === 'contratacion')

  return (
    <nav className={`nav ${scrolled ? 'nav-solid' : ''} ${abierto ? 'nav-open' : ''}`}>
      <a href="#top" className="nav-brand" onClick={() => setAbierto(false)}>
        {marca.logo ? <img src={marca.logo} alt={marca.nombre} /> : <span>{marca.nombre}</span>}
      </a>
      <div className="nav-links">
        {links.map((s) => (
          <a key={s.id} href={`#${s.id}`} onClick={() => setAbierto(false)}>
            {s.menu}
          </a>
        ))}
        {hayContratar && (
          <a href="#contratacion" className="btn btn-accent btn-sm" onClick={() => setAbierto(false)}>
            {secciones.find((s) => s.id === 'contratacion')?.menu || contratacion.etiqueta}
          </a>
        )}
      </div>
      <button className="nav-toggle" onClick={() => setAbierto(!abierto)} aria-label="Menú" aria-expanded={abierto}>
        <span />
        <span />
        <span />
      </button>
    </nav>
  )
}

// ---------------------------------------------------------------- Hero
export function Hero({ cfg }: P) {
  const { marca, hero, tema } = cfg.ajustes
  const resumen = cfg.numeros
    .slice(0, 3)
    .map((n) => `${n.prefijo}${n.numero} ${n.etiqueta}`)
    .join(' · ')
  const bg = useRef<HTMLDivElement>(null)
  const video = useMedia(hero.video)

  useEffect(() => {
    const el = bg.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const tween = gsap.to(el, {
      yPercent: 20,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
    })
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [])

  return (
    <header id="top" className="hero">
      <div className="hero-bg" ref={bg}>
        {video.src ? (
          <video src={video.src} ref={video.ref} poster={hero.imagen || undefined} autoPlay muted loop playsInline />
        ) : hero.imagen ? (
          <img src={hero.imagen} alt="" />
        ) : (
          <div className="hero-fallback" />
        )}
      </div>
      <div className="hero-overlay" />
      {tema.particulas && <Particulas color={tema.acento} />}
      <div className="hero-content">
        {marca.logo ? (
          <img className="hero-logo" src={marca.logo} alt={marca.nombre} />
        ) : (
          <h1 className="hero-name">{marca.nombre}</h1>
        )}
        {hero.titulo && (
          <p className="hero-title">
            <Destacado texto={hero.titulo} />
          </p>
        )}
        {resumen && <p className="hero-stats">{resumen}</p>}
        <div className="hero-ctas">
          {hero.ctaPrimario && (
            <a href="#contratacion" className="btn btn-accent btn-pulse">
              {hero.ctaPrimario}
            </a>
          )}
          {hero.ctaSecundario && (
            <a href="#envivo" className="btn btn-ghost">
              <IconoPlay /> {hero.ctaSecundario}
            </a>
          )}
        </div>
      </div>
      <div className="hero-scroll">Scroll</div>
    </header>
  )
}

// ---------------------------------------------------------------- Números
function Contador({ valor, prefijo }: { valor: number; prefijo: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obj = { v: 0 }
    const tween = gsap.to(obj, {
      v: valor,
      duration: 2,
      ease: 'power2.out',
      onUpdate: () => (el.textContent = prefijo + Math.round(obj.v).toLocaleString('es')),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    })
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [valor, prefijo])
  return <span ref={ref}>{prefijo}0</span>
}

export function Numeros({ cfg }: P) {
  if (!cfg.numeros.length) return null
  return (
    <section id="numeros" className="numeros">
      <div className="container numeros-grid stagger">
        {cfg.numeros.map((n, i) => (
          <div key={i} className="numero">
            <strong>
              <Contador valor={n.numero} prefijo={n.prefijo} />
            </strong>
            <span>{n.etiqueta}</span>
          </div>
        ))}
      </div>
      {cfg.paises.length > 0 && (
        <p className="numeros-paises">
          {cfg.paises.map((p, i) => (
            <span key={i} className="numeros-pais">
              {p.nombre.toUpperCase()} <Bandera valor={p.bandera} />
            </span>
          ))}
        </p>
      )}
    </section>
  )
}

// ---------------------------------------------------------------- En vivo
function YouTube({ id, autoplay = false, titulo = '' }: { id: string; autoplay?: boolean; titulo?: string }) {
  const params = autoplay ? `?autoplay=1&mute=1&loop=1&playlist=${id}&playsinline=1&rel=0` : '?rel=0'
  return (
    <div className="video-frame">
      <iframe
        src={`https://www.youtube.com/embed/${id}${params}`}
        title={titulo || 'Video'}
        loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

export function EnVivo({ cfg }: P) {
  const a = cfg.ajustes.envivo
  const principal = youtubeId(a.youtube)
  const extras = cfg.videos.map((v) => ({ ...v, id: youtubeId(v.youtube) })).filter((v) => v.id)
  return (
    <Seccion id="envivo">
      <Cabecera etiqueta={a.etiqueta} titulo={a.titulo} texto={a.texto} />
      <div className="reveal">
        {principal ? (
          <YouTube id={principal} autoplay titulo={a.titulo} />
        ) : (
          <div className="video-frame video-empty">Añade el enlace de tu video de YouTube desde /admin</div>
        )}
      </div>
      {extras.length > 0 && (
        <div className="videos-grid stagger">
          {extras.map((v, i) => (
            <figure key={i}>
              <YouTube id={v.id} titulo={v.titulo} />
              {v.titulo && <figcaption>{v.titulo}</figcaption>}
            </figure>
          ))}
        </div>
      )}
    </Seccion>
  )
}

// ---------------------------------------------------------------- Alcance
export function Alcance({ cfg }: P) {
  const a = cfg.ajustes.alcance
  const barras = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = barras.current
    if (!el) return
    const fills = el.querySelectorAll<HTMLElement>('.bar-fill')
    const tween = gsap.fromTo(
      fills,
      { width: 0 },
      {
        width: (_i: number, t: HTMLElement) => t.dataset.w + '%',
        duration: 1.6,
        ease: 'power3.out',
        stagger: 0.2,
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      },
    )
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [cfg.barras])

  return (
    <Seccion id="alcance">
      <Cabecera etiqueta={a.etiqueta} titulo={a.titulo} texto={a.texto} />
      <div className="paises-grid stagger">
        {cfg.paises.map((p, i) => (
          <article key={i} className="card pais">
            <span className="pais-flag">
              <Bandera valor={p.bandera} nombre={p.nombre} />
            </span>
            <h3>{p.nombre}</h3>
            <p className="muted">{p.regiones}</p>
            <strong className="accent">{p.ciudades}</strong>
          </article>
        ))}
      </div>
      {cfg.barras.length > 0 && (
        <div className="barras" ref={barras}>
          {cfg.barras.map((b, i) => (
            <div key={i} className="barra">
              <span>{b.etiqueta}</span>
              <div className="bar-track">
                <div className="bar-fill" data-w={Math.max(0, Math.min(100, b.porcentaje))} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Seccion>
  )
}

// ---------------------------------------------------------------- Agenda
export function Agenda({ cfg }: P) {
  const a = cfg.ajustes.agenda
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  // Los shows de hoy siguen visibles hasta que termina el día.
  const shows = cfg.agenda
    .map((s) => ({ ...s, d: parseFecha(s.fecha) }))
    .filter((s): s is typeof s & { d: Date } => !!s.d && s.d >= hoy)
    .sort((x, y) => x.d.getTime() - y.d.getTime())

  return (
    <Seccion id="agenda">
      <Cabecera etiqueta={a.etiqueta} titulo={a.titulo} />
      {shows.length === 0 ? (
        <p className="empty reveal">{a.vacio}</p>
      ) : (
        <ol className="agenda stagger">
          {shows.map((s, i) => {
            const { dia, mes } = diaMes(s.d)
            return (
              <li key={i} className="show">
                <div className="show-date">
                  <strong>{dia}</strong>
                  <span>{mes}</span>
                </div>
                <div className="show-info">
                  <h3>{s.lugar}</h3>
                  <p className="muted">{s.ciudad}</p>
                </div>
                <div className="show-actions">
                  {s.estado && <span className="badge">{s.estado}</span>}
                  {s.entradas && (
                    <a className="btn btn-sm btn-ghost" href={s.entradas} target="_blank" rel="noreferrer">
                      Entradas
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </Seccion>
  )
}

// ---------------------------------------------------------------- Spotify
export function Spotify({ cfg }: P) {
  const a = cfg.ajustes.spotify
  const src = spotifyEmbed(a.url)
  if (!src) return null
  return (
    <Seccion id="spotify">
      <Cabecera etiqueta={a.etiqueta} titulo={a.titulo} />
      <iframe
        className="spotify reveal"
        src={src}
        title="Spotify"
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      />
    </Seccion>
  )
}

// ---------------------------------------------------------------- Galería
export function Galeria({ cfg }: P) {
  const a = cfg.ajustes.galeria
  const [abierta, setAbierta] = useState<number | null>(null)
  const fotos = cfg.galeria.filter((f) => f.imagen)

  useEffect(() => {
    if (abierta === null) return
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierta(null)
      if (e.key === 'ArrowRight') setAbierta((i) => (i! + 1) % fotos.length)
      if (e.key === 'ArrowLeft') setAbierta((i) => (i! - 1 + fotos.length) % fotos.length)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [abierta, fotos.length])

  function inclinar(e: React.MouseEvent<HTMLButtonElement>) {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) scale(1.02)`
  }

  if (!fotos.length) return null
  return (
    <Seccion id="galeria">
      <Cabecera etiqueta={a.etiqueta} titulo={a.titulo} />
      <div className="galeria stagger">
        {fotos.map((f, i) => (
          <button
            key={i}
            className="foto"
            onClick={() => setAbierta(i)}
            onMouseMove={inclinar}
            onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
          >
            <img src={f.imagen} alt={f.descripcion || ''} loading="lazy" />
            {f.descripcion && <span>{f.descripcion}</span>}
          </button>
        ))}
      </div>
      {abierta !== null && (
        <div className="lightbox" onClick={() => setAbierta(null)} role="dialog" aria-modal>
          <button className="lightbox-close" aria-label="Cerrar">
            <IconoCerrar />
          </button>
          <img src={fotos[abierta].imagen} alt={fotos[abierta].descripcion} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </Seccion>
  )
}

// ---------------------------------------------------------------- Bio
function Redes({ cfg }: P) {
  const redes = cfg.redes.filter((r) => r.url)
  if (!redes.length) return null
  return (
    <div className="redes">
      {redes.map((r, i) => (
        <a key={i} href={r.url} target="_blank" rel="noreferrer">
          {r.red}
        </a>
      ))}
    </div>
  )
}

export function Bio({ cfg }: P) {
  const a = cfg.ajustes.bio
  return (
    <Seccion id="bio">
      <div className={`bio ${a.foto ? '' : 'bio-solo'}`}>
        {a.foto && (
          <div className="bio-foto reveal">
            <img src={a.foto} alt={cfg.ajustes.marca.nombre} loading="lazy" />
          </div>
        )}
        <div className="bio-texto">
          <Cabecera etiqueta={a.etiqueta} titulo={a.titulo} />
          <div className="reveal">
            {a.texto
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </div>
          <Redes cfg={cfg} />
        </div>
      </div>
    </Seccion>
  )
}

// ---------------------------------------------------------------- Contratación
export function Contratacion({ cfg }: P) {
  const a = cfg.ajustes.contratacion
  const wa = whatsappLink(a.whatsapp, a.mensajeWhatsapp)
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'error'>('idle')
  const [error, setError] = useState('')

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const get = (k: string) => String(f.get(k) ?? '').trim()
    setEstado('enviando')
    try {
      await enviarContratacion({
        nombre: get('nombre'),
        contacto: get('contacto'),
        fechaEvento: get('fechaEvento'),
        ciudad: get('ciudad'),
        evento: get('evento'),
        mensaje: get('mensaje'),
        web: get('web'),
      })
      setEstado('ok')
    } catch (err) {
      setError(String((err as Error).message))
      setEstado('error')
    }
  }

  return (
    <Seccion id="contratacion" className="contratacion">
      <div className="contratacion-grid">
        <div>
          <Cabecera etiqueta={a.etiqueta} titulo={a.titulo} texto={a.texto} />
          {cfg.beneficios.length > 0 && (
            <ul className="beneficios stagger">
              {cfg.beneficios.map((b, i) => (
                <li key={i}>{b.texto}</li>
              ))}
            </ul>
          )}
          <div className="contratacion-ctas reveal">
            {wa && (
              <a className="btn btn-accent btn-pulse" href={wa} target="_blank" rel="noreferrer">
                {a.boton}
              </a>
            )}
            {a.email && (
              <a className="btn btn-ghost" href={`mailto:${a.email}`}>
                {a.email}
              </a>
            )}
          </div>
        </div>

        {a.formularioActivo && (
          <div className="card form-card reveal">
            {estado === 'ok' ? (
              <p className="form-ok">{a.formularioGracias}</p>
            ) : (
              <form onSubmit={enviar}>
                <h3>{a.formularioTitulo}</h3>
                <input name="web" className="hp" tabIndex={-1} autoComplete="off" aria-hidden />
                <label>
                  Nombre / productora
                  <input name="nombre" required maxLength={120} />
                </label>
                <label>
                  WhatsApp o email
                  <input name="contacto" required maxLength={120} />
                </label>
                <div className="form-row">
                  <label>
                    Fecha del evento
                    <input name="fechaEvento" type="date" />
                  </label>
                  <label>
                    Ciudad
                    <input name="ciudad" maxLength={120} />
                  </label>
                </div>
                <label>
                  Local / tipo de evento
                  <input name="evento" maxLength={160} />
                </label>
                <label>
                  Mensaje
                  <textarea name="mensaje" rows={3} maxLength={2000} />
                </label>
                {estado === 'error' && <p className="form-error">No se pudo enviar: {error}</p>}
                <button className="btn btn-accent" disabled={estado === 'enviando'}>
                  {estado === 'enviando' ? 'Enviando…' : 'Enviar solicitud'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </Seccion>
  )
}

// ---------------------------------------------------------------- Instagram
export function Instagram({ cfg }: P) {
  const a = cfg.ajustes.instagram
  const { perfil, estado } = useInstagram(a.feed)
  const usuario = (perfil?.usuario || a.usuario).replace(/^@/, '').trim()

  // Al llegar el feed la sección crece: las animaciones por scroll de las de abajo deben recalcularse.
  useEffect(() => {
    if (perfil) ScrollTrigger.refresh()
  }, [perfil])

  if (estado === 'cargando') return null
  if (!usuario) return null

  // Con feed: perfil + últimos posts, como en la web de referencia.
  if (perfil) {
    return (
      <Seccion id="instagram">
        <Cabecera etiqueta={a.etiqueta} titulo="Instagram" />
        <div className="ig-perfil reveal">
          <a className="ig-avatar" href={`https://instagram.com/${usuario}`} target="_blank" rel="noreferrer">
            {perfil.foto ? (
              <img src={perfil.foto} alt={usuario} referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = 'none')} />
            ) : null}
            <span aria-hidden="true">{usuario.slice(0, 1).toUpperCase()}</span>
          </a>
          <div className="ig-info">
            <a className="ig-usuario" href={`https://instagram.com/${usuario}`} target="_blank" rel="noreferrer">
              @{usuario}
            </a>
            {perfil.bio && <p className="ig-bio">{perfil.bio}</p>}
            <p className="ig-cifras">
              {perfil.seguidores !== null && (
                <span>
                  <b>{formatoSeguidores(perfil.seguidores)}</b> seguidores
                </span>
              )}
              {perfil.posts.length > 0 && (
                <span>
                  <b>{perfil.posts.length}</b> posts recientes
                </span>
              )}
            </p>
          </div>
        </div>
        {perfil.posts.length > 0 && (
          <div className="ig-grid stagger">
            {perfil.posts.map((p) => (
              <a key={p.id} className="ig-post" href={p.permalink} target="_blank" rel="noreferrer" aria-label={p.texto.slice(0, 80) || 'Ver en Instagram'}>
                <img src={p.imagen} alt="" loading="lazy" referrerPolicy="no-referrer" />
                {p.tipo === 'VIDEO' && (
                  <span className="ig-play" aria-hidden="true">
                    <IconoPlay />
                  </span>
                )}
              </a>
            ))}
          </div>
        )}
      </Seccion>
    )
  }

  // Sin feed (o si falló): tarjeta manual con los datos escritos en el /admin.
  return (
    <Seccion id="instagram">
      <Cabecera etiqueta={a.etiqueta} titulo="Instagram" />
      <a className="card insta reveal" href={`https://instagram.com/${usuario}`} target="_blank" rel="noreferrer">
        <strong className="accent">@{usuario}</strong>
        {a.descripcion && <p>{a.descripcion}</p>}
        {a.seguidores && <span className="muted">{a.seguidores} seguidores</span>}
        <span className="btn btn-ghost btn-sm">Seguir</span>
      </a>
    </Seccion>
  )
}

// ---------------------------------------------------------------- Presskit
export function Presskit({ cfg }: P) {
  const a = cfg.ajustes.presskit
  if (!a.url) return null
  return (
    <Seccion id="presskit" className="presskit">
      <Cabecera etiqueta={a.etiqueta} titulo={a.titulo} />
      <a className="btn btn-accent reveal" href={a.url} target="_blank" rel="noreferrer" download>
        <IconoDescarga /> {a.boton}
      </a>
    </Seccion>
  )
}

// ---------------------------------------------------------------- Footer
export function Footer({ cfg }: P) {
  return (
    <footer className="footer">
      <Redes cfg={cfg} />
      <p>{textoAnio(cfg.ajustes.footer.texto)}</p>
    </footer>
  )
}
