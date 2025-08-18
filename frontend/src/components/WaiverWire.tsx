'use client'

import { useState, useMemo } from 'react'
import { getPlayerProjections, getPlayerTier, getByeWeekInfo, getTargetShare } from '@/lib/player-utils'

interface WaiverWireProps {
  allPlayers: any[]
  draftedPlayers: any[]
  onClose: () => void
}

interface WaiverTarget {
  player: any
  priority: 'High' | 'Medium' | 'Low'
  reason: string
  projectedPoints: number
  ownershipRate: number
}

export default function WaiverWire({ allPlayers, draftedPlayers, onClose }: WaiverWireProps) {
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [positionFilter, setPositionFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')

  // Calculate waiver wire targets
  const waiverTargets = useMemo(() => {
    const draftedIds = new Set(draftedPlayers.map(p => p.id))
    const availablePlayers = allPlayers.filter(player => !draftedIds.has(player.id))
    
    return availablePlayers.map(player => {
      const projections = getPlayerProjections(player.id, player.position)
      const tier = getPlayerTier(player.position, player.adp || 999)
      const byeWeek = getByeWeekInfo(player.team)
      const targetShare = getTargetShare(player.id, player.position)
      
      // Mock ownership rate (in real app, fetch from API)
      const ownershipRate = Math.max(0, Math.min(95, 
        80 - (player.adp || 200) * 0.3 + Math.random() * 20
      ))
      
      let priority: 'High' | 'Medium' | 'Low' = 'Low'
      let reason = ''
      
      // Determine priority and reason
      if (ownershipRate < 30 && projections.fantasyPoints > 200) {
        priority = 'High'
        reason = 'High upside, low ownership'
      } else if (ownershipRate < 50 && tier.tier <= 6) {
        priority = 'High'
        reason = 'Quality player still available'
      } else if (ownershipRate < 60 && projections.fantasyPoints > 150) {
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
        projectedPoints: projections.fantasyPoints,
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
      default: return 'text-zinc-400 bg-zinc-800'
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-zinc-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Waiver Wire Assistant</h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white text-xl font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-zinc-400 mt-2">
            Find the best available players for your team
          </p>
        </div>

        <div className="p-6">
          {/* Controls */}
          <div className="bg-zinc-800 p-4 rounded-lg mb-6">
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Week</label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="w-full bg-zinc-700 text-white p-2 rounded"
                  title="Select week to view waiver wire targets for"
                >
                  {Array.from({ length: 17 }, (_, i) => i + 1).map(week => (
                    <option key={week} value={week}>Week {week}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Position</label>
                <select
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  className="w-full bg-zinc-700 text-white p-2 rounded"
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
                <label className="block text-sm text-zinc-400 mb-1">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full bg-zinc-700 text-white p-2 rounded"
                  title="Filter players by waiver wire priority level"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>
            </div>

            <div className="bg-zinc-700 p-3 rounded">
              <h3 className="font-semibold mb-2">Week {selectedWeek} Tips</h3>
              <ul className="text-sm space-y-1">
                {getWaiverTips().map((tip, index) => (
                  <li key={index} className="text-zinc-300">• {tip}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-400">
                {filteredTargets.filter(t => t.priority === 'High').length}
              </div>
              <div className="text-sm text-zinc-400">High Priority</div>
            </div>
            <div className="bg-zinc-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {filteredTargets.filter(t => t.priority === 'Medium').length}
              </div>
              <div className="text-sm text-zinc-400">Medium Priority</div>
            </div>
            <div className="bg-zinc-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-400">
                {filteredTargets.filter(t => t.priority === 'Low').length}
              </div>
              <div className="text-sm text-zinc-400">Low Priority</div>
            </div>
            <div className="bg-zinc-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-400">
                {filteredTargets.filter(t => t.ownershipRate < 50).length}
              </div>
              <div className="text-sm text-zinc-400">Low Ownership</div>
            </div>
          </div>

          {/* Player List */}
          <div className="bg-zinc-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-700">
                  <tr>
                    <th className="text-left p-3">Player</th>
                    <th className="text-left p-3">Position</th>
                    <th className="text-left p-3">Priority</th>
                    <th className="text-left p-3">Ownership</th>
                    <th className="text-left p-3">Proj. Points</th>
                    <th className="text-left p-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTargets.map((target, index) => (
                    <tr key={target.player.id} className="border-b border-zinc-700 hover:bg-zinc-700/50">
                      <td className="p-3">
                        <div className="font-semibold">{target.player.name}</div>
                        <div className="text-xs text-zinc-400">{target.player.team}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-zinc-600 rounded text-xs">
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
                      <td className="p-3 text-zinc-300 text-xs">
                        {target.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredTargets.length === 0 && (
            <div className="text-center text-zinc-400 py-8">
              <p>No waiver wire targets match your current filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
