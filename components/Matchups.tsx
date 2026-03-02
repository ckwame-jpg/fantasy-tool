'use client'

import { useState, useEffect } from 'react'
import { API_BASE_URL } from '@/constants'
import type { RosterOwner } from '@/lib/league-context'

interface MatchupEntry {
  roster_id: number
  matchup_id: number
  points: number
  starters: string[]
  starters_points: number[]
  players: string[]
  players_points: Record<string, number>
}

interface MatchupPair {
  matchupId: number
  teamA: MatchupEntry
  teamB: MatchupEntry | null
}

interface Props {
  leagueId: string
  rosterId: number
  rosterOwners: RosterOwner[]
  players: Record<string, any>
  initialWeek: number
}

export default function Matchups({ leagueId, rosterId, rosterOwners, players, initialWeek }: Props) {
  const [week, setWeek] = useState(initialWeek)
  const [matchups, setMatchups] = useState<MatchupPair[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedMatchup, setExpandedMatchup] = useState<number | null>(null)

  const getOwnerName = (rId: number) => {
    const owner = rosterOwners.find(o => o.rosterId === rId)
    return owner?.displayName || `Team ${rId}`
  }

  const getPlayerInfo = (playerId: string) => {
    const p = players[playerId]
    if (p) return { name: p.name, pos: p.position, team: p.team }
    // Handle defense IDs (team abbreviations like "GB", "DET")
    if (playerId.length <= 4 && playerId === playerId.toUpperCase()) {
      return { name: `${playerId} DEF`, pos: 'DEF', team: playerId }
    }
    return { name: playerId, pos: '', team: '' }
  }

  useEffect(() => {
    if (!leagueId) return
    setLoading(true)
    fetch(`${API_BASE_URL}/sleeper/league/${leagueId}/matchups/${week}`)
      .then(r => r.json())
      .then((data: MatchupEntry[]) => {
        if (!Array.isArray(data)) { setMatchups([]); return }

        // Group by matchup_id into pairs
        const groups: Record<number, MatchupEntry[]> = {}
        for (const entry of data) {
          if (!groups[entry.matchup_id]) groups[entry.matchup_id] = []
          groups[entry.matchup_id].push(entry)
        }

        const pairs: MatchupPair[] = Object.entries(groups)
          .map(([id, entries]) => ({
            matchupId: Number(id),
            teamA: entries[0],
            teamB: entries[1] || null,
          }))
          .sort((a, b) => {
            // Put user's matchup first
            const aHasUser = a.teamA.roster_id === rosterId || a.teamB?.roster_id === rosterId
            const bHasUser = b.teamA.roster_id === rosterId || b.teamB?.roster_id === rosterId
            if (aHasUser && !bHasUser) return -1
            if (!aHasUser && bHasUser) return 1
            return a.matchupId - b.matchupId
          })

        setMatchups(pairs)
      })
      .catch(() => setMatchups([]))
      .finally(() => setLoading(false))
  }, [leagueId, week, rosterId])

  const posColor: Record<string, string> = {
    QB: 'text-red-400', RB: 'text-green-400', WR: 'text-cyan-400',
    TE: 'text-yellow-400', K: 'text-purple-400', DEF: 'text-orange-400',
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">matchups</h1>
        <p className="text-sm text-slate-400">head-to-head scores for your league</p>
      </div>

      {/* Week Selector */}
      <div className="mb-6 flex items-center gap-3">
        <label className="text-sm text-slate-400">week</label>
        <div className="flex items-center gap-1">
          <button
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-sm disabled:opacity-30"
            onClick={() => setWeek(w => Math.max(1, w - 1))}
            disabled={week <= 1}
          >
            &lt;
          </button>
          <select
            className="text-slate-300 text-sm p-2 rounded bg-slate-700"
            value={week}
            onChange={e => setWeek(Number(e.target.value))}
          >
            {Array.from({ length: 18 }, (_, i) => i + 1).map(w => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </select>
          <button
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-sm disabled:opacity-30"
            onClick={() => setWeek(w => Math.min(18, w + 1))}
            disabled={week >= 18}
          >
            &gt;
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading matchups...</div>
      ) : matchups.length === 0 ? (
        <div className="text-slate-500">No matchups found for week {week}.</div>
      ) : (
        <div className="space-y-4">
          {matchups.map(({ matchupId, teamA, teamB }) => {
            const isUserMatchup = teamA.roster_id === rosterId || teamB?.roster_id === rosterId
            const isExpanded = expandedMatchup === matchupId

            return (
              <div
                key={matchupId}
                className={`bg-slate-800 rounded-lg overflow-hidden ${isUserMatchup ? 'ring-1 ring-cyan-500/50' : ''}`}
              >
                {/* Matchup Header */}
                <button
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-750 transition-colors"
                  onClick={() => setExpandedMatchup(isExpanded ? null : matchupId)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Team A */}
                    <div className="flex-1 text-right">
                      <p className={`font-semibold ${teamA.roster_id === rosterId ? 'text-cyan-400' : ''}`}>
                        {getOwnerName(teamA.roster_id)}
                      </p>
                    </div>

                    {/* Scores */}
                    <div className="flex items-center gap-3 px-4">
                      <span className={`text-xl font-bold tabular-nums ${
                        teamB && teamA.points > teamB.points ? 'text-green-400' :
                        teamB && teamA.points < teamB.points ? 'text-red-400' : ''
                      }`}>
                        {(teamA.points || 0).toFixed(1)}
                      </span>
                      <span className="text-slate-500 text-sm">vs</span>
                      <span className={`text-xl font-bold tabular-nums ${
                        teamB && teamB.points > teamA.points ? 'text-green-400' :
                        teamB && teamB.points < teamA.points ? 'text-red-400' : ''
                      }`}>
                        {(teamB?.points || 0).toFixed(1)}
                      </span>
                    </div>

                    {/* Team B */}
                    <div className="flex-1">
                      <p className={`font-semibold ${teamB?.roster_id === rosterId ? 'text-cyan-400' : ''}`}>
                        {teamB ? getOwnerName(teamB.roster_id) : 'BYE'}
                      </p>
                    </div>
                  </div>

                  <span className="text-slate-500 text-sm ml-2">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {/* Expanded Starter Breakdown */}
                {isExpanded && (
                  <div className="border-t border-slate-700 p-4">
                    <div className="grid grid-cols-2 gap-6">
                      {/* Team A Starters */}
                      <div>
                        <p className="text-xs text-slate-500 mb-2 font-semibold uppercase">starters</p>
                        <div className="space-y-1">
                          {(teamA.starters || []).map((pid, i) => {
                            const info = getPlayerInfo(pid)
                            const pts = teamA.starters_points?.[i] ?? 0
                            return (
                              <div key={`a-${pid}-${i}`} className="flex justify-between text-sm">
                                <span>
                                  <span className={`${posColor[info.pos] || 'text-slate-400'} font-medium mr-2 text-xs`}>
                                    {info.pos}
                                  </span>
                                  {info.name}
                                </span>
                                <span className="tabular-nums text-slate-400">{pts.toFixed(1)}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Team B Starters */}
                      {teamB && (
                        <div>
                          <p className="text-xs text-slate-500 mb-2 font-semibold uppercase">starters</p>
                          <div className="space-y-1">
                            {(teamB.starters || []).map((pid, i) => {
                              const info = getPlayerInfo(pid)
                              const pts = teamB.starters_points?.[i] ?? 0
                              return (
                                <div key={`b-${pid}-${i}`} className="flex justify-between text-sm">
                                  <span>
                                    <span className={`${posColor[info.pos] || 'text-slate-400'} font-medium mr-2 text-xs`}>
                                      {info.pos}
                                    </span>
                                    {info.name}
                                  </span>
                                  <span className="tabular-nums text-slate-400">{pts.toFixed(1)}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
