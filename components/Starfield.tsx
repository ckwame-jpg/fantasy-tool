'use client'

import { useEffect, useRef } from 'react'

interface SkyState {
  ox: number
  oy: number
  tx: number
  ty: number
  dragging: boolean
  startOx: number
  startOy: number
}

interface Star {
  x0: number
  y0: number
  r: number
  a: number
  ph: number
  sp: number
  drift: number
  depth: number
  bloom: boolean
  tint: string
}

declare global {
  interface Window {
    __sikaSky?: SkyState
  }
}

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!window.__sikaSky) {
      window.__sikaSky = { ox: 0, oy: 0, tx: 0, ty: 0, dragging: false, startOx: 0, startOy: 0 }
    }
    const sky: SkyState = window.__sikaSky

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0
    let h = 0
    let stars: Star[] = []

    const resize = () => {
      w = canvas.width = window.innerWidth * dpr
      h = canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'

      const count = Math.floor((window.innerWidth * window.innerHeight) / 700)
      stars = Array.from({ length: count }, () => ({
        x0: Math.random() * w,
        y0: Math.random() * h,
        r: Math.random() * 1.3 * dpr + 0.2 * dpr,
        a: Math.min(1, Math.random() * 0.975 + 0.286),
        ph: Math.random() * Math.PI * 2,
        sp: 0.0006 + Math.random() * 0.0018,
        drift: 0.3 + Math.random() * 1.4,
        depth: 0.2 + Math.random() * 1.0,
        bloom: Math.random() < 0.18,
        tint:
          Math.random() < 0.16 ? '180,140,255' : Math.random() < 0.28 ? '140,220,255' : '230,230,255',
      }))
    }

    let raf = 0
    const t0 = performance.now()
    const frame = (t: number) => {
      const dt = t - t0
      sky.ox += sky.ox * -0.012
      const px = (sky.ox + sky.tx) * dpr
      const py = (sky.oy + sky.ty) * dpr

      ctx.clearRect(0, 0, w, h)

      for (const s of stars) {
        const warpX = Math.sin(dt * 0.00015 + s.y0 * 0.0013) * s.drift * dpr
        const warpY = Math.cos(dt * 0.00012 + s.x0 * 0.0011) * s.drift * dpr * 0.6
        const x = s.x0 + warpX + px * s.depth
        const y = s.y0 + warpY + py * s.depth
        const tw = 0.55 + 0.45 * Math.sin(s.ph + dt * s.sp)
        const a = s.a * tw
        if (s.bloom) {
          const bg = ctx.createRadialGradient(x, y, 0, x, y, s.r * 7)
          bg.addColorStop(0, `rgba(${s.tint},${a * 0.4})`)
          bg.addColorStop(1, `rgba(${s.tint},0)`)
          ctx.fillStyle = bg
          ctx.beginPath()
          ctx.arc(x, y, s.r * 7, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = a
        ctx.fillStyle = `rgba(${s.tint},1)`
        ctx.beginPath()
        ctx.arc(x, y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }

    let lx = 0
    let ly = 0
    const onMove = (e: MouseEvent) => {
      const cx = e.clientX / window.innerWidth - 0.5
      const cy = e.clientY / window.innerHeight - 0.5
      sky.tx = cx * 20
      sky.ty = cy * 14
    }
    const onPointerDown = (e: PointerEvent) => {
      const tgt = e.target
      if (!(tgt instanceof Element)) return
      if (
        tgt.closest(
          'a, button, input, select, textarea, label, [role=button], .side, .topbar, .nav-item',
        )
      ) {
        return
      }
      sky.dragging = true
      sky.startOx = sky.ox
      sky.startOy = sky.oy
      lx = e.clientX
      ly = e.clientY
      document.body.style.cursor = 'grabbing'
      const hint = document.getElementById('orbitHint')
      if (hint) hint.classList.add('hide')
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!sky.dragging) return
      sky.ox = sky.startOx + (e.clientX - lx) * 0.6
      sky.oy = sky.startOy + (e.clientY - ly) * 0.6
    }
    const onPointerUp = () => {
      sky.dragging = false
      document.body.style.cursor = ''
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [])

  return <canvas ref={canvasRef} className="page-canvas" aria-hidden />
}
