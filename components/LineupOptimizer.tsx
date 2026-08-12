'use client'

import { useState, useMemo } from 'react'
import { getByeWeekInfo, getMatchupMultiplier, getOpponent } from '@/lib/player-utils'
import { SLOT_ELIGIBLE, sortSlotsByPriority, slotLabel } from '@/lib/roster-utils'

interface LineupOptimizerProps {
  draftedPlayers: any[]
  onClose: () => void
  isPage?: boolean
  rosterSlots?: string[]
  defenseMultipliers?: Record<string, number>
}

interface FilledSlot {
  slotName: string
  player: any | null
}

interface OptimalLineup {
  slots: FilledSlot[]
  totalPoints: number
}

const DEFAULT_SLOTS = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF"]

export default function LineupOptimizer({ draftedPlayers, onClose, isPage, rosterSlots, defenseMultipliers = {} }: LineupOptimizerProps) {
  const [selectedWeek, setSelectedWeek] = useState(1)

  const slots = rosterSlots || DEFAULT_SLOTS

  const getPlayerScore = (player: any, week: number) => {
    const seasonPoints = player.fantasyPoints || 0
    const weeklyAvg = seasonPoints / 17
    // Apply matchup multiplier based on opponent defense
    const multiplier = getMatchupMultiplier(player.team, week, defenseMultipliers)
    if (multiplier === 0) return 0 // bye week
    return Math.max(0, weeklyAvg * multiplier)
  }

  const optimalLineup = useMemo((): OptimalLineup => {
    const available = draftedPlayers
      .filter(p => getByeWeekInfo(p.team).week !== selectedWeek)
      .map(p => ({ ...p, weekScore: getPlayerScore(p, selectedWeek) }))
      .sort((a, b) => b.weekScore - a.weekScore)

    const usedIds = new Set<string>()
    const filledSlots: FilledSlot[] = new Array(slots.length).fill(null).map((_, i) => ({
      slotName: slots[i],
      player: null,
    }))

    // Fill in priority order (restrictive first, flex/superflex last)
    const priorityIndices = slots.map((s, i) => ({ slot: s, i }))
    priorityIndices.sort((a, b) => {
      const pa = a.slot === "SUPER_FLEX" ? 3 : ["FLEX", "REC_FLEX", "WRRB_FLEX"].includes(a.slot) ? 2 : 0
      const pb = b.slot === "SUPER_FLEX" ? 3 : ["FLEX", "REC_FLEX", "WRRB_FLEX"].includes(b.slot) ? 2 : 0
      return pa - pb
    })

    for (const { slot, i } of priorityIndices) {
      const eligible = SLOT_ELIGIBLE[slot] || []
      const best = available.find(p => !usedIds.has(p.id) && eligible.includes(p.position))
      if (best) {
        usedIds.add(best.id)
        filledSlots[i] = { slotName: slot, player: best }
      }
    }

    const totalPoints = filledSlots.reduce((sum, s) => sum + (s.player?.weekScore || 0), 0)
    return { slots: filledSlots, totalPoints }
  }, [draftedPlayers, selectedWeek, slots])

  const getPositionAdvice = () => {
    const advice: string[] = []
    const byeWeekPlayers = draftedPlayers.filter(p => getByeWeekInfo(p.team).week === selectedWeek)
    if (byeWeekPlayers.length > 0) {
      advice.push(`${byeWeekPlayers.length} player${byeWeekPlayers.length > 1 ? 's' : ''} on bye this week: ${byeWeekPlayers.map(p => p.name).join(', ')}`)
    }
    const emptySlots = optimalLineup.slots.filter(s => !s.player)
    if (emptySlots.length > 0) {
      advice.push(`${emptySlots.length} empty slot${emptySlots.length > 1 ? 's' : ''}: ${emptySlots.map(s => slotLabel(s.slotName)).join(', ')}`)
    }
    // Highlight best and worst matchups in the lineup
    const starters = optimalLineup.slots.filter(s => s.player)
    if (starters.length > 0 && Object.keys(defenseMultipliers).length > 0) {
      const bestMatchup = starters.reduce((best, s) => {
        const m = getMatchupMultiplier(s.player.team, selectedWeek, defenseMultipliers)
        const bm = getMatchupMultiplier(best.player.team, selectedWeek, defenseMultipliers)
        return m > bm ? s : best
      })
      const worstMatchup = starters.reduce((worst, s) => {
        const m = getMatchupMultiplier(s.player.team, selectedWeek, defenseMultipliers)
        const wm = getMatchupMultiplier(worst.player.team, selectedWeek, defenseMultipliers)
        return m < wm ? s : worst
      })
      const bestOpp = getOpponent(bestMatchup.player.team, selectedWeek)
      const worstOpp = getOpponent(worstMatchup.player.team, selectedWeek)
      if (bestOpp) advice.push(`best matchup: ${bestMatchup.player.name} vs ${bestOpp}`)
      if (worstOpp) advice.push(`toughest matchup: ${worstMatchup.player.name} vs ${worstOpp}`)
    }
    return advice
  }

  const renderLineupSlot = (slot: FilledSlot, index: number) => {
    const label = slotLabel(slot.slotName)
    const opponent = slot.player ? getOpponent(slot.player.team, selectedWeek) : null
    const multiplier = slot.player ? getMatchupMultiplier(slot.player.team, selectedWeek, defenseMultipliers) : 1
    const matchupColor = multiplier > 1.05 ? 'text-green-400' : multiplier < 0.95 ? 'text-red-400' : 'text-slate-400'
    return (
      <div key={index} className="flex justify-between items-center py-2 px-3 bg-slate-700 rounded">
        <span className="text-sm text-slate-400 min-w-[50px]">{label}:</span>
        <span className="text-sm flex-1 ml-2">
          {slot.player
            ? <>
                {slot.player.name} ({slot.player.team})
                {opponent && (
                  <span className={`ml-2 text-xs ${matchupColor}`}>
                    vs {opponent}
                  </span>
                )}
              </>
            : <span className="text-slate-500">Empty</span>
          }
        </span>
        <span className="text-sm text-green-400 font-semibold min-w-[60px] text-right">
          {slot.player ? `${slot.player.weekScore?.toFixed(1)} pts` : '-'}
        </span>
      </div>
    )
  }

  const controlsUI = (
    <div className="bg-slate-800 p-4 rounded-lg mb-6">
      <div className="max-w-xs">
        <label className="block text-sm text-slate-400 mb-1">week</label>
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          className="w-full bg-slate-700 text-slate-300 text-sm p-2 rounded"
          title="Select which week to optimize lineup for"
        >
          {Array.from({ length: 18 }, (_, i) => i + 1).map(week => (
            <option key={week} value={week}>week {week}</option>
          ))}
        </select>
      </div>
    </div>
  )

  const lineupUI = (
    <>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">optimal lineup</h3>
          <div className="text-2xl font-bold text-green-400">
            {optimalLineup.totalPoints.toFixed(1)} pts
          </div>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg">
          <div className="grid gap-2">
            {optimalLineup.slots.map((slot, i) => renderLineupSlot(slot, i))}
          </div>
        </div>
      </div>

      {getPositionAdvice().length > 0 && (
        <div className="bg-slate-800 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-3">lineup advice</h3>
          <ul className="text-sm space-y-2">
            {getPositionAdvice().map((advice, index) => (
              <li key={index} className="text-slate-300">• {advice}</li>
            ))}
          </ul>
        </div>
      )}

      {draftedPlayers.length === 0 && (
        <div className="text-center text-slate-400 py-8">
          <p>Draft some players first to optimize your lineup</p>
        </div>
      )}
    </>
  )

  if (isPage) {
    return (
      <div className="p-6">
        {controlsUI}
        {lineupUI}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">lineup optimizer</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xl font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-slate-400 mt-2">
            Optimize your lineup for maximum points
          </p>
        </div>
        <div className="p-6">
          {controlsUI}
          {lineupUI}
        </div>
      </div>
    </div>
  )
}
