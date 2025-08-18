'use client'

import { use, useEffect, useState } from 'react'
import { API_BASE_URL } from "@/constants"

type TeamPageProps = {
  params: Promise<{ id: string }>
}

type Team = {
  id: string
  name: string
  picks: any[]
}

export default function TeamPage({ params }: TeamPageProps) {
  const { id } = use(params)
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/teams`)
        if (res.ok) {
          const teams = await res.json()
          const foundTeam = teams.find((t: Team) => t.id === id)
          setTeam(foundTeam || null)
        }
      } catch (error) {
        console.error("Failed to fetch team:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTeam()
  }, [id])

  const setAsActiveTeam = async () => {
    if (!team) return
    
    try {
      const res = await fetch(`${API_BASE_URL}/teams/active?team_id=${team.id}`, {
        method: "POST",
      })
      if (res.ok) {
        alert(`"${team.name}" is now your active team!`)
      }
    } catch (error) {
      console.error("Failed to set active team:", error)
      alert("Failed to set active team.")
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-zinc-400">Loading team...</div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">Team Not Found</h1>
        <p className="text-zinc-400">Team with ID "{id}" was not found.</p>
      </div>
    )
  }

  // Group picks by position for easier viewing
  const picksByPosition = (team.picks || []).reduce((acc: any, pick: any) => {
    const pos = pick.position || 'Unknown'
    if (!acc[pos]) acc[pos] = []
    acc[pos].push(pick)
    return acc
  }, {})

  // Sort positions for consistent display
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'Unknown'].filter(pos => picksByPosition[pos])

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{team.name}</h1>
          <p className="text-zinc-400">
            {team.picks?.length || 0} players drafted
          </p>
          {/* Debug info */}
          <details className="mt-2">
            <summary className="text-xs text-zinc-500 cursor-pointer">Debug Info</summary>
            <pre className="text-xs text-zinc-600 mt-1 bg-zinc-900 p-2 rounded overflow-auto">
              {JSON.stringify(team, null, 2)}
            </pre>
          </details>
        </div>
        <button
          onClick={setAsActiveTeam}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
        >
          Set as Active Team
        </button>
      </div>

      {team.picks && team.picks.length > 0 ? (
        <div className="space-y-6">
          {positions.map(position => (
            <div key={position} className="bg-zinc-800 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-3 text-purple-400">
                {position} ({picksByPosition[position].length})
              </h2>
              <div className="grid gap-2">
                {picksByPosition[position]
                  .sort((a: any, b: any) => (a.overall || 0) - (b.overall || 0))
                  .map((pick: any, index: number) => (
                  <div 
                    key={pick.id || index}
                    className="flex items-center justify-between bg-zinc-700 rounded p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-zinc-400 w-12">
                        {pick.overall ? `#${pick.overall}` : '-'}
                      </span>
                      <span className="font-medium">{pick.player_name}</span>
                      <span className="text-sm text-zinc-400">{pick.team}</span>
                    </div>
                    <div className="text-sm text-zinc-400">
                      Round {pick.round || '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-zinc-800 rounded-lg p-8 text-center">
          <p className="text-zinc-400 mb-4">No players drafted yet</p>
          <p className="text-sm text-zinc-500 mb-4">
            This team was saved with 0 players. Go to the Draftboard to draft players, then save them to a new team.
          </p>
          <div className="flex gap-2 justify-center">
            <a
              href="/draftboard"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
            >
              Go to Draftboard
            </a>
          </div>
        </div>
      )}
    </div>
  )
}