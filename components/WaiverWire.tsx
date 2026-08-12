'use client'

import { useState, useMemo } from 'react'
import { getPlayerTier, getByeWeekInfo, getTargetShare } from '@/lib/player-utils'

interface WaiverWireProps {
  allPlayers: any[]
  draftedPlayers: any[]
  onClose: () => void
  isPage?: boolean
}

interface WaiverTarget {
  player: any
  priority: 'High' | 'Medium' | 'Low'
  reason: string
  projectedPoints: number
  ownershipRate: number
}

export default function WaiverWire({ allPlayers, draftedPlayers, onClose, isPage }: WaiverWireProps) {
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [positionFilter, setPositionFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')

  // Calculate waiver wire targets
  const waiverTargets = useMemo(() => {
    const draftedIds = new Set(draftedPlayers.map(p => p.id))
    const availablePlayers = allPlayers.filter(player => !draftedIds.has(player.id))
    
    return availablePlayers.map(player => {
      const fp = player.fantasyPoints || 0
      const tier = getPlayerTier(player.position, player.adp || 999)
      const byeWeek = getByeWeekInfo(player.team)
      const targetShare = getTargetShare(player.id, player.position)

      // Ownership estimate based on ADP (lower ADP = higher ownership)
      const ownershipRate = Math.max(0, Math.min(95,
        90 - (player.adp || 200) * 0.4
      ))

      let priority: 'High' | 'Medium' | 'Low' = 'Low'
      let reason = ''

      // Determine priority and reason
      if (ownershipRate < 30 && fp > 200) {
        priority = 'High'
        reason = 'High upside, low ownership'
      } else if (ownershipRate < 50 && tier.tier <= 6) {
        priority = 'High'
        reason = 'Quality player still available'
      } else if (ownershipRate < 60 && fp > 150) {
        priority = 'Medium'
        reason = 'Solid contributor, decent availability'
      } else if (player.position === 'RB' && ownershipRate < 70) {
        priority = 'Medium'
        reason = 'RB depth is valuable'
      } else if (targetShare && parseFloat(targetShare.percentage) > 15) {
        priority = 'Medium'
        reason = `High target share (${targetShare.percentage}%)`
      } else if (ownershipRate < 80) {
        priority = 'Low'
        reason = 'Lottery ticket'
      } else {
        priority = 'Low'
        reason = 'Deep bench option'
      }
      
      // Boost priority for specific scenarios
      if (selectedWeek >= 3 && selectedWeek <= 6 && byeWeek.week === selectedWeek + 1) {
        priority = priority === 'Low' ? 'Medium' : priority === 'Medium' ? 'High' : priority
        reason += ' (Pre-bye week pickup)'
      }
      
      return {
        player,
        priority,
        reason,
        projectedPoints: fp,
        ownershipRate: Math.round(ownershipRate)
      } as WaiverTarget
    }).sort((a, b) => {
      const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return b.projectedPoints - a.projectedPoints
    })
  }, [allPlayers, draftedPlayers, selectedWeek])

  // Filter targets
  const filteredTargets = waiverTargets.filter(target => {
    if (positionFilter !== 'ALL' && target.player.position !== positionFilter) return false
    if (priorityFilter !== 'ALL' && target.priority !== priorityFilter) return false
    return true
  }).slice(0, 50) // Limit to top 50 for performance

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-400 bg-red-900/20'
      case 'Medium': return 'text-yellow-400 bg-yellow-900/20'
      case 'Low': return 'text-green-400 bg-green-900/20'
      default: return 'text-slate-400 bg-slate-800'
    }
  }

  const getWaiverTips = () => {
    const highPriorityCount = filteredTargets.filter(t => t.priority === 'High').length
    const rbDepth = draftedPlayers.filter(p => p.position === 'RB').length
    const wrDepth = draftedPlayers.filter(p => p.position === 'WR').length
    
    const tips = []
    
    if (highPriorityCount > 0) {
      tips.push(`${highPriorityCount} high-priority targets available`)
    }
    
    if (rbDepth < 4) {
      tips.push('Consider adding RB depth - injuries are common')
    }
    
    if (wrDepth < 5) {
      tips.push('WR depth provides flexibility for trades')
    }
    
    if (selectedWeek >= 3) {
      tips.push('Look ahead to bye weeks when setting waiver claims')
    }
    
    tips.push('Handcuff your RB1 with their backup if available')
    tips.push('Target players with upcoming favorable matchups')
    
    return tips
  }

  const outer = isPage
    ? 'min-h-screen bg-slate-950 text-white'
    : 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
  const inner = isPage
    ? 'bg-slate-900 w-full min-h-screen'
    : 'bg-slate-900 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto'

  return (
    <div className={outer}>
      <div className={inner}>
        <div className="p-6 border-b border-slate-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">waiver wire</h2>
            {!isPage && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white text-xl font-bold"
              >
                ×
              </button>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-2">
            Find the best available players for your team
          </p>
        </div>

        <div className="p-6">
          {/* Controls */}
          <div className="bg-slate-800 p-4 rounded-lg mb-6">
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Week</label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="w-full bg-slate-700 text-white p-2 rounded"
                  title="Select week to view waiver wire targets for"
                >
                  {Array.from({ length: 17 }, (_, i) => i + 1).map(week => (
                    <option key={week} value={week}>Week {week}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Position</label>
                <select
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  className="w-full bg-slate-700 text-white p-2 rounded"
                  title="Filter waiver wire players by position"
                >
                  <option value="ALL">All Positions</option>
                  <option value="QB">QB</option>
                  <option value="RB">RB</option>
                  <option value="WR">WR</option>
                  <option value="TE">TE</option>
                  <option value="K">K</option>
                  <option value="DEF">DEF</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full bg-slate-700 text-white p-2 rounded"
                  title="Filter players by waiver wire priority level"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-700 p-3 rounded">
              <h3 className="font-semibold mb-2">week {selectedWeek} tips</h3>
              <ul className="text-sm space-y-1">
                {getWaiverTips().map((tip, index) => (
                  <li key={index} className="text-slate-300">• {tip}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-400">
                {filteredTargets.filter(t => t.priority === 'High').length}
              </div>
              <div className="text-sm text-slate-400">high priority</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {filteredTargets.filter(t => t.priority === 'Medium').length}
              </div>
              <div className="text-sm text-slate-400">medium priority</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-400">
                {filteredTargets.filter(t => t.priority === 'Low').length}
              </div>
              <div className="text-sm text-slate-400">low priority</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-400">
                {filteredTargets.filter(t => t.ownershipRate < 50).length}
              </div>
              <div className="text-sm text-slate-400">low ownership</div>
            </div>
          </div>

          {/* Player List */}
          <div className="bg-slate-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="text-left p-3">player</th>
                    <th className="text-left p-3">position</th>
                    <th className="text-left p-3">priority</th>
                    <th className="text-left p-3">ownership</th>
                    <th className="text-left p-3">proj. pts</th>
                    <th className="text-left p-3">reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTargets.map((target, index) => (
                    <tr key={target.player.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="p-3">
                        <div className="font-semibold">{target.player.name}</div>
                        <div className="text-xs text-slate-400">{target.player.team}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-slate-600 rounded text-xs">
                          {target.player.position}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(target.priority)}`}>
                          {target.priority}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`font-semibold ${
                          target.ownershipRate < 30 ? 'text-green-400' :
                          target.ownershipRate < 60 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {target.ownershipRate}%
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-purple-400">
                          {target.projectedPoints.toFixed(0)}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 text-xs">
                        {target.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredTargets.length === 0 && (
            <div className="text-center text-slate-400 py-8">
              <p>No waiver wire targets match your current filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
