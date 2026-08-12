'use client'

import type { ReactNode } from 'react'
import CosmosHero, { type CosmosHeroChip } from './CosmosHero'

interface PageFrameProps {
  /** Kept for backwards compatibility — no longer rendered. */
  crumb?: string
  /** Optional pill anchored to the top-right of the hero (e.g. live week, mode). */
  rightPill?: ReactNode
  hero?: {
    eyebrow: string
    title: ReactNode
    sub?: ReactNode
    chips?: CosmosHeroChip[]
  }
  children: ReactNode
}

export default function PageFrame({ rightPill, hero, children }: PageFrameProps) {
  return (
    <div className="page-frame">
      {rightPill && <div className="page-pill-row">{rightPill}</div>}
      {hero && (
        <CosmosHero eyebrow={hero.eyebrow} title={hero.title} sub={hero.sub} chips={hero.chips} />
      )}
      {children}
      <style jsx>{`
        .page-pill-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 12px;
        }
      `}</style>
    </div>
  )
}
