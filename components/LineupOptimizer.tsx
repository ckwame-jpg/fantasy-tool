'use client'

import { useState, useMemo } from 'react'
import { getByeWeekInfo } from '@/lib/player-utils'
import { SLOT_ELIGIBLE, sortSlotsByPriority, slotLabel } from '@/lib/roster-utils'

interface LineupOptimizerProps {
  draftedPlayers: any[]
  onClose: () => void
  isPage?: boolean
  rosterSlots?: string[]
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

export default function LineupOptimizer({ draftedPlayers, onClose, isPage, rosterSlots }: LineupOptimizerProps) {
  const [selectedWeek, setSelectedWeek] = useState(1)

  const slots = rosterSlots || DEFAULT_SLOTS

  const getPlayerScore = (player: any, week: number) => {
    const basePoints = player.fantasyPoints || 0
    const byeWeek = getByeWeekInfo(player.team)
    if (byeWeek.week === week) return 0
    return Math.max(0, basePoints * (0.95 + Math.random() * 0.1))
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
      advice.push(`${byeWeekPlayers.length} players on bye this week: ${byeWeekPlayers.map(p => p.name).join(', ')}`)
    }
    const emptySlots = optimalLineup.slots.filter(s => !s.player)
    if (emptySlots.length > 0) {
      advice.push(`${emptySlots.length} empty slot${emptySlots.length > 1 ? 's' : ''}: ${emptySlots.map(s => slotLabel(s.slotName)).join(', ')}`)
    }
    return advice
  }

  const renderLineupSlot = (slot: FilledSlot, index: number) => {
    const label = slotLabel(slot.slotName)
    if (!slot.player) {
      return (
        <div key={index} className="bg-slate-700 p-3 rounded border-2 border-dashed border-slate-600">
          <div className="text-center text-slate-400">
            <div className="font-semibold">{label}</div>
            <div className="text-xs">empty</div>
          </div>
        </div>
      )
    }
    return (
      <div key={index} className="bg-slate-700 p-3 rounded border-2 border-slate-600 hover:border-slate-500">
        <div className="text-xs text-slate-500 mb-0.5">{label}</div>
        <div className="font-semibold">{slot.player.name}</div>
        <div className="text-xs text-slate-400">{slot.player.position} - {slot.player.team}</div>
        <div className="text-sm text-green-400 font-semibold">
          {slot.player.weekScore?.toFixed(1) || '0.0'} pts
        </div>
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
          {Array.from({ length: 17 }, (_, i) => i + 1).map(week => (
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {optimalLineup.slots.map((slot, i) => renderLineupSlot(slot, i))}
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
