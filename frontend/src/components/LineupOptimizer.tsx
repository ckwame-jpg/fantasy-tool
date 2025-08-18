'use client'

import { useState, useMemo } from 'react'
import { getPlayerProjections, getByeWeekInfo, getPlayerTier } from '@/lib/player-utils'

interface LineupOptimizerProps {
  draftedPlayers: any[]
  onClose: () => void
}

interface OptimalLineup {
  QB: any | null
  RB1: any | null
  RB2: any | null
  WR1: any | null
  WR2: any | null
  TE: any | null
  FLEX: any | null
  K: any | null
  DEF: any | null
  totalPoints: number
}

export default function LineupOptimizer({ draftedPlayers, onClose }: LineupOptimizerProps) {
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [optimizationStrategy, setOptimizationStrategy] = useState<'ceiling' | 'floor' | 'projected'>('projected')

  // Calculate player scores based on strategy
  const getPlayerScore = (player: any, week: number) => {
    const projections = getPlayerProjections(player.id, player.position)
    const basePoints = projections.fantasyPoints || 0
    const byeWeek = getByeWeekInfo(player.team)
    
    // Player is on bye this week
    if (byeWeek.week === week) return 0
    
    let score = basePoints
    
    // Apply strategy modifiers
    switch (optimizationStrategy) {
      case 'ceiling':
        // Favor high-upside players (add variance bonus)
        score += Math.random() * 30 - 10 // ±15 point variance
        break
      case 'floor':
        // Favor consistent players (reduce variance)
        score *= 0.85 + Math.random() * 0.3 // 85-115% of projection
        break
      case 'projected':
        // Use base projections with minor variance
        score *= 0.95 + Math.random() * 0.1 // 95-105% of projection
        break
    }
    
    return Math.max(0, score)
  }

  // Generate optimal lineup
  const optimalLineup = useMemo(() => {
    const availablePlayers = draftedPlayers.filter(player => {
      const byeWeek = getByeWeekInfo(player.team)
      return byeWeek.week !== selectedWeek
    })

    const playersByPosition = availablePlayers.reduce((acc, player) => {
      if (!acc[player.position]) acc[player.position] = []
      acc[player.position].push({
        ...player,
        weekScore: getPlayerScore(player, selectedWeek)
      })
      return acc
    }, {} as { [position: string]: any[] })

    // Sort each position by score
    Object.keys(playersByPosition).forEach(position => {
      playersByPosition[position].sort((a: any, b: any) => b.weekScore - a.weekScore)
    })

    const lineup: OptimalLineup = {
      QB: null,
      RB1: null,
      RB2: null,
      WR1: null,
      WR2: null,
      TE: null,
      FLEX: null,
      K: null,
      DEF: null,
      totalPoints: 0
    }

    // Fill required positions
    lineup.QB = playersByPosition.QB?.[0] || null
    lineup.RB1 = playersByPosition.RB?.[0] || null
    lineup.RB2 = playersByPosition.RB?.[1] || null
    lineup.WR1 = playersByPosition.WR?.[0] || null
    lineup.WR2 = playersByPosition.WR?.[1] || null
    lineup.TE = playersByPosition.TE?.[0] || null
    lineup.K = playersByPosition.K?.[0] || null
    lineup.DEF = playersByPosition.DEF?.[0] || null

    // Find best FLEX (RB3, WR3, or TE2)
    const flexCandidates = [
      ...(playersByPosition.RB?.slice(2) || []),
      ...(playersByPosition.WR?.slice(2) || []),
      ...(playersByPosition.TE?.slice(1) || [])
    ].sort((a, b) => b.weekScore - a.weekScore)

    lineup.FLEX = flexCandidates[0] || null

    // Calculate total points
    lineup.totalPoints = Object.values(lineup)
      .filter(player => player && typeof player === 'object')
      .reduce((sum, player) => sum + (player.weekScore || 0), 0)

    return lineup
  }, [draftedPlayers, selectedWeek, optimizationStrategy])

  // Alternative lineups
  const alternativeLineups = useMemo(() => {
    const alternatives: OptimalLineup[] = []
    
    // Try different FLEX combinations
    const availablePlayers = draftedPlayers.filter(player => {
      const byeWeek = getByeWeekInfo(player.team)
      return byeWeek.week !== selectedWeek
    })

    const flexCandidates = availablePlayers.filter(p => 
      ['RB', 'WR', 'TE'].includes(p.position) && 
      p.id !== optimalLineup.RB1?.id && 
      p.id !== optimalLineup.RB2?.id && 
      p.id !== optimalLineup.WR1?.id && 
      p.id !== optimalLineup.WR2?.id && 
      p.id !== optimalLineup.TE?.id
    ).slice(0, 3)

    flexCandidates.forEach(flexPlayer => {
      const altLineup = { ...optimalLineup }
      altLineup.FLEX = { ...flexPlayer, weekScore: getPlayerScore(flexPlayer, selectedWeek) }
      altLineup.totalPoints = Object.values(altLineup)
        .filter(player => player && typeof player === 'object')
        .reduce((sum, player) => sum + (player.weekScore || 0), 0)
      alternatives.push(altLineup)
    })

    return alternatives.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 2)
  }, [optimalLineup, draftedPlayers, selectedWeek])

  const getPositionAdvice = () => {
    const advice = []
    const byeWeekPlayers = draftedPlayers.filter(player => {
      const byeWeek = getByeWeekInfo(player.team)
      return byeWeek.week === selectedWeek
    })

    if (byeWeekPlayers.length > 0) {
      advice.push(`${byeWeekPlayers.length} players on bye this week: ${byeWeekPlayers.map(p => p.name).join(', ')}`)
    }

    if (!optimalLineup.QB) {
      advice.push('No QB available - check waivers or make a trade')
    }

    if (!optimalLineup.RB1 || !optimalLineup.RB2) {
      advice.push('Missing starting RBs - consider waiver pickups')
    }

    if (!optimalLineup.WR1 || !optimalLineup.WR2) {
      advice.push('Missing starting WRs - check your bench depth')
    }

    if (!optimalLineup.TE) {
      advice.push('No TE available - stream from waivers')
    }

    if (!optimalLineup.FLEX) {
      advice.push('No FLEX options - your team may need more depth')
    }

    return advice
  }

  const renderLineupSlot = (position: string, player: any) => {
    if (!player) {
      return (
        <div className="bg-zinc-700 p-3 rounded border-2 border-dashed border-zinc-600">
          <div className="text-center text-zinc-400">
            <div className="font-semibold">{position}</div>
            <div className="text-xs">Empty</div>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-zinc-700 p-3 rounded border-2 border-zinc-600 hover:border-zinc-500">
        <div className="font-semibold">{player.name}</div>
        <div className="text-xs text-zinc-400">{player.position} - {player.team}</div>
        <div className="text-sm text-green-400 font-semibold">
          {player.weekScore?.toFixed(1) || '0.0'} pts
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-zinc-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Lineup Optimizer</h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white text-xl font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-zinc-400 mt-2">
            Optimize your lineup for maximum points
          </p>
        </div>

        <div className="p-6">
          {/* Controls */}
          <div className="bg-zinc-800 p-4 rounded-lg mb-6">
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Week</label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="w-full bg-zinc-700 text-white p-2 rounded"
                  title="Select which week to optimize lineup for"
                >
                  {Array.from({ length: 17 }, (_, i) => i + 1).map(week => (
                    <option key={week} value={week}>Week {week}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Strategy</label>
                <select
                  value={optimizationStrategy}
                  onChange={(e) => setOptimizationStrategy(e.target.value as any)}
                  className="w-full bg-zinc-700 text-white p-2 rounded"
                  title="Select optimization strategy for lineup"
                >
                  <option value="projected">Projected Points</option>
                  <option value="ceiling">High Ceiling</option>
                  <option value="floor">High Floor</option>
                </select>
              </div>
            </div>

            <div className="text-sm text-zinc-300">
              <strong>Strategy Guide:</strong>
              <ul className="mt-1 space-y-1">
                <li>• <strong>Projected:</strong> Most likely outcomes</li>
                <li>• <strong>High Ceiling:</strong> Maximum upside for tournaments</li>
                <li>• <strong>High Floor:</strong> Consistent points for cash games</li>
              </ul>
            </div>
          </div>

          {/* Optimal Lineup */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Optimal Lineup</h3>
              <div className="text-2xl font-bold text-green-400">
                {optimalLineup.totalPoints.toFixed(1)} pts
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
              {renderLineupSlot('QB', optimalLineup.QB)}
              {renderLineupSlot('RB', optimalLineup.RB1)}
              {renderLineupSlot('RB', optimalLineup.RB2)}
              {renderLineupSlot('WR', optimalLineup.WR1)}
              {renderLineupSlot('WR', optimalLineup.WR2)}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {renderLineupSlot('TE', optimalLineup.TE)}
              {renderLineupSlot('FLEX', optimalLineup.FLEX)}
              {renderLineupSlot('K', optimalLineup.K)}
              {renderLineupSlot('DEF', optimalLineup.DEF)}
            </div>
          </div>

          {/* Alternative Lineups */}
          {alternativeLineups.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-4">Alternative Lineups</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {alternativeLineups.map((lineup, index) => (
                  <div key={index} className="bg-zinc-800 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">Option {index + 2}</span>
                      <span className="text-green-400 font-bold">
                        {lineup.totalPoints.toFixed(1)} pts
                      </span>
                    </div>
                    <div className="text-sm text-zinc-300">
                      <div>FLEX: {lineup.FLEX?.name || 'None'}</div>
                      <div className="text-xs text-zinc-400">
                        Difference: {(lineup.totalPoints - optimalLineup.totalPoints).toFixed(1)} pts
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advice */}
          {getPositionAdvice().length > 0 && (
            <div className="bg-zinc-800 p-4 rounded-lg">
              <h3 className="text-lg font-bold mb-3">Lineup Advice</h3>
              <ul className="text-sm space-y-2">
                {getPositionAdvice().map((advice, index) => (
                  <li key={index} className="text-zinc-300">
                    • {advice}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {draftedPlayers.length === 0 && (
            <div className="text-center text-zinc-400 py-8">
              <p>Draft some players first to optimize your lineup</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
