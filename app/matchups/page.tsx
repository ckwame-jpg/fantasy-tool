'use client'

import { useState, useEffect } from 'react'
import { Globe2 } from 'lucide-react'
import { API_BASE_URL } from '@/constants'
import Matchups from '@/components/Matchups'
import PageFrame from '@/components/PageFrame'
import { useLeague } from '@/lib/league-context'

export default function MatchupsPage() {
  const { isConnected, leagueId, rosterId, rosterOwners, leagueName } = useLeague()
  const [currentWeek, setCurrentWeek] = useState(1)
  const [loading, setLoading] = useState(true)
  const [players, setPlayers] = useState<Record<string, any>>({})

  useEffect(() => {
    fetch(`${API_BASE_URL}/sleeper/state/nfl`)
      .then((r) => r.json())
      .then((data) => {
        const week = data.week || data.display_week || 1
        setCurrentWeek(Math.max(week, 1))
      })
      .catch(() => setCurrentWeek(1))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE_URL}/players?season=2026&on_team_only=false`)
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, any> = {}
        for (const p of Array.isArray(data) ? data : []) map[String(p.id)] = p
        setPlayers(map)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const heroChips = [
    { label: 'week', value: String(currentWeek) },
    { label: 'teams', value: String(rosterOwners.length || 12) },
    { label: 'league', value: leagueName || '—' },
  ]

  return (
    <PageFrame
      crumb="matchups"
      rightPill={
        <span className="week-pill">
          <span className="live-d" />
          week {currentWeek}
        </span>
      }
      hero={{
        eyebrow: 'league · matchups',
        title: (
          <>
            every <span className="ch-hl">scoreboard</span> in your league, one screen.
          </>
        ),
        sub: <>live points, projections, and head-to-head deltas across the entire week. switch weeks to scout next opponents.</>,
        chips: heroChips,
      }}
    >
      {!isConnected ? (
        <div className="empty-state">connect a Sleeper league to view matchups.</div>
      ) : loading ? (
        <div className="empty-state">loading matchups…</div>
      ) : (
        <div className="m-wrap">
          <Matchups
            leagueId={leagueId}
            rosterId={rosterId}
            rosterOwners={rosterOwners}
            players={players}
            initialWeek={currentWeek}
          />
        </div>
      )}

      <style jsx>{`
        .empty-state {
          padding: 80px 20px;
          text-align: center;
          color: var(--ink-3);
          font-family: var(--font-mono);
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .m-wrap {
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-xl);
          background: var(--surface);
          backdrop-filter: blur(var(--glass-blur));
          overflow: hidden;
        }
        .live-d {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--neon);
          box-shadow: 0 0 8px var(--neon);
          animation: pulse 1.6s ease-in-out infinite;
        }
      `}</style>
    </PageFrame>
  )
}
