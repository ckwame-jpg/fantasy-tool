'use client'

import { useState, useEffect } from 'react'
import { API_BASE_URL } from '@/constants'
import Transactions from '@/components/Transactions'
import { useLeague } from '@/lib/league-context'

export default function TransactionsPage() {
  const { isConnected, leagueId, rosterOwners } = useLeague()
  const [currentWeek, setCurrentWeek] = useState(1)
  const [players, setPlayers] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE_URL}/sleeper/state/nfl`)
      .then(r => r.json())
      .then(data => {
        const week = data.week || data.display_week || 1
        setCurrentWeek(Math.max(week, 1))
      })
      .catch(() => setCurrentWeek(1))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE_URL}/players?season=2026&on_team_only=false`)
      .then(r => r.json())
      .then(data => {
        const map: Record<string, any> = {}
        for (const p of Array.isArray(data) ? data : []) {
          map[String(p.id)] = p
        }
        setPlayers(map)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Connect to a Sleeper league to view transactions.</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <Transactions
      leagueId={leagueId}
      rosterOwners={rosterOwners}
      players={players}
      initialWeek={currentWeek}
    />
  )
}
