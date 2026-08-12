'use client'

import { useState, useEffect } from 'react'
import { API_BASE_URL } from '@/constants'
import type { RosterOwner } from '@/lib/league-context'

interface SleeperTransaction {
  type: 'trade' | 'waiver' | 'free_agent' | 'commissioner'
  status: string
  adds: Record<string, number> | null
  drops: Record<string, number> | null
  draft_picks: any[]
  roster_ids: number[]
  creator: string
  created: number
  settings: { waiver_bid?: number } | null
  metadata: { notes?: string } | null
  transaction_id: string
}

interface Props {
  leagueId: string
  rosterOwners: RosterOwner[]
  players: Record<string, any>
  initialWeek: number
}

export default function Transactions({ leagueId, rosterOwners, players, initialWeek }: Props) {
  const [week, setWeek] = useState(initialWeek)
  const [transactions, setTransactions] = useState<SleeperTransaction[]>([])
  const [loading, setLoading] = useState(false)

  const getOwnerName = (rId: number) => {
    const owner = rosterOwners.find(o => o.rosterId === rId)
    return owner?.displayName || `Team ${rId}`
  }

  const getPlayerName = (playerId: string) => {
    const p = players[playerId]
    return p ? p.name : `Player ${playerId}`
  }

  const getPlayerPos = (playerId: string) => {
    const p = players[playerId]
    return p?.position || ''
  }

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  useEffect(() => {
    if (!leagueId) return
    setLoading(true)
    fetch(`${API_BASE_URL}/sleeper/league/${leagueId}/transactions/${week}`)
      .then(r => r.json())
      .then((data: SleeperTransaction[]) => {
        if (!Array.isArray(data)) { setTransactions([]); return }
        // Sort by most recent first
        setTransactions(data.sort((a, b) => b.created - a.created))
      })
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false))
  }, [leagueId, week])

  const typeBadge: Record<string, { label: string; color: string }> = {
    trade: { label: 'Trade', color: 'bg-purple-500/20 text-purple-400' },
    waiver: { label: 'Waiver', color: 'bg-yellow-500/20 text-yellow-400' },
    free_agent: { label: 'Free Agent', color: 'bg-green-500/20 text-green-400' },
    commissioner: { label: 'Commish', color: 'bg-red-500/20 text-red-400' },
  }

  const posColor: Record<string, string> = {
    QB: 'text-red-400', RB: 'text-green-400', WR: 'text-cyan-400',
    TE: 'text-yellow-400', K: 'text-purple-400', DEF: 'text-orange-400',
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">transactions</h1>
        <p className="text-sm text-slate-400">trades, waivers, and free agent moves</p>
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
        <div className="text-slate-400">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="text-slate-500">No transactions found for week {week}.</div>
      ) : (
        <div className="space-y-3">
          {transactions.map(tx => {
            const badge = typeBadge[tx.type] || typeBadge.free_agent
            const adds = tx.adds ? Object.entries(tx.adds) : []
            const drops = tx.drops ? Object.entries(tx.drops) : []

            return (
              <div key={tx.transaction_id} className="bg-slate-800 rounded-lg p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${badge.color}`}>
                      {badge.label}
                    </span>
                    {tx.settings?.waiver_bid != null && tx.settings.waiver_bid > 0 && (
                      <span className="text-xs text-slate-400">
                        ${tx.settings.waiver_bid} FAAB
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">{formatTime(tx.created)}</span>
                </div>

                {/* Trade: show both sides */}
                {tx.type === 'trade' ? (
                  <div className="space-y-2">
                    {tx.roster_ids.map(rId => {
                      const teamAdds = adds.filter(([, r]) => r === rId)
                      const teamDrops = drops.filter(([, r]) => r === rId)
                      // Draft picks this team received
                      const picksReceived = tx.draft_picks?.filter((dp: any) => dp.owner_id === rId) || []

                      return (
                        <div key={rId} className="bg-slate-700/50 rounded p-3">
                          <p className="text-sm font-semibold mb-1">{getOwnerName(rId)} receives:</p>
                          <div className="flex flex-wrap gap-2">
                            {teamAdds.map(([pid]) => (
                              <span key={pid} className="text-sm bg-green-500/10 text-green-400 px-2 py-0.5 rounded">
                                <span className={`${posColor[getPlayerPos(pid)] || ''} mr-1 text-xs`}>
                                  {getPlayerPos(pid)}
                                </span>
                                {getPlayerName(pid)}
                              </span>
                            ))}
                            {picksReceived.map((dp: any, i: number) => (
                              <span key={`pick-${i}`} className="text-sm bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">
                                {dp.season} Round {dp.round}
                              </span>
                            ))}
                            {teamAdds.length === 0 && picksReceived.length === 0 && (
                              <span className="text-xs text-slate-500">nothing</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  /* Waiver / Free Agent: show adds and drops */
                  <div className="flex flex-wrap gap-3">
                    {adds.map(([pid, rId]) => (
                      <div key={`add-${pid}`} className="flex items-center gap-1 text-sm">
                        <span className="text-green-400 font-bold text-xs">+</span>
                        <span className={`${posColor[getPlayerPos(pid)] || ''} text-xs`}>
                          {getPlayerPos(pid)}
                        </span>
                        <span>{getPlayerName(pid)}</span>
                        <span className="text-slate-500 text-xs">to {getOwnerName(rId)}</span>
                      </div>
                    ))}
                    {drops.map(([pid, rId]) => (
                      <div key={`drop-${pid}`} className="flex items-center gap-1 text-sm">
                        <span className="text-red-400 font-bold text-xs">-</span>
                        <span className={`${posColor[getPlayerPos(pid)] || ''} text-xs`}>
                          {getPlayerPos(pid)}
                        </span>
                        <span className="text-slate-400">{getPlayerName(pid)}</span>
                        <span className="text-slate-500 text-xs">from {getOwnerName(rId)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Status */}
                {tx.status !== 'complete' && (
                  <p className="text-xs text-slate-500 mt-2">Status: {tx.status}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
