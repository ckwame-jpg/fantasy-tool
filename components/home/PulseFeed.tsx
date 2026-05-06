'use client'

import { useMemo, useState } from 'react'
import { ArrowLeftRight, Flame, ShieldAlert, Sparkles } from 'lucide-react'
import type { PulseItem, PulseFeed as PulseFeedData, SlimPlayer, PulseAddDrop } from '@/hooks/useHomeData'

type FilterKey = 'all' | 'trades' | 'waivers' | 'injuries' | 'trending'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'all' },
  { key: 'trades', label: 'trades' },
  { key: 'waivers', label: 'waivers' },
  { key: 'injuries', label: 'injuries' },
  { key: 'trending', label: 'trending' },
]

function matchFilter(item: PulseItem, filter: FilterKey): boolean {
  if (filter === 'all') return true
  if (filter === 'trades') return item.kind === 'trade'
  if (filter === 'waivers') return item.kind === 'waiver' || item.kind === 'free_agent'
  if (filter === 'injuries') return item.kind === 'injury'
  if (filter === 'trending') return item.kind === 'trending'
  return true
}

function relTime(ts: number) {
  if (!ts) return ''
  const seconds = Math.max(1, Math.floor(Date.now() / 1000 - ts))
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function PlayerChip({ name, position }: { name: string; position?: string }) {
  return (
    <span className="chip">
      {position && (
        <span className="pos" data-p={position.toUpperCase()}>
          {position.toUpperCase()}
        </span>
      )}
      <b>{name}</b>
      <style jsx>{`
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .chip :global(b) {
          color: var(--ink);
          font-weight: 600;
        }
        .pos {
          font-family: var(--font-mono);
          font-size: 9px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 1px 4px;
          border-radius: 3px;
          background: rgba(115, 110, 245, 0.14);
          color: hsl(245 80% 78%);
        }
        .pos[data-p='QB'] {
          background: hsl(0 78% 62% / 0.14);
          color: hsl(0 78% 75%);
        }
        .pos[data-p='RB'] {
          background: hsl(170 75% 52% / 0.14);
          color: hsl(170 75% 65%);
        }
        .pos[data-p='WR'] {
          background: hsl(210 80% 64% / 0.14);
          color: hsl(210 80% 75%);
        }
        .pos[data-p='TE'] {
          background: hsl(40 92% 60% / 0.14);
          color: hsl(40 92% 70%);
        }
      `}</style>
    </span>
  )
}

function PickChip({ label }: { label: string }) {
  return (
    <span className="pick">
      {label}
      <style jsx>{`
        .pick {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.04em;
          color: var(--color-cosmos-cyan-300);
          background: hsl(var(--color-cosmos-cyan-500-hsl) / 0.1);
          border: 1px solid hsl(var(--color-cosmos-cyan-500-hsl) / 0.3);
          border-radius: 4px;
        }
      `}</style>
    </span>
  )
}

function ItemBody({ item }: { item: PulseItem }) {
  if (item.kind === 'trade') {
    // Sleeper lists every traded player in BOTH adds and drops (one team's add
    // is the other team's drop). Dedupe by id so the chip row reflects the actual
    // pieces that moved.
    const seen = new Set<string>()
    const players: PulseAddDrop[] = []
    for (const p of [...(item.adds || []), ...(item.drops || [])]) {
      if (!p?.id || seen.has(p.id)) continue
      seen.add(p.id)
      players.push(p)
    }
    // Dedupe picks by season+round (each pick is logged once per side; one entry is enough).
    const seenPicks = new Set<string>()
    const picks = (item.picks || []).filter((p) => {
      const key = `${p.season}-${p.round}`
      if (seenPicks.has(key)) return false
      seenPicks.add(key)
      return true
    })
    return (
      <div>
        <div className="title">trade processed</div>
        <div className="line">
          {players.map((p) => (
            <PlayerChip key={p.id} name={p.name} position={p.position} />
          ))}
          {picks.map((p) => (
            <PickChip key={`${p.season}-${p.round}`} label={p.label} />
          ))}
        </div>
        <style jsx>{`
          .title {
            font-size: 13.5px;
            font-weight: 600;
            color: var(--ink);
            margin-bottom: 6px;
          }
          .line {
            font-size: 13px;
            color: var(--ink-2);
            line-height: 1.5;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px;
            min-width: 0;
          }
        `}</style>
      </div>
    )
  }
  if (item.kind === 'waiver' || item.kind === 'free_agent') {
    const adds = item.adds || []
    const drops = item.drops || []
    return (
      <div>
        <div className="title">
          {item.kind === 'waiver' ? 'waiver claim' : 'free agent move'}
          {item.waiver_bid != null && (
            <span className="bid">${item.waiver_bid}</span>
          )}
        </div>
        <div className="line">
          {adds.length > 0 && (
            <>
              <span className="muted">add </span>
              {adds.map((p, i) => (
                <span key={p.id}>
                  {i > 0 && ', '}
                  <PlayerChip name={p.name} position={p.position} />
                </span>
              ))}
            </>
          )}
          {drops.length > 0 && (
            <>
              {adds.length > 0 && ' · '}
              <span className="muted">drop </span>
              {drops.map((p, i) => (
                <span key={p.id}>
                  {i > 0 && ', '}
                  <PlayerChip name={p.name} position={p.position} />
                </span>
              ))}
            </>
          )}
        </div>
        <style jsx>{`
          .title {
            font-size: 13.5px;
            font-weight: 600;
            color: var(--ink);
            margin-bottom: 4px;
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .title .bid {
            font-family: var(--font-mono);
            font-size: 11px;
            color: var(--neon);
            background: rgba(115, 110, 245, 0.14);
            padding: 1px 6px;
            border-radius: 4px;
          }
          .line {
            font-size: 13px;
            color: var(--ink-2);
            line-height: 1.5;
          }
          .muted {
            color: var(--ink-3);
            font-family: var(--font-mono);
            font-size: 10.5px;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            margin-right: 4px;
          }
        `}</style>
      </div>
    )
  }
  if (item.kind === 'injury' && item.player) {
    return (
      <div>
        <div className="title">
          <PlayerChip name={item.player.name} position={item.player.position} /> ·{' '}
          <span className="hot">{item.status}</span>
          {item.body_part ? <span className="muted"> ({item.body_part})</span> : null}
        </div>
        <style jsx>{`
          .title {
            font-size: 13.5px;
            color: var(--ink-2);
            line-height: 1.5;
          }
          .hot {
            color: var(--hot);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .muted {
            color: var(--ink-3);
          }
        `}</style>
      </div>
    )
  }
  if (item.kind === 'trending') {
    const p = (item.adds || [])[0]
    return (
      <div>
        <div className="title">
          {p && <PlayerChip name={p.name} position={p.position} />}
          {item.count != null && (
            <span className="count">+{item.count.toLocaleString()} adds 24h</span>
          )}
        </div>
        <style jsx>{`
          .title {
            font-size: 13.5px;
            color: var(--ink-2);
            display: flex;
            align-items: center;
            gap: 10px;
            line-height: 1.5;
          }
          .count {
            font-family: var(--font-mono);
            font-size: 10.5px;
            color: var(--neon);
            letter-spacing: 0.04em;
          }
        `}</style>
      </div>
    )
  }
  return <div style={{ color: 'var(--ink-3)' }}>league activity</div>
}

function iconForKind(kind: string) {
  if (kind === 'trade') return { Icon: ArrowLeftRight, tone: 'trade' }
  if (kind === 'injury') return { Icon: ShieldAlert, tone: 'injury' }
  if (kind === 'trending') return { Icon: Flame, tone: 'trash' }
  return { Icon: Sparkles, tone: 'waiver' }
}

interface PulseFeedProps {
  data: PulseFeedData | null
  players: Record<string, SlimPlayer>
}

export default function PulseFeedView({ data, players: _players }: PulseFeedProps) {
  const [filter, setFilter] = useState<FilterKey>('all')

  const items = data?.items ?? []

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: items.length, trades: 0, waivers: 0, injuries: 0, trending: 0 }
    for (const item of items) {
      if (item.kind === 'trade') c.trades++
      else if (item.kind === 'waiver' || item.kind === 'free_agent') c.waivers++
      else if (item.kind === 'injury') c.injuries++
      else if (item.kind === 'trending') c.trending++
    }
    return c
  }, [items])

  const filtered = useMemo(() => items.filter((i) => matchFilter(i, filter)), [items, filter])

  return (
    <div className="pulse glass">
      <div className="pulse-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`pulse-tab ${filter === f.key ? 'active' : ''}`}
          >
            {f.label}
            <span className="ct">{counts[f.key]}</span>
          </button>
        ))}
      </div>
      <div className="pulse-list custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="empty">no activity yet · check back after waivers process</div>
        ) : (
          filtered.map((item, idx) => {
            const { Icon, tone } = iconForKind(item.kind)
            return (
              <div className="feed-item" key={`${item.kind}-${item.ts}-${idx}`}>
                <div className={`feed-icon ${tone}`}>
                  <Icon size={14} />
                </div>
                <div className="feed-body">
                  <ItemBody item={item} />
                </div>
                <div className="feed-time">{relTime(item.ts)}</div>
              </div>
            )
          })
        )}
      </div>

      <style jsx>{`
        .pulse {
          overflow: hidden;
        }
        .pulse-tabs {
          display: flex;
          gap: 0;
          border-bottom: 1px solid var(--line-2);
          padding: 0 10px;
        }
        .pulse-tab {
          padding: 14px 16px;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-3);
          cursor: pointer;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          transition: color 0.12s, border-color 0.12s;
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .pulse-tab:hover {
          color: var(--ink-2);
        }
        .pulse-tab.active {
          color: var(--ink);
          border-bottom-color: var(--neon);
        }
        .pulse-tab .ct {
          margin-left: 2px;
          padding: 1px 5px;
          background: var(--line);
          border-radius: 4px;
          font-size: 9.5px;
          color: var(--ink-2);
        }
        .pulse-tab.active .ct {
          background: rgba(115, 110, 245, 0.18);
          color: var(--neon);
        }
        .pulse-list {
          padding: 4px 0;
          max-height: 520px;
          overflow-y: auto;
        }
        .empty {
          padding: 36px 18px;
          text-align: center;
          color: var(--ink-3);
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .feed-item {
          display: grid;
          /* minmax(0, 1fr) lets the body column actually shrink below content
             width — without this, long names + statuses force the panel wider
             than the mobile viewport. */
          grid-template-columns: 36px minmax(0, 1fr) auto;
          gap: 14px;
          padding: 14px 18px;
          align-items: start;
          border-top: 1px solid var(--line-2);
        }
        @media (max-width: 768px) {
          .feed-item {
            grid-template-columns: 28px minmax(0, 1fr) auto;
            gap: 10px;
            padding: 10px 12px;
          }
        }
        .feed-item:first-child {
          border-top-color: transparent;
        }
        .feed-item:hover {
          background: rgba(255, 255, 255, 0.015);
        }
        .feed-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          background: rgba(115, 110, 245, 0.12);
          color: var(--neon);
          border: 1px solid rgba(115, 110, 245, 0.3);
          flex-shrink: 0;
        }
        .feed-icon.trade {
          color: hsl(210 80% 70%);
          background: rgba(80, 150, 220, 0.12);
          border-color: rgba(80, 150, 220, 0.3);
        }
        .feed-icon.waiver {
          color: var(--neon);
          background: rgba(115, 110, 245, 0.14);
          border-color: rgba(115, 110, 245, 0.35);
        }
        .feed-icon.injury {
          color: var(--hot);
          background: rgba(255, 80, 60, 0.12);
          border-color: rgba(255, 80, 60, 0.35);
        }
        .feed-icon.trash {
          color: var(--gold);
          background: rgba(245, 180, 40, 0.12);
          border-color: rgba(245, 180, 40, 0.35);
        }
        .feed-time {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--ink-3);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .feed-body {
          min-width: 0;
        }
      `}</style>
    </div>
  )
}
