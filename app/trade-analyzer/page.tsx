'use client'

import { useState, useEffect } from 'react'
import { TrendingUp } from 'lucide-react'
import { API_BASE_URL } from '@/constants'
import TradeAnalyzer from '@/components/TradeAnalyzer'
import PageFrame from '@/components/PageFrame'
import { useLeague } from '@/lib/league-context'

export default function TradeAnalyzerPage() {
  const { season, isConnected, myPlayerIds, leagueSettings, rosterOwners } = useLeague()
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/players?season=${season}&on_team_only=true&scoring=${leagueSettings.scoringFormat}`)
      .then((r) => r.json())
      .then((data) => {
        setPlayers(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load player data. Make sure the backend is running.')
        setLoading(false)
      })
  }, [season, leagueSettings.scoringFormat])

  const heroChips = [
    { label: 'format', value: leagueSettings.leagueType },
    { label: 'scoring', value: leagueSettings.scoringFormat.toUpperCase() },
    { label: 'teams', value: String(rosterOwners.length || 12) },
    { label: 'season', value: String(season) },
  ]

  return (
    <PageFrame
      crumb="trade analyzer"
      rightPill={
        <span className="week-pill">
          <TrendingUp size={12} />
          VORP engine
        </span>
      }
      hero={{
        eyebrow: 'team ops · trade desk',
        title: (
          <>
            grade any deal <span className="ch-hl">before</span> you accept it.
          </>
        ),
        sub: (
          <>
            VORP-based valuation with <b>contender / rebuilder</b> modes, dynasty pick values, Sleeper trending data, and projected lineup
            impact for both sides.
          </>
        ),
        chips: heroChips,
      }}
    >
      {loading ? (
        <div className="empty-state">loading player values…</div>
      ) : error ? (
        <div className="empty-state error">{error}</div>
      ) : (
        <div className="ta-wrap">
          <TradeAnalyzer
            allPlayers={players}
            onClose={() => {}}
            isPage
            myPlayerIds={isConnected ? myPlayerIds : undefined}
            leagueSettings={leagueSettings}
            currentSeason={season}
            leagueSize={rosterOwners.length || 12}
            rosterOwners={isConnected ? rosterOwners : undefined}
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
        .empty-state.error {
          color: var(--hot);
        }
        .ta-wrap {
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-xl);
          background: var(--surface);
          backdrop-filter: blur(var(--glass-blur));
          overflow: hidden;
        }
      `}</style>
    </PageFrame>
  )
}
