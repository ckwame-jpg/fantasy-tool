'use client'

import { useState, useMemo } from 'react'
import { getPlayerTier, getByeWeekInfo } from '@/lib/player-utils'
import { draftTargets, SLOT_ELIGIBLE, slotLabel } from '@/lib/roster-utils'

const DEFAULT_SLOTS = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF"]

interface DraftRecapProps {
  draftedPlayers: any[]
  onClose: () => void
  isPage?: boolean
  rosterSlots?: string[]
}

export default function DraftRecap({ draftedPlayers, onClose, isPage, rosterSlots }: DraftRecapProps) {
  const [selectedTab, setSelectedTab] = useState<'summary' | 'analysis' | 'grades'>('summary')

  const slots = rosterSlots || DEFAULT_SLOTS

  // Calculate draft analysis
  const positionCounts = draftedPlayers.reduce((acc, player) => {
    acc[player.position] = (acc[player.position] || 0) + 1
    return acc
  }, {} as { [key: string]: number })

  const averageADP = draftedPlayers.reduce((sum, player) => sum + (player.adp || 0), 0) / draftedPlayers.length

  const byeWeekDistribution = draftedPlayers.reduce((acc, player) => {
    const byeInfo = getByeWeekInfo(player.team)
    acc[byeInfo.week] = (acc[byeInfo.week] || 0) + 1
    return acc
  }, {} as { [key: number]: number })

  const tierDistribution = draftedPlayers.reduce((acc, player) => {
    const tier = getPlayerTier(player.position, player.adp || 999).tier
    acc[tier] = (acc[tier] || 0) + 1
    return acc
  }, {} as { [key: number]: number })

  const projectedPoints = draftedPlayers.reduce((sum, player) => {
    return sum + (player.fantasyPoints || 0)
  }, 0)

  // Position grades based on optimal roster construction
  const getPositionGrade = (position: string, count: number) => {
    const targets = draftTargets(slots)
    const target = targets[position] || 0
    const ratio = count / target

    if (ratio >= 0.8 && ratio <= 1.2) return { grade: 'A', color: 'text-green-400' }
    if (ratio >= 0.6 && ratio <= 1.4) return { grade: 'B', color: 'text-yellow-400' }
    return { grade: 'C', color: 'text-red-400' }
  }

  const overallGrade = () => {
    const grades = Object.entries(positionCounts).map(([pos, count]) => getPositionGrade(pos, count as number))
    const aGrades = grades.filter(g => g.grade === 'A').length
    const bGrades = grades.filter(g => g.grade === 'B').length

    if (aGrades >= 4) return { grade: 'A', color: 'text-green-400' }
    if (aGrades >= 2 && bGrades >= 2) return { grade: 'B+', color: 'text-yellow-400' }
    if (bGrades >= 3) return { grade: 'B', color: 'text-yellow-400' }
    return { grade: 'C', color: 'text-red-400' }
  }

  // Build starting lineup using priority-based slot filling (same as draftboard/optimizer)
  const startingLineup = useMemo(() => {
    const sorted = [...draftedPlayers].sort((a, b) => (b.fantasyPoints || 0) - (a.fantasyPoints || 0))
    const usedIds = new Set<string>()
    const filled: { slot: string; player: any | null }[] = slots.map(s => ({ slot: s, player: null }))

    // Build priority-ordered indices (restrictive slots first)
    const indices = slots.map((slot, i) => ({ slot, i }))
    indices.sort((a, b) => {
      const pa = a.slot === "SUPER_FLEX" ? 3 : ["FLEX", "REC_FLEX", "WRRB_FLEX"].includes(a.slot) ? 2 : 0
      const pb = b.slot === "SUPER_FLEX" ? 3 : ["FLEX", "REC_FLEX", "WRRB_FLEX"].includes(b.slot) ? 2 : 0
      return pa - pb
    })

    for (const { slot, i } of indices) {
      const eligible = SLOT_ELIGIBLE[slot] || []
      const best = sorted.find(p => !usedIds.has(String(p.id)) && eligible.includes(p.position))
      if (best) {
        usedIds.add(String(best.id))
        filled[i] = { slot, player: best }
      }
    }

    return filled
  }, [draftedPlayers, slots])

  return (
    <div className={isPage ? "min-h-screen bg-slate-950 p-4 md:p-8" : "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"}>
      <div className={isPage ? "max-w-4xl mx-auto" : "bg-slate-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto"}>
        <div className={isPage ? "mb-6" : "p-6 border-b border-slate-700"}>
          <div className="flex justify-between items-center">
            <h2 className={isPage ? "text-3xl font-bold" : "text-2xl font-bold"}>draft recap & analysis</h2>
            {!isPage && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white text-xl font-bold"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setSelectedTab('summary')}
              className={`px-4 py-2 rounded ${
                selectedTab === 'summary'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setSelectedTab('analysis')}
              className={`px-4 py-2 rounded ${
                selectedTab === 'analysis'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Analysis
            </button>
            <button
              onClick={() => setSelectedTab('grades')}
              className={`px-4 py-2 rounded ${
                selectedTab === 'grades'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Grades
            </button>
          </div>
        </div>

        <div className={isPage ? "" : "p-6"}>
          {selectedTab === 'summary' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-400">{draftedPlayers.length}</div>
                  <div className="text-sm text-slate-400">Total Picks</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">{projectedPoints.toFixed(0)}</div>
                  <div className="text-sm text-slate-400">Projected Points</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-400">{averageADP.toFixed(1)}</div>
                  <div className="text-sm text-slate-400">Avg ADP</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className={`text-2xl font-bold ${overallGrade().color}`}>{overallGrade().grade}</div>
                  <div className="text-sm text-slate-400">Overall Grade</div>
                </div>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Position Breakdown</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  {Object.entries(positionCounts).map(([position, count]) => (
                    <div key={position} className="text-center">
                      <div className="text-xl font-bold text-purple-400">{count as number}</div>
                      <div className="text-sm text-slate-400">{position}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Your Starting Lineup</h3>
                <div className="grid gap-2">
                  {startingLineup.map((entry, index) => (
                    <div key={index} className="flex justify-between items-center py-2 px-3 bg-slate-700 rounded">
                      <span className="text-sm text-slate-400">{slotLabel(entry.slot)}:</span>
                      <span className="text-sm">
                        {entry.player ? `${entry.player.name} (${entry.player.team})` : 'Empty'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'analysis' && (
            <div className="space-y-6">
              <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Bye Week Distribution</h3>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  {Object.entries(byeWeekDistribution).map(([week, count]) => (
                    <div key={week} className="text-center bg-slate-700 p-2 rounded">
                      <div className="text-sm font-bold">Week {week}</div>
                      <div className="text-xs text-slate-400">{count as number} players</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Avoid having too many players with the same bye week
                </p>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Player Tiers</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(tierDistribution).map(([tier, count]) => (
                    <div key={tier} className="text-center bg-slate-700 p-3 rounded">
                      <div className="text-lg font-bold text-purple-400">Tier {tier}</div>
                      <div className="text-sm text-slate-400">{count as number} players</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Strengths & Weaknesses</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-green-400 font-semibold mb-2">Strengths</h4>
                    <ul className="text-sm space-y-1">
                      {Object.entries(positionCounts).filter(([pos, count]) =>
                        getPositionGrade(pos, count as number).grade === 'A'
                      ).map(([pos]) => (
                        <li key={pos} className="text-green-300">• Strong {pos} depth</li>
                      ))}
                      {averageADP < 50 && <li className="text-green-300">• Excellent value picks</li>}
                      {Object.keys(byeWeekDistribution).length >= 6 &&
                        <li className="text-green-300">• Good bye week distribution</li>}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-red-400 font-semibold mb-2">Areas for Improvement</h4>
                    <ul className="text-sm space-y-1">
                      {Object.entries(positionCounts).filter(([pos, count]) =>
                        getPositionGrade(pos, count as number).grade === 'C'
                      ).map(([pos]) => (
                        <li key={pos} className="text-red-300">• Consider more {pos} depth</li>
                      ))}
                      {averageADP > 80 && <li className="text-red-300">• Could find better value</li>}
                      {Object.values(byeWeekDistribution).some(count => (count as number) >= 3) &&
                        <li className="text-red-300">• Bye week conflicts</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'grades' && (
            <div className="space-y-6">
              <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Position Grades</h3>
                <div className="space-y-3">
                  {Object.entries(positionCounts).map(([position, count]) => {
                    const grade = getPositionGrade(position, count as number)
                    return (
                      <div key={position} className="flex justify-between items-center py-2 px-3 bg-slate-700 rounded">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{position}</span>
                          <span className="text-sm text-slate-400">({count as number} players)</span>
                        </div>
                        <span className={`font-bold text-xl ${grade.color}`}>{grade.grade}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Draft Strategy Analysis</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 px-3 bg-slate-700 rounded">
                    <span>Value Drafting</span>
                    <span className={`font-bold ${averageADP < 60 ? 'text-green-400' : averageADP < 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {averageADP < 60 ? 'A' : averageADP < 80 ? 'B' : 'C'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-slate-700 rounded">
                    <span>Positional Balance</span>
                    <span className={`font-bold ${overallGrade().color}`}>{overallGrade().grade}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-slate-700 rounded">
                    <span>Bye Week Management</span>
                    <span className={`font-bold ${
                      Object.values(byeWeekDistribution).every(count => (count as number) <= 2) ? 'text-green-400' :
                      Object.values(byeWeekDistribution).some(count => (count as number) >= 4) ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {Object.values(byeWeekDistribution).every(count => (count as number) <= 2) ? 'A' :
                       Object.values(byeWeekDistribution).some(count => (count as number) >= 4) ? 'C' : 'B'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Recommendations</h3>
                <div className="text-sm space-y-2">
                  {draftedPlayers.length < 15 && (
                    <p className="text-yellow-400">• Consider filling out your bench with high-upside players</p>
                  )}
                  {!positionCounts.K && (
                    <p className="text-yellow-400">• Don't forget to draft a kicker</p>
                  )}
                  {!positionCounts.DEF && (
                    <p className="text-yellow-400">• Draft a defense before the season starts</p>
                  )}
                  {(positionCounts.RB || 0) < 3 && (
                    <p className="text-red-400">• RB depth is crucial - consider adding more running backs</p>
                  )}
                  {(positionCounts.WR || 0) < 4 && (
                    <p className="text-red-400">• WR is a deep position - consider adding more receivers</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
