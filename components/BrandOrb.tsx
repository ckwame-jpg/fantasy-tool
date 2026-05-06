'use client'

import { useId } from 'react'

interface BrandOrbProps {
  size?: number
  className?: string
  /** rotation in degrees — defaults to a tossed-ball angle */
  tilt?: number
}

/**
 * Brand mark — football silhouette in cosmos violet, rendered at a tossed-ball angle.
 * Component is still named "BrandOrb" so imports across the app don't churn.
 */
export default function BrandOrb({ size = 32, className = '', tilt = -28 }: BrandOrbProps) {
  // useId() gives us a stable, hydration-safe per-instance id.
  const reactId = useId().replace(/:/g, '')
  const fillId = `ballFill-${reactId}`
  const glowId = `ballGlow-${reactId}`
  const shineId = `ballShine-${reactId}`

  return (
    <span
      className={`brand-orb ${className}`}
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        display: 'inline-grid',
        placeItems: 'center',
      }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', overflow: 'visible', transform: `rotate(${tilt}deg)` }}
      >
        <defs>
          <linearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(262 85% 72%)" />
            <stop offset="55%" stopColor="hsl(262 70% 50%)" />
            <stop offset="100%" stopColor="hsl(252 60% 28%)" />
          </linearGradient>
          <radialGradient id={shineId} cx="32%" cy="32%" r="55%">
            <stop offset="0%" stopColor="hsl(262 100% 92%)" stopOpacity="0.55" />
            <stop offset="60%" stopColor="hsl(262 90% 80%)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M 5 20 Q 20 3 35 20 Q 20 37 5 20 Z"
          fill={`url(#${fillId})`}
          stroke="hsl(262 80% 60% / 0.55)"
          strokeWidth="0.6"
          filter={`url(#${glowId})`}
        />

        <path
          d="M 5 20 Q 20 3 35 20 Q 20 37 5 20 Z"
          fill={`url(#${shineId})`}
        />

        <line
          x1="13.5"
          y1="20"
          x2="26.5"
          y2="20"
          stroke="hsl(0 0% 96%)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {[16, 18, 20, 22, 24].map((x) => (
          <line
            key={x}
            x1={x}
            y1="17.5"
            x2={x}
            y2="22.5"
            stroke="hsl(0 0% 96%)"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
        ))}

        <path
          d="M 5.5 20 Q 8 18.5 10 20 Q 8 21.5 5.5 20"
          fill="none"
          stroke="hsl(0 0% 96% / 0.35)"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
        <path
          d="M 30 20 Q 32 18.5 34.5 20 Q 32 21.5 30 20"
          fill="none"
          stroke="hsl(0 0% 96% / 0.35)"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}
