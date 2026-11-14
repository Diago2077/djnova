import { useEffect, useRef } from 'react'

/** Partículas flotantes del hero que se apartan del ratón. */
export function Particulas({ color }: { color: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    let raf = 0
    const mouse = { x: -9999, y: -9999 }
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const n = window.innerWidth < 700 ? 40 : 90
    const ps = Array.from({ length: n }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.4 - 0.1,
      r: Math.random() * 1.8 + 0.4,
      a: Math.random() * 0.6 + 0.2,
    }))

    function resize() {
      w = canvas!.clientWidth
      h = canvas!.clientHeight
      canvas!.width = w * dpr
      canvas!.height = h * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      for (const p of ps) {
        if (p.x <= 1) {
          p.x *= w
          p.y *= h
        }
      }
    }

    function frame() {
      ctx!.clearRect(0, 0, w, h)
      ctx!.fillStyle = color
      for (const p of ps) {
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const d2 = dx * dx + dy * dy
        if (d2 < 120 * 120) {
          const f = (1 - Math.sqrt(d2) / 120) * 2
          p.x += (dx / Math.sqrt(d2 + 0.01)) * f
          p.y += (dy / Math.sqrt(d2 + 0.01)) * f
        }
        p.x += p.vx
        p.y += p.vy
        if (p.y < -10) p.y = h + 10
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        ctx!.globalAlpha = p.a
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx!.fill()
      }
      raf = requestAnimationFrame(frame)
    }

    const onMove = (e: PointerEvent) => {
      const r = canvas!.getBoundingClientRect()
      mouse.x = e.clientX - r.left
      mouse.y = e.clientY - r.top
    }
    resize()
    frame()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
    }
  }, [color])

  return <canvas ref={ref} className="hero-canvas" aria-hidden />
}
