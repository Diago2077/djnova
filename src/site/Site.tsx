import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useConfig } from '../lib/useConfig'
import { aplicarSeo, aplicarTema, whatsappLink } from '../lib/utils'
import type { SeccionId, SiteConfig } from '../types'
import {
  Agenda,
  Alcance,
  Bio,
  Contratacion,
  EnVivo,
  Footer,
  Galeria,
  Hero,
  Instagram,
  Nav,
  Numeros,
  Presskit,
  Spotify,
} from './sections'
import './site.css'

gsap.registerPlugin(ScrollTrigger)

const COMPONENTES: Record<SeccionId, (p: { cfg: SiteConfig }) => React.ReactNode> = {
  numeros: Numeros,
  envivo: EnVivo,
  alcance: Alcance,
  agenda: Agenda,
  spotify: Spotify,
  galeria: Galeria,
  bio: Bio,
  contratacion: Contratacion,
  instagram: Instagram,
  presskit: Presskit,
}

export default function Site() {
  const { cfg } = useConfig()

  useEffect(() => {
    if (!cfg) return
    aplicarTema(cfg.ajustes.tema)
    aplicarSeo(cfg.ajustes.seo)
  }, [cfg])

  if (!cfg) return <div className="boot" aria-label="Cargando" />
  return <Contenido cfg={cfg} />
}

function Contenido({ cfg }: { cfg: SiteConfig }) {
  const { ajustes } = cfg
  const [dentro, setDentro] = useState(!ajustes.entrada.activa)
  const [sonido, setSonido] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  const root = useRef<HTMLDivElement>(null)

  const secciones = cfg.secciones.filter((s) => s.visible).sort((a, b) => a.orden - b.orden)
  const wa = whatsappLink(ajustes.contratacion.whatsapp, ajustes.contratacion.mensajeWhatsapp)

  function entrar() {
    setDentro(true)
    if (audio.current && ajustes.entrada.musica) {
      audio.current.volume = 0.6
      audio.current.play().then(() => setSonido(true)).catch(() => setSonido(false))
    }
  }

  function alternarSonido() {
    const a = audio.current
    if (!a) return
    if (a.paused) a.play().then(() => setSonido(true)).catch(() => {})
    else {
      a.pause()
      setSonido(false)
    }
  }

  // Animaciones de entrada al hacer scroll.
  useLayoutEffect(() => {
    if (!dentro) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      if (reduce) return
      gsap.utils.toArray<HTMLElement>('.reveal').forEach((el) => {
        gsap.from(el, {
          y: 50,
          opacity: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        })
      })
      gsap.utils.toArray<HTMLElement>('.stagger').forEach((group) => {
        gsap.from(group.children, {
          y: 40,
          opacity: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: group, start: 'top 85%' },
        })
      })
    }, root)
    ScrollTrigger.refresh()
    return () => ctx.revert()
  }, [dentro, cfg])

  return (
    <div ref={root}>
      {ajustes.entrada.musica && <audio ref={audio} src={ajustes.entrada.musica} loop preload="none" />}

      {!dentro && (
        <div className="gate">
          <div className="gate-glow" />
          {ajustes.marca.logo ? (
            <img className="gate-logo" src={ajustes.marca.logo} alt={ajustes.marca.nombre} />
          ) : (
            <h1 className="gate-name">{ajustes.marca.nombre}</h1>
          )}
          {ajustes.marca.apodo && <p className="gate-apodo">{ajustes.marca.apodo}</p>}
          <button className="btn btn-accent" onClick={entrar}>
            ▶ {ajustes.entrada.boton}
          </button>
          {ajustes.entrada.aviso && <p className="gate-aviso">{ajustes.entrada.aviso}</p>}
        </div>
      )}

      <Nav cfg={cfg} secciones={secciones} />
      <main>
        <Hero cfg={cfg} />
        {secciones.map((s) => {
          const C = COMPONENTES[s.id]
          return C ? <C key={s.id} cfg={cfg} /> : null
        })}
      </main>
      <Footer cfg={cfg} />

      {ajustes.entrada.musica && dentro && (
        <button className="fab fab-sound" onClick={alternarSonido} aria-label={sonido ? 'Silenciar' : 'Activar sonido'}>
          {sonido ? '🔊' : '🔇'}
        </button>
      )}
      {wa && (
        <a className="fab fab-wa" href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden>
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3Z" />
          </svg>
        </a>
      )}
    </div>
  )
}
