'use client'

import { useState, useEffect } from 'react'
import { API_BASE_URL } from '@/constants'
import TradeAnalyzer from '@/components/TradeAnalyzer'
import { useLeague } from '@/lib/league-context'

export default function TradeAnalyzerPage() {
  const { season, isConnected, myPlayerIds, leagueSettings, rosterOwners } = useLeague()
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/players?season=${season}&on_team_only=true&scoring=${leagueSettings.scoringFormat}`)
      .then(r => r.json())
      .then(data => {
        setPlayers(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load player data. Make sure the backend is running.')
        setLoading(false)
      })
  }, [season, leagueSettings.scoringFormat])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading players...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    )
  }

  return (
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
  )
}
