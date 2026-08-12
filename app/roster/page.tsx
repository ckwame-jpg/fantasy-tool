'use client'

import { useEffect, useMemo, useState } from 'react'
import { UserRound } from 'lucide-react'
import { API_BASE_URL } from '@/constants'
import PageFrame from '@/components/PageFrame'
import PositionPill from '@/components/PositionPill'
import { useLeague } from '@/lib/league-context'
import type { SlimPlayer } from '@/hooks/useHomeData'

interface ProjectionsMap {
  [pid: string]: { stats?: { pts_ppr?: number; pts_half_ppr?: number; pts_std?: number } }
}

export default function RosterPage() {
  const { isConnected, myPlayerIds, myStarters, leagueName, leagueSettings, season } = useLeague()
  const [week, setWeek] = useState(1)
  const [players, setPlayers] = useState<Record<string, SlimPlayer>>({})
  const [projections, setProjections] = useState<ProjectionsMap>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE_URL}/sleeper/state/nfl`)
      .then((r) => r.json())
      .then((d) => setWeek(Math.max(1, d.week || d.display_week || 1)))
      .catch(() => setWeek(1))
  }, [])

  useEffect(() => {
    if (!isConnected || myPlayerIds.length === 0) {
      setLoading(false)
      return
    }
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const ids = myPlayerIds.join(',')
      const [pl, pj] = await Promise.all([
        fetch(`${API_BASE_URL}/sleeper/players/slim?ids=${encodeURIComponent(ids)}`).then((r) => r.json()).catch(() => ({})),
        fetch(`${API_BASE_URL}/sleeper/projections/${season}/${week}`).then((r) => r.json()).catch(() => ({})),
      ])
      if (cancelled) return
      setPlayers(pl && typeof pl === 'object' ? pl : {})
      setProjections(pj && typeof pj === 'object' ? pj : {})
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [isConnected, myPlayerIds, season, week])

  const scoringKey = leagueSettings.scoringFormat === 'standard' ? 'pts_std' : leagueSettings.scoringFormat === 'half_ppr' ? 'pts_half_ppr' : 'pts_ppr'

  const projFor = (pid: string) => {
    const p = projections[pid]?.stats
    return Number(p?.[scoringKey as keyof typeof p] ?? 0)
  }

  const slots = leagueSettings.rosterSlots
  const starters = useMemo(() => {
    const filled = slots.map((slot, i) => ({ slot, pid: myStarters[i] }))
    return filled
  }, [slots, myStarters])

  const benchIds = useMemo(() => {
    const starterSet = new Set(myStarters)
    return myPlayerIds.filter((id) => !starterSet.has(id))
  }, [myPlayerIds, myStarters])

  const totalProj = useMemo(() => starters.reduce((sum, s) => sum + (s.pid ? projFor(s.pid) : 0), 0), [starters, projections])
  const benchProj = useMemo(() => benchIds.reduce((sum, id) => sum + projFor(id), 0), [benchIds, projections])

  return (
    <PageFrame
      crumb="my roster"
      rightPill={
        <span className="week-pill">
          <UserRound size={12} />
          week {week}
        </span>
      }
      hero={{
        eyebrow: 'team · my roster',
        title: (
          <>
            your <span className="ch-hl">starting lineup</span>, your bench, your bye risk.
          </>
        ),
        sub: (
          <>
            live projection per slot from sleeper's weekly model. switch weeks by changing the NFL state &mdash; this view follows.
          </>
        ),
        chips: [
          { label: 'starters', value: String(myStarters.length) },
          { label: 'bench', value: String(benchIds.length) },
          { label: 'proj total', value: totalProj.toFixed(1) },
          { label: 'league', value: leagueName || '—' },
        ],
      }}
    >
      {!isConnected ? (
        <div className="empty">connect a Sleeper league to view your roster.</div>
      ) : loading ? (
        <div className="empty">loading roster…</div>
      ) : (
        <div className="roster-grid">
          <div className="panel glass">
            <div className="panel-h">
              <span className="ttl">starting lineup</span>
              <span className="total">proj {totalProj.toFixed(1)}</span>
            </div>
            <div className="lineup">
              {starters.map((s, i) => {
                const player = s.pid ? players[s.pid] : undefined
                const pts = s.pid ? projFor(s.pid) : 0
                return (
                  <div key={`${s.slot}-${i}`} className="row">
                    <PositionPill position={s.slot} />
                    <div className="who">
                      <div className="nm q-name">{player?.name || '— empty —'}</div>
                      <div className="meta">{player?.team || '—'}{player?.injury_status ? ` · ${player.injury_status}` : ''}</div>
                    </div>
                    <div className="pts tnum">{pts > 0 ? pts.toFixed(1) : '—'}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="panel glass">
            <div className="panel-h">
              <span className="ttl">bench</span>
              <span className="total">proj {benchProj.toFixed(1)}</span>
            </div>
            <div className="lineup">
              {benchIds.length === 0 ? (
                <div className="empty-row">no bench players</div>
              ) : (
                benchIds.map((pid) => {
                  const player = players[pid]
                  const pts = projFor(pid)
                  return (
                    <div key={pid} className="row">
                      <PositionPill position={player?.position || 'BN'} />
                      <div className="who">
                        <div className="nm q-name">{player?.name || pid}</div>
                        <div className="meta">{player?.team || '—'}{player?.injury_status ? ` · ${player.injury_status}` : ''}</div>
                      </div>
                      <div className="pts tnum dim">{pts > 0 ? pts.toFixed(1) : '—'}</div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .empty {
          padding: 80px 20px;
          text-align: center;
          color: var(--ink-3);
          font-family: var(--font-mono);
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .roster-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 900px) {
          .roster-grid {
            grid-template-columns: 1fr;
          }
        }
        .panel {
          overflow: hidden;
        }
        .panel-h {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid var(--line-2);
          background: rgba(115, 110, 245, 0.05);
        }
        .panel-h .ttl {
          font-family: var(--font-display);
          font-size: 18px;
          letter-spacing: 0.04em;
        }
        .panel-h .total {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--neon);
          letter-spacing: 0.08em;
        }
        .lineup {
          padding: 4px 0;
        }
        .row {
          display: grid;
          grid-template-columns: 36px 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 10px 18px;
          border-top: 1px solid var(--line-2);
        }
        .row:first-of-type {
          border-top-color: transparent;
        }
        .row:hover {
          background: rgba(255, 255, 255, 0.015);
        }
        .who {
          min-width: 0;
        }
        .nm {
          font-size: 14px;
          color: var(--ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .meta {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--ink-3);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .pts {
          font-size: 14px;
          font-weight: 600;
          color: var(--ink);
          text-align: right;
        }
        .pts.dim {
          color: var(--ink-3);
        }
        .empty-row {
          padding: 24px 18px;
          color: var(--ink-3);
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.08em;
          text-align: center;
        }
      `}</style>
    </PageFrame>
  )
}
