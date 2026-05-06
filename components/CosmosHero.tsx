'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export interface CosmosHeroChip {
  label: string
  value: ReactNode
}

interface CosmosHeroProps {
  eyebrow: string
  title: ReactNode
  sub?: ReactNode
  chips?: CosmosHeroChip[]
  children?: ReactNode
}

const COLS = 32
const ROWS = 14
const PEAKS: ReadonlyArray<readonly [number, number, number]> = [
  [0.22, 0.55, 0.95],
  [0.55, 0.35, 0.85],
  [0.78, 0.62, 0.7],
]

function buildHeightMap(): number[][] {
  const map: number[][] = []
  for (let i = 0; i <= ROWS; i++) {
    const row: number[] = []
    for (let j = 0; j <= COLS; j++) {
      const u = j / COLS
      const v = i / ROWS
      let z = Math.sin(u * 7 + v * 3) * 0.18
      z += Math.cos(u * 4.2 - v * 5.3) * 0.14
      z += Math.sin(u * 13 + 2.1) * 0.08
      for (const [px, py, pa] of PEAKS) {
        const d2 = (u - px) * (u - px) + (v - py) * (v - py)
        z += pa * Math.exp(-d2 * 55)
      }
      row.push(z)
    }
    map.push(row)
  }
  return map
}

export default function CosmosHero({ eyebrow, title, sub, chips, children }: CosmosHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rootStyles = getComputedStyle(document.documentElement)
    const violet500Hsl = rootStyles.getPropertyValue('--color-cosmos-violet-500-hsl').trim()
    const cyan500Hsl = rootStyles.getPropertyValue('--color-cosmos-cyan-500-hsl').trim()
    const textBright = rootStyles.getPropertyValue('--color-cosmos-text-bright').trim() || '#fff'

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let width = 0
    let height = 0
    const heightMap = buildHeightMap()
    let raf = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = canvas.width = Math.max(320, rect.width) * dpr
      height = canvas.height = Math.max(180, rect.height) * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    }

    const wave = (j: number, i: number, t: number) =>
      heightMap[i][j] * (1 + 0.12 * Math.sin(t * 0.0008 + i * 0.6 + j * 0.25))

    const project = (
      u: number,
      v: number,
      z: number,
      skew: number,
      tilt: number,
    ): [number, number] => {
      const cx = width * 0.5
      const cyTop = height * 0.2
      const cyBot = height * 0.95
      const uu = u - 0.5 + skew * (1 - v)
      const topW = width * 0.35
      const botW = width * 1.05
      const rowW = topW + (botW - topW) * v
      const x = cx + uu * rowW
      const yBase = cyTop + (cyBot - cyTop) * v
      const y = yBase - z * height * 0.28 * (0.5 + v * 0.8) * tilt
      return [x, y]
    }

    const frame = (t: number) => {
      ctx.clearRect(0, 0, width, height)
      const sky = window.__sikaSky ?? { ox: 0, oy: 0, tx: 0, ty: 0 }
      const skew = (sky.ox + sky.tx) * 0.002
      const tilt = 0.55 + (sky.oy + sky.ty) * 0.001

      for (let i = 0; i <= ROWS; i++) {
        const v = i / ROWS
        const alpha = 0.18 + v * 0.62
        ctx.strokeStyle = `hsl(${violet500Hsl} / ${alpha * 0.55})`
        ctx.lineWidth = 1 * dpr
        ctx.beginPath()
        for (let j = 0; j <= COLS; j++) {
          const [x, y] = project(j / COLS, v, wave(j, i, t), skew, tilt)
          if (j === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      for (let j = 0; j <= COLS; j += 2) {
        ctx.beginPath()
        for (let i = 0; i <= ROWS; i++) {
          const v = i / ROWS
          const alpha = 0.08 + v * 0.35
          ctx.strokeStyle = `hsl(${cyan500Hsl} / ${alpha * 0.45})`
          const [x, y] = project(j / COLS, v, wave(j, i, t), skew, tilt)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      for (const [px, py, pa] of PEAKS) {
        const j = Math.round(px * COLS)
        const i = Math.round(py * ROWS)
        const [x, y] = project(px, py, heightMap[i][j] + pa, skew, tilt)
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 14 * dpr)
        glow.addColorStop(0, 'rgba(200,160,255,0.85)')
        glow.addColorStop(0.4, `hsl(${violet500Hsl} / 0.35)`)
        glow.addColorStop(1, 'transparent')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(x, y, 14 * dpr, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = textBright
        ctx.beginPath()
        ctx.arc(x, y, 1.6 * dpr, 0, Math.PI * 2)
        ctx.fill()
      }

      if (!reduceMotion) {
        raf = requestAnimationFrame(frame)
      }
    }

    resize()
    if (reduceMotion) {
      frame(0)
    } else {
      raf = requestAnimationFrame(frame)
    }
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <section className="cosmos-hero">
      <div className="cosmos-hero-canvas-wrap">
        <canvas ref={canvasRef} className="cosmos-hero-canvas" aria-hidden />
      </div>
      <div className="cosmos-hero-inner">
        <div className="ch-eyebrow">{eyebrow}</div>
        <div className="ch-title">{title}</div>
        {sub && <div className="ch-sub">{sub}</div>}
        {chips && chips.length > 0 && (
          <div className="ch-chips">
            {chips.map((chip) => (
              <div className="ch-chip" key={chip.label}>
                <span className="ch-chip-label">{chip.label}</span>
                <span className="ch-chip-value">{chip.value}</span>
              </div>
            ))}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}
