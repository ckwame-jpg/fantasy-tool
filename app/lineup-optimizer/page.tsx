'use client'

import { useState, useEffect, useRef } from 'react'
import { API_BASE_URL } from '@/constants'
import LineupOptimizer from '@/components/LineupOptimizer'
import { useLeague } from '@/lib/league-context'
import { computeDefenseMultipliers } from '@/lib/player-utils'

export default function LineupOptimizerPage() {
  const { season, isConnected, myPlayerIds, leagueName, leagueSettings } = useLeague()
  const [allPlayers, setAllPlayers] = useState<any[]>([])
  const [defenseMultipliers, setDefenseMultipliers] = useState<Record<string, number>>({})
  const [roster, setRoster] = useState<any[]>([])
  const [rosterImported, setRosterImported] = useState(false)
  const [search, setSearch] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/players?season=${season}&on_team_only=true&scoring=${leagueSettings.scoringFormat}`)
      .then(r => r.json())
      .then(data => {
        const players = Array.isArray(data) ? data : []
        setAllPlayers(players)
        setDefenseMultipliers(computeDefenseMultipliers(players))

        // Auto-populate roster from league connection
        if (isConnected && myPlayerIds.length > 0 && !rosterImported) {
          const idSet = new Set(myPlayerIds)
          const myRoster = players.filter((p: any) => idSet.has(String(p.id)))
          if (myRoster.length > 0) {
            setRoster(myRoster)
            setRosterImported(true)
          }
        }

        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load player data. Make sure the backend is running.')
        setLoading(false)
      })
  }, [isConnected, myPlayerIds, season, leagueSettings.scoringFormat])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredPlayers = allPlayers
    .filter(p =>
      search.length > 0 &&
      p.name?.toLowerCase().includes(search.toLowerCase()) &&
      !roster.find(r => r.id === p.id)
    )
    .slice(0, 10)

  const addToRoster = (player: any) => {
    setRoster(prev => [...prev, player])
    setSearch('')
    setShowResults(false)
  }

  const removeFromRoster = (id: string) => {
    setRoster(prev => prev.filter(p => p.id !== id))
  }

  const positionColors: Record<string, string> = {
    QB: 'text-red-400',
    RB: 'text-green-400',
    WR: 'text-blue-400',
    TE: 'text-yellow-400',
    K: 'text-purple-400',
    DEF: 'text-slate-400',
  }

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
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Roster Builder */}
      <div className="bg-slate-900 border-b border-slate-700 p-6">
        <h1 className="text-2xl font-bold mb-1">lineup optimizer</h1>
        <p className="text-sm text-slate-400 mb-4">
          build your roster below, then the optimizer will find your best weekly lineup.
        </p>
        {rosterImported && (
          <div className="text-xs text-green-400/80 bg-green-500/10 border border-green-500/20 rounded px-3 py-1.5 mb-4 inline-block">
            roster imported from {leagueName}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Search */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">add players to your roster</label>
            <div className="relative" ref={searchRef}>
              <input
                type="text"
                placeholder="Search by name (e.g. Tyreek Hill)..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setShowResults(e.target.value.length > 0)
                }}
                onFocus={() => search.length > 0 && setShowResults(true)}
                className="w-full bg-slate-700 text-white placeholder-slate-500 px-3 py-2 rounded border border-slate-600 focus:outline-none focus:border-slate-400"
              />
              {showResults && filteredPlayers.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-slate-700 border border-slate-600 rounded mt-1 max-h-60 overflow-y-auto z-10 shadow-lg">
                  {filteredPlayers.map(player => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => addToRoster(player)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-600 flex items-center gap-3 border-b border-slate-600 last:border-0"
                    >
                      <span className={`text-xs font-bold w-8 shrink-0 ${positionColors[player.position] ?? 'text-slate-400'}`}>
                        {player.position}
                      </span>
                      <span className="font-medium">{player.name}</span>
                      <span className="text-xs text-slate-400 ml-auto">{player.team}</span>
                    </button>
                  ))}
                </div>
              )}
              {showResults && search.length > 0 && filteredPlayers.length === 0 && (
                <div className="absolute top-full left-0 right-0 bg-slate-700 border border-slate-600 rounded mt-1 px-3 py-2 text-slate-400 text-sm z-10">
                  No players found
                </div>
              )}
            </div>
          </div>

          {/* Current Roster */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-400">
                your roster ({roster.length} players)
              </label>
              {roster.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRoster([])}
                  className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
            {roster.length === 0 ? (
              <div className="text-sm text-slate-500 py-3">
                search for players above to build your roster.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {roster.map(player => (
                  <div
                    key={player.id}
                    className="flex items-center gap-1.5 bg-slate-700 rounded px-2 py-1 text-sm"
                  >
                    <span className={`text-xs font-bold ${positionColors[player.position] ?? 'text-slate-400'}`}>
                      {player.position}
                    </span>
                    <span>{player.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFromRoster(player.id)}
                      className="text-slate-500 hover:text-red-400 ml-1 leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Optimizer */}
      <LineupOptimizer draftedPlayers={roster} onClose={() => {}} isPage rosterSlots={leagueSettings.rosterSlots} defenseMultipliers={defenseMultipliers} />
    </div>
  )
}
