'use client'

import { useEffect, useMemo, useState } from 'react'
import { LineChart } from 'lucide-react'
import { API_BASE_URL } from '@/constants'
import PageFrame from '@/components/PageFrame'
import PositionPill from '@/components/PositionPill'
import { useLeague } from '@/lib/league-context'
import type { SlimPlayer } from '@/hooks/useHomeData'

interface ProjectionsMap {
  [pid: string]: { stats?: { pts_ppr?: number; pts_half_ppr?: number; pts_std?: number } }
}

const POSITION_FILTERS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']

export default function ProjectionsPage() {
  const { season, leagueSettings } = useLeague()
  const [week, setWeek] = useState(1)
  const [projections, setProjections] = useState<ProjectionsMap>({})
  const [players, setPlayers] = useState<Record<string, SlimPlayer>>({})
  const [loading, setLoading] = useState(true)
  const [pos, setPos] = useState('ALL')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(60)

  useEffect(() => {
    fetch(`${API_BASE_URL}/sleeper/state/nfl`)
      .then((r) => r.json())
      .then((d) => setWeek(Math.max(1, d.week || d.display_week || 1)))
      .catch(() => setWeek(1))
  }, [])

  useEffect(() => {
    if (!season || week == null) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const [pj, pl] = await Promise.all([
        fetch(`${API_BASE_URL}/sleeper/projections/${season}/${week}`).then((r) => r.json()).catch(() => ({})),
        fetch(`${API_BASE_URL}/sleeper/players/slim`).then((r) => r.json()).catch(() => ({})),
      ])
      if (cancelled) return
      setProjections(pj && typeof pj === 'object' ? pj : {})
      setPlayers(pl && typeof pl === 'object' ? pl : {})
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [season, week])

  const scoringKey = leagueSettings.scoringFormat === 'standard' ? 'pts_std' : leagueSettings.scoringFormat === 'half_ppr' ? 'pts_half_ppr' : 'pts_ppr'

  const rows = useMemo(() => {
    const data: Array<{ id: string; name: string; team: string; position: string; pts: number }> = []
    for (const [id, entry] of Object.entries(projections)) {
      const player = players[id]
      if (!player) continue
      const pts = Number(entry?.stats?.[scoringKey as keyof typeof entry.stats] ?? 0)
      if (pts <= 0) continue
      if (pos !== 'ALL' && player.position !== pos) continue
      if (search && !player.name.toLowerCase().includes(search.toLowerCase())) continue
      data.push({ id, name: player.name, team: player.team, position: player.position, pts })
    }
    data.sort((a, b) => b.pts - a.pts)
    return data
  }, [projections, players, pos, search, scoringKey])

  return (
    <PageFrame
      crumb="projections"
      rightPill={
        <span className="week-pill">
          <LineChart size={12} />
          week {week}
        </span>
      }
      hero={{
        eyebrow: 'research · weekly projections',
        title: (
          <>
            this week, by the <span className="ch-hl">model</span>.
          </>
        ),
        sub: (
          <>
            sleeper's weekly projection feed, normalized to your league&apos;s scoring format. sortable by position; updated multiple times
            per day.
          </>
        ),
        chips: [
          { label: 'week', value: String(week) },
          { label: 'season', value: String(season) },
          { label: 'scoring', value: leagueSettings.scoringFormat.toUpperCase() },
          { label: 'players', value: rows.length.toString() },
        ],
      }}
    >
      <div className="filters glass">
        <div className="pill-row">
          {POSITION_FILTERS.map((p) => (
            <button
              key={p}
              type="button"
              className={`pos-btn ${pos === p ? 'active' : ''}`}
              onClick={() => setPos(p)}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          placeholder="search by player name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="board glass">
        <div className="hd">
          <div>rank</div>
          <div>player</div>
          <div className="num">team</div>
          <div className="num">proj pts</div>
        </div>
        {loading ? (
          <div className="empty">loading projections…</div>
        ) : rows.length === 0 ? (
          <div className="empty">no projections yet for week {week}</div>
        ) : (
          rows.slice(0, limit).map((r, idx) => (
            <div key={r.id} className="row">
              <div className="rank tnum">{idx + 1}</div>
              <div className="who">
                <PositionPill position={r.position} />
                <span className="nm q-name">{r.name}</span>
              </div>
              <div className="num tnum">{r.team}</div>
              <div className="num tnum pts">{r.pts.toFixed(1)}</div>
            </div>
          ))
        )}
        {rows.length > limit && !loading && (
          <button type="button" className="more" onClick={() => setLimit((l) => l + 60)}>
            show {Math.min(60, rows.length - limit)} more
          </button>
        )}
      </div>

      <style jsx>{`
        .filters {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          padding: 12px 16px;
          margin-bottom: 16px;
        }
        .pill-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .pos-btn {
          padding: 5px 12px;
          border-radius: 999px;
          border: 1px solid var(--surface-border);
          background: transparent;
          color: var(--ink-2);
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.08em;
          cursor: pointer;
        }
        .pos-btn:hover {
          color: var(--ink);
          border-color: var(--color-cosmos-violet-hairline);
        }
        .pos-btn.active {
          background: rgba(115, 110, 245, 0.12);
          border-color: var(--color-cosmos-violet-hairline);
          color: var(--color-cosmos-violet-300);
        }
        .search-input {
          flex: 1;
          min-width: 200px;
          background: var(--color-cosmos-surface-dim);
          border: 1px solid var(--surface-border);
          color: var(--ink);
          padding: 8px 12px;
          border-radius: 8px;
          font-family: inherit;
          font-size: 13px;
          outline: none;
        }
        .search-input:focus {
          border-color: var(--color-cosmos-violet-hairline);
        }
        .search-input::placeholder {
          color: var(--ink-3);
        }

        .board {
          overflow: hidden;
        }
        .hd,
        .row {
          display: grid;
          grid-template-columns: 56px 1fr 80px 110px;
          align-items: center;
          padding: 11px 18px;
          gap: 12px;
        }
        .hd {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink-3);
          border-bottom: 1px solid var(--line-2);
          background: var(--color-cosmos-surface-thead);
        }
        .row {
          border-top: 1px solid var(--line-2);
        }
        .row:first-of-type {
          border-top: none;
        }
        .row:hover {
          background: rgba(255, 255, 255, 0.015);
        }
        .num {
          text-align: right;
        }
        .rank {
          color: var(--ink-3);
          font-size: 13px;
        }
        .who {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .nm {
          color: var(--ink);
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pts {
          color: var(--color-cosmos-violet-300);
          font-weight: 600;
          font-size: 14px;
        }
        .more {
          width: 100%;
          padding: 14px;
          background: transparent;
          border: none;
          border-top: 1px solid var(--line-2);
          color: var(--neon);
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .more:hover {
          background: var(--color-cosmos-violet-row-tint);
        }
        .empty {
          padding: 60px 18px;
          text-align: center;
          color: var(--ink-3);
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
      `}</style>
    </PageFrame>
  )
}
