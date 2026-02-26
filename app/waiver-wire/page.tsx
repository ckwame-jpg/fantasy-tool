'use client'

import { useState, useEffect } from 'react'
import { API_BASE_URL } from '@/constants'
import WaiverWire from '@/components/WaiverWire'
import { useLeague } from '@/lib/league-context'

export default function WaiverWirePage() {
  const { season, isConnected, allRosteredIds, leagueSettings } = useLeague()
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

  // When connected to a league, filter out rostered players
  const rosteredPlayers = isConnected
    ? players.filter(p => allRosteredIds.includes(String(p.id)))
    : []

  return <WaiverWire allPlayers={players} draftedPlayers={rosteredPlayers} onClose={() => {}} isPage />
}
