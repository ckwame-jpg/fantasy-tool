'use client'

import { useMemo } from 'react'

export interface TickerItem {
  id: string
  label: string
  position?: string
  detail?: string
  pts?: string
  trend?: 'up' | 'down' | 'neutral'
}

interface LiveTickerProps {
  items: TickerItem[]
  tag?: string
}

export default function LiveTicker({ items, tag = 'live now' }: LiveTickerProps) {
  const doubled = useMemo(() => [...items, ...items], [items])

  if (items.length === 0) return null

  return (
    <div className="live-rail">
      <span className="lr-tag">
        <span className="d" />
        {tag}
      </span>
      <div className="lr-track">
        <div className="lr-strip">
          {doubled.map((item, idx) => (
            <span key={`${item.id}-${idx}`} className="lr-item">
              {item.position && (
                <span className="pos" data-p={item.position.toUpperCase()}>
                  {item.position.toLowerCase()}
                </span>
              )}
              <span className="text">
                <b>{item.label}</b>
                {item.detail ? ` ${item.detail}` : ''}
              </span>
              {item.pts && (
                <span className={`pts ${item.trend === 'down' ? 'down' : item.trend === 'up' ? 'up' : ''}`}>
                  {item.pts}
                </span>
              )}
              <span className="dot" />
            </span>
          ))}
        </div>
      </div>

      <style jsx>{`
        .live-rail {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0;
          margin-bottom: 18px;
          border: 1px solid var(--surface-border);
          background: linear-gradient(90deg, rgba(115, 110, 245, 0.08), rgba(140, 120, 255, 0.05) 40%, transparent 100%);
          border-radius: 12px;
          overflow: hidden;
          height: 38px;
        }
        .lr-tag {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 14px;
          height: 100%;
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: hsl(262 80% 75%);
          background: linear-gradient(90deg, rgba(140, 120, 255, 0.18), rgba(140, 120, 255, 0.04));
          border-right: 1px solid rgba(140, 120, 255, 0.25);
        }
        .lr-tag .d {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: hsl(262 80% 60%);
          box-shadow: 0 0 6px hsl(262 80% 60%);
          animation: pulse 1.4s ease-in-out infinite;
        }
        .lr-track {
          flex: 1;
          overflow: hidden;
          height: 100%;
          -webkit-mask: linear-gradient(90deg, transparent 0, black 4%, black 96%, transparent 100%);
          mask: linear-gradient(90deg, transparent 0, black 4%, black 96%, transparent 100%);
        }
        .lr-strip {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          height: 100%;
          white-space: nowrap;
          animation: lr-scroll 60s linear infinite;
          padding-left: 24px;
        }
        .live-rail:hover .lr-strip {
          animation-play-state: paused;
        }
        .lr-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--ink-2);
          font-family: var(--font-quicksand), system-ui, sans-serif;
          font-weight: 500;
        }
        .lr-item :global(b) {
          color: var(--ink);
          font-weight: 600;
        }
        .lr-item .pos {
          font-family: var(--font-mono);
          font-size: 9.5px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 1px 5px;
          border-radius: 3px;
          background: rgba(115, 110, 245, 0.14);
          color: hsl(245 80% 78%);
        }
        .lr-item .pos[data-p='QB'] {
          background: hsl(0 78% 62% / 0.14);
          color: hsl(0 78% 75%);
        }
        .lr-item .pos[data-p='RB'] {
          background: hsl(170 75% 52% / 0.14);
          color: hsl(170 75% 65%);
        }
        .lr-item .pos[data-p='WR'] {
          background: hsl(210 80% 64% / 0.14);
          color: hsl(210 80% 75%);
        }
        .lr-item .pos[data-p='TE'] {
          background: hsl(40 92% 60% / 0.14);
          color: hsl(40 92% 70%);
        }
        .lr-item .pts {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          color: var(--neon);
        }
        .lr-item .pts.down {
          color: var(--hot);
        }
        .dot {
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: var(--line);
          margin: 0 12px;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}
