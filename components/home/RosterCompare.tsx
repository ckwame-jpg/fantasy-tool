'use client'

import PositionPill from '@/components/PositionPill'
import type { SlimPlayer, ProjectionsMap } from '@/hooks/useHomeData'

interface RosterCompareProps {
  myTeamName: string
  myStarters: string[]
  myStartersPoints?: number[]
  myTotal: number
  oppTeamName: string
  oppStarters: string[]
  oppStartersPoints?: number[]
  oppTotal: number
  rosterSlots: string[]
  players: Record<string, SlimPlayer>
  projections: ProjectionsMap
}

function ptsTone(pts: number, proj: number) {
  if (pts <= 0) return 'zero'
  const ratio = proj > 0 ? pts / proj : 1
  if (ratio >= 1.15) return 'cooking'
  if (ratio <= 0.55) return 'dud'
  return ''
}

function projectionFor(id: string, projections: ProjectionsMap) {
  const p = projections[id]?.stats
  return Number(p?.pts_ppr ?? p?.pts_half_ppr ?? p?.pts_std ?? 0)
}

export default function RosterCompare(props: RosterCompareProps) {
  const { rosterSlots, myStarters, oppStarters, myStartersPoints, oppStartersPoints, players, projections } = props

  const renderRow = (
    slot: string,
    pid: string | undefined,
    pts: number | undefined,
    _isYou: boolean,
    index: number,
  ) => {
    const player = pid ? players[pid] : undefined
    const projection = pid ? projectionFor(pid, projections) : 0
    const score = Number(pts ?? 0)
    const tone = ptsTone(score, projection)
    const injury = player?.injury_status
    return (
      <div className="player-row" key={`${slot}-${index}-${pid || 'empty'}`}>
        <PositionPill position={slot} />
        <div className="player-name">
          <div className="nm q-name">
            {player?.name || (pid ? `Player ${pid}` : '— empty —')}
            {injury && <span className="inj">{injury.charAt(0)}</span>}
          </div>
          <div className="gm">
            {player?.team || '—'}
            {projection > 0 ? ` · proj ${projection.toFixed(1)}` : ''}
          </div>
        </div>
        <div className={`player-pts tnum ${tone}`}>{score > 0 ? score.toFixed(1) : '—'}</div>
        <div className="player-trend">
          {projection > 0 && score > 0 ? (
            score >= projection ? (
              <span className="up">▲ {(score - projection).toFixed(1)}</span>
            ) : (
              <span className="down">▼ {(projection - score).toFixed(1)}</span>
            )
          ) : projection > 0 ? (
            `${projection.toFixed(1)} proj`
          ) : (
            '—'
          )}
        </div>
        <style jsx>{`
          .player-row {
            display: grid;
            grid-template-columns: 36px 1fr auto auto;
            align-items: center;
            gap: 12px;
            padding: 10px 18px;
            border-top: 1px solid var(--line-2);
            transition: background 0.12s;
          }
          .player-row:first-child {
            border-top: 1px solid transparent;
          }
          .player-row:hover {
            background: rgba(255, 255, 255, 0.02);
          }
          .player-name {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
          }
          .player-name .nm {
            font-size: 14px;
            font-weight: 600;
            color: var(--ink);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .player-name .inj {
            display: inline-grid;
            place-items: center;
            width: 14px;
            height: 14px;
            border-radius: 4px;
            background: rgba(255, 80, 60, 0.18);
            color: hsl(8 90% 72%);
            font-family: var(--font-mono);
            font-size: 9px;
            font-weight: 700;
          }
          .player-name .gm {
            font-family: var(--font-mono);
            font-size: 10px;
            color: var(--ink-3);
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }
          .player-pts {
            font-size: 14px;
            font-weight: 600;
            color: var(--ink);
            text-align: right;
            min-width: 48px;
          }
          .player-pts.zero {
            color: var(--ink-3);
          }
          .player-pts.cooking {
            color: var(--neon);
          }
          .player-pts.dud {
            color: hsl(8 80% 70%);
          }
          .player-trend {
            font-family: var(--font-mono);
            font-size: 10px;
            color: var(--ink-3);
            text-align: right;
            min-width: 56px;
            letter-spacing: 0.04em;
          }
          .player-trend .up {
            color: var(--neon);
          }
          .player-trend .down {
            color: var(--hot);
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="roster">
      <div className="roster-side you">
        <div className="head">
          <div className="who">
            <div className="nm">{props.myTeamName}</div>
            <div className="sub">your starters</div>
          </div>
          <div className="total">{props.myTotal.toFixed(1)}</div>
        </div>
        <div className="roster-list">
          {rosterSlots.map((slot, i) =>
            renderRow(slot, myStarters[i], myStartersPoints?.[i], true, i),
          )}
        </div>
      </div>

      <div className="roster-side opp">
        <div className="head">
          <div className="who">
            <div className="nm">{props.oppTeamName || 'opponent'}</div>
            <div className="sub">opponent starters</div>
          </div>
          <div className="total">{props.oppTotal.toFixed(1)}</div>
        </div>
        <div className="roster-list">
          {rosterSlots.map((slot, i) =>
            renderRow(slot, oppStarters[i], oppStartersPoints?.[i], false, i),
          )}
        </div>
      </div>

      <style jsx>{`
        .roster {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 28px;
        }
        @media (max-width: 900px) {
          .roster {
            grid-template-columns: 1fr;
          }
        }
        .roster-side {
          border: 1px solid var(--surface-border);
          border-radius: 16px;
          background: var(--surface);
          backdrop-filter: blur(12px);
          overflow: hidden;
        }
        .roster-side .head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid var(--line-2);
          background: rgba(115, 110, 245, 0.05);
        }
        .roster-side.opp .head {
          background: rgba(255, 80, 60, 0.04);
        }
        .roster-side .head .who {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .roster-side .head .nm {
          font-family: var(--font-display);
          font-size: 18px;
          letter-spacing: 0.04em;
          color: var(--ink);
        }
        .roster-side .head .sub {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--ink-3);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .roster-side .head .total {
          font-family: var(--font-display);
          font-size: 26px;
          letter-spacing: 0.02em;
          font-feature-settings: 'tnum';
          color: var(--ink);
        }
        .roster-side.you .head .total {
          color: var(--neon);
        }
        .roster-side.opp .head .total {
          color: hsl(8 90% 72%);
        }
        .roster-list {
          padding: 6px 0;
        }
      `}</style>
    </div>
  )
}
