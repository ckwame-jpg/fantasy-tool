'use client'

import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import { API_BASE_URL } from '@/constants'
import WaiverWire from '@/components/WaiverWire'
import PageFrame from '@/components/PageFrame'
import { useLeague } from '@/lib/league-context'

export default function WaiverWirePage() {
  const { season, isConnected, allRosteredIds, leagueSettings, rosterOwners } = useLeague()
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

  const rosteredPlayers = isConnected ? players.filter((p) => allRosteredIds.includes(String(p.id))) : []
  const availableCount = Math.max(0, players.length - rosteredPlayers.length)

  const heroChips = [
    { label: 'available', value: availableCount.toLocaleString() },
    { label: 'rostered', value: rosteredPlayers.length.toLocaleString() },
    { label: 'teams', value: String(rosterOwners.length || 12) },
  ]

  return (
    <PageFrame
      crumb="waiver wire"
      rightPill={
        <span className="week-pill">
          <Users size={12} />
          live priority
        </span>
      }
      hero={{
        eyebrow: 'team ops · waiver wire',
        title: (
          <>
            find the <span className="ch-hl">next breakout</span> before your league does.
          </>
        ),
        sub: (
          <>
            ranked by priority, filtered to available players in your league. trending adds, projection deltas, and bid recommendations
            baked in.
          </>
        ),
        chips: heroChips,
      }}
    >
      {loading ? (
        <div className="empty-state">loading available players…</div>
      ) : error ? (
        <div className="empty-state error">{error}</div>
      ) : (
        <div className="ww-wrap">
          <WaiverWire allPlayers={players} draftedPlayers={rosteredPlayers} onClose={() => {}} isPage />
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
        .ww-wrap {
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
