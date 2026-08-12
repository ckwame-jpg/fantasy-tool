'use client'

import { useEffect, useMemo, useState } from 'react'
import { ListOrdered } from 'lucide-react'
import { API_BASE_URL } from '@/constants'
import PageFrame from '@/components/PageFrame'
import { useLeague } from '@/lib/league-context'

interface StandingsRow {
  rosterId: number
  ownerId: string
  name: string
  wins: number
  losses: number
  ties: number
  pf: number
  pa: number
  streak: string
}

export default function StandingsPage() {
  const { isConnected, leagueId, rosterOwners, leagueName, rosterId } = useLeague()
  const [rows, setRows] = useState<StandingsRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConnected || !leagueId) {
      setLoading(false)
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/sleeper/league/${leagueId}/rosters`)
        const rosters = await res.json()
        if (cancelled || !Array.isArray(rosters)) return
        const ownerMap = new Map(rosterOwners.map((o) => [o.rosterId, o]))
        const next: StandingsRow[] = rosters.map((r: any) => {
          const s: Record<string, number> = r.settings || {}
          const pf = Number(s.fpts || 0) + Number(s.fpts_decimal || 0) / 100
          const pa = Number(s.fpts_against || 0) + Number(s.fpts_against_decimal || 0) / 100
          const streak = Number(s.streak || 0)
          const owner = ownerMap.get(r.roster_id)
          return {
            rosterId: r.roster_id,
            ownerId: r.owner_id || '',
            name: owner?.displayName || `Team ${r.roster_id}`,
            wins: Number(s.wins || 0),
            losses: Number(s.losses || 0),
            ties: Number(s.ties || 0),
            pf,
            pa,
            streak: streak === 0 ? '—' : streak > 0 ? `W${streak}` : `L${Math.abs(streak)}`,
          }
        })
        next.sort((a, b) => (b.wins !== a.wins ? b.wins - a.wins : b.pf - a.pf))
        setRows(next)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [isConnected, leagueId, rosterOwners])

  const totals = useMemo(() => {
    const totalPf = rows.reduce((sum, r) => sum + r.pf, 0)
    const avgPf = rows.length ? totalPf / rows.length : 0
    return { totalPf, avgPf }
  }, [rows])

  return (
    <PageFrame
      crumb="standings"
      rightPill={
        <span className="week-pill">
          <ListOrdered size={12} />
          {leagueName || 'standings'}
        </span>
      }
      hero={{
        eyebrow: 'league · standings',
        title: (
          <>
            the <span className="ch-hl">leaderboard</span>, fully sorted.
          </>
        ),
        sub: <>seeds, points-for, points-against, and streaks for every team in the league.</>,
        chips: [
          { label: 'teams', value: String(rows.length || rosterOwners.length || '—') },
          { label: 'avg PF', value: totals.avgPf > 0 ? totals.avgPf.toFixed(1) : '—' },
        ],
      }}
    >
      {!isConnected ? (
        <div className="empty">connect a Sleeper league to view standings.</div>
      ) : loading ? (
        <div className="empty">loading standings…</div>
      ) : (
        <div className="board glass">
          <div className="hd">
            <div>seed</div>
            <div>team</div>
            <div className="num">w-l</div>
            <div className="num">pf</div>
            <div className="num">pa</div>
            <div className="num">diff</div>
            <div className="num">streak</div>
          </div>
          {rows.map((r, idx) => {
            const isYou = r.rosterId === rosterId
            const diff = r.pf - r.pa
            return (
              <div key={r.rosterId} className={`row ${isYou ? 'you' : ''}`}>
                <div className="seed">{idx + 1}</div>
                <div className="team q-name">{r.name}</div>
                <div className="num tnum">
                  {r.ties > 0 ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`}
                </div>
                <div className="num tnum">{r.pf.toFixed(1)}</div>
                <div className="num tnum">{r.pa.toFixed(1)}</div>
                <div className={`num tnum ${diff >= 0 ? 'pos' : 'neg'}`}>
                  {diff >= 0 ? '+' : ''}
                  {diff.toFixed(1)}
                </div>
                <div className={`num tnum ${r.streak.startsWith('W') ? 'pos' : r.streak.startsWith('L') ? 'neg' : ''}`}>{r.streak}</div>
              </div>
            )
          })}
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
        .board {
          overflow: hidden;
        }
        .hd,
        .row {
          display: grid;
          grid-template-columns: 64px 1fr 90px 90px 90px 90px 80px;
          align-items: center;
          padding: 12px 18px;
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
          position: relative;
        }
        .row:first-of-type {
          border-top: none;
        }
        .row:hover {
          background: rgba(255, 255, 255, 0.015);
        }
        .row.you {
          background: linear-gradient(90deg, rgba(115, 110, 245, 0.1), transparent 80%);
        }
        .row.you::before {
          content: '';
          position: absolute;
          left: 0;
          top: 6px;
          bottom: 6px;
          width: 2px;
          background: var(--neon);
          box-shadow: 0 0 8px var(--neon);
        }
        .num {
          text-align: right;
        }
        .seed {
          font-family: var(--font-display);
          font-size: 22px;
          color: var(--ink-3);
          line-height: 1;
        }
        .row:nth-of-type(2) .seed {
          color: var(--gold);
        }
        .row.you .seed {
          color: var(--neon);
        }
        .team {
          font-size: 14px;
          color: var(--ink);
          /* min-width: 0 lets the 1fr column actually shrink instead of
             being forced to fit the longest team name (which was pushing
             PF/PA off-screen on mobile). */
          min-width: 0;
          overflow: hidden;
        }
        .team .stand-nm {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
          max-width: 100%;
        }
        .pos {
          color: var(--color-cosmos-pos);
        }
        .neg {
          color: var(--color-cosmos-neg);
        }
        @media (max-width: 720px) {
          .hd,
          .row {
            grid-template-columns: 32px minmax(0, 1fr) 56px 50px 50px;
            gap: 8px !important;
            padding: 8px 12px !important;
          }
          .hd > :nth-child(6),
          .hd > :nth-child(7),
          .row > :nth-child(6),
          .row > :nth-child(7) {
            display: none;
          }
          .seed {
            font-size: 16px !important;
          }
          .team {
            font-size: 13px !important;
          }
          .stand-rec {
            font-size: 10px !important;
          }
          .num.tnum {
            font-size: 12px !important;
          }
        }
      `}</style>
    </PageFrame>
  )
}
