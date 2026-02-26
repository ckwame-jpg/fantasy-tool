'use client'

import { useState, useEffect } from 'react'
import { API_BASE_URL } from '@/constants'
import DraftRecap from '@/components/DraftRecap'
import { useLeague } from '@/lib/league-context'

export default function DraftRecapPage() {
  const { season, myPlayerIds, isConnected, leagueName, leagueSettings } = useLeague()
  const [allPlayers, setAllPlayers] = useState<any[]>([])
  const [draftedPlayers, setDraftedPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'league' | 'draftboard' | 'none'>('none')

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch all players
        const playersRes = await fetch(`${API_BASE_URL}/players?season=${season}&on_team_only=true`)
        const playersData = await playersRes.json()
        const players = Array.isArray(playersData) ? playersData : []
        setAllPlayers(players)

        // If connected to a league, use roster player IDs
        if (isConnected && myPlayerIds.length > 0) {
          const myPlayerIdSet = new Set(myPlayerIds)
          const roster = players.filter((p: any) => myPlayerIdSet.has(String(p.id)))
          setDraftedPlayers(roster)
          setSource('league')
          setLoading(false)
          return
        }

        // Otherwise try loading from draftboard picks
        try {
          const picksRes = await fetch(`${API_BASE_URL}/drafts/global-draft/picks`)
          const picksData = await picksRes.json()
          if (Array.isArray(picksData) && picksData.length > 0) {
            const pickedIds = new Set(picksData.map((p: any) => String(p.player_id)))
            const drafted = players.filter((p: any) => pickedIds.has(String(p.id)))
            if (drafted.length > 0) {
              setDraftedPlayers(drafted)
              setSource('draftboard')
              setLoading(false)
              return
            }
          }
        } catch {
          // draftboard picks not available, that's fine
        }

        setSource('none')
        setLoading(false)
      } catch {
        setError('Failed to load player data. Make sure the backend is running.')
        setLoading(false)
      }
    }

    loadData()
  }, [season, isConnected, myPlayerIds])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">loading draft data...</div>
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

  if (source === 'none' || draftedPlayers.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-3">no draft data found</h2>
          <p className="text-slate-400 text-sm mb-4">
            connect a fantasy platform to import your roster, or use the draftboard to mock draft first.
          </p>
          <div className="flex gap-3 justify-center">
            <a href="/draftboard" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded transition-colors">
              go to draftboard
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {source === 'league' && (
        <div className="bg-slate-950 px-4 md:px-8 pt-6">
          <div className="max-w-4xl mx-auto">
            <span className="text-xs text-slate-500">
              showing roster from <span className="text-slate-300">{leagueName}</span>
            </span>
          </div>
        </div>
      )}
      {source === 'draftboard' && (
        <div className="bg-slate-950 px-4 md:px-8 pt-6">
          <div className="max-w-4xl mx-auto">
            <span className="text-xs text-slate-500">
              showing picks from draftboard
            </span>
          </div>
        </div>
      )}
      <DraftRecap draftedPlayers={draftedPlayers} onClose={() => {}} isPage rosterSlots={leagueSettings.rosterSlots} />
    </div>
  )
}
