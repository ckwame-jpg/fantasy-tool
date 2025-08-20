'use client'

import { useState, useEffect } from 'react'
import { getPlayerProjections, getPlayerTier, getByeWeekInfo } from '@/lib/player-utils'

interface TradeAnalyzerProps {
  allPlayers: any[]
  onClose: () => void
}

interface TradePlayer {
  player: any | null
  side: 'give' | 'get'
}

export default function TradeAnalyzer({ allPlayers, onClose }: TradeAnalyzerProps) {
  const [givePlayers, setGivePlayers] = useState<any[]>([])
  const [getPlayers, setGetPlayers] = useState<any[]>([])
  const [searchGive, setSearchGive] = useState('')
  const [searchGet, setSearchGet] = useState('')
  const [showGiveResults, setShowGiveResults] = useState(false)
  const [showGetResults, setShowGetResults] = useState(false)

  // Filter players based on search
  const filteredGivePlayers = allPlayers.filter(player =>
    player.name.toLowerCase().includes(searchGive.toLowerCase()) &&
    !givePlayers.find(p => p.id === player.id) &&
    !getPlayers.find(p => p.id === player.id)
  ).slice(0, 10)

  const filteredGetPlayers = allPlayers.filter(player =>
    player.name.toLowerCase().includes(searchGet.toLowerCase()) &&
    !givePlayers.find(p => p.id === player.id) &&
    !getPlayers.find(p => p.id === player.id)
  ).slice(0, 10)

  // Calculate trade value
  const calculatePlayerValue = (player: any) => {
    const projections = getPlayerProjections(player.id, player.position)
    const tier = getPlayerTier(player.position, player.adp || 999)
    const byeWeek = getByeWeekInfo(player.team)
    
    let baseValue = projections.fantasyPoints || 0
    
    // Adjust for tier (higher tier = higher value)
    const tierMultiplier = tier.tier <= 2 ? 1.2 : tier.tier <= 4 ? 1.1 : tier.tier <= 6 ? 1.0 : 0.9
    baseValue *= tierMultiplier
    
    // Adjust for bye week timing
    if (byeWeek.week <= 7) baseValue *= 1.05 // Early bye is good
    if (byeWeek.week >= 12) baseValue *= 0.95 // Late bye is bad
    
    // Position scarcity adjustments
    const positionMultipliers = { QB: 0.9, RB: 1.2, WR: 1.0, TE: 1.1, K: 0.7, DEF: 0.8 }
    baseValue *= positionMultipliers[player.position as keyof typeof positionMultipliers] || 1.0
    
    return Math.round(baseValue)
  }

  const giveValue = givePlayers.reduce((sum, player) => sum + calculatePlayerValue(player), 0)
  const getValue = getPlayers.reduce((sum, player) => sum + calculatePlayerValue(player), 0)
  const tradeDifference = getValue - giveValue
  const tradePercentage = giveValue > 0 ? ((getValue / giveValue) * 100) : 0

  const getTradeGrade = () => {
    if (tradeDifference >= 50) return { grade: 'A+', color: 'text-green-400', description: 'Excellent trade!' }
    if (tradeDifference >= 25) return { grade: 'A', color: 'text-green-400', description: 'Great trade' }
    if (tradeDifference >= 10) return { grade: 'B+', color: 'text-green-300', description: 'Good trade' }
    if (tradeDifference >= -10) return { grade: 'B', color: 'text-yellow-400', description: 'Fair trade' }
    if (tradeDifference >= -25) return { grade: 'C', color: 'text-orange-400', description: 'Questionable trade' }
    return { grade: 'D', color: 'text-red-400', description: 'Bad trade' }
  }

  const addPlayer = (player: any, side: 'give' | 'get') => {
    if (side === 'give') {
      setGivePlayers([...givePlayers, player])
      setSearchGive('')
      setShowGiveResults(false)
    } else {
      setGetPlayers([...getPlayers, player])
      setSearchGet('')
      setShowGetResults(false)
    }
  }

  const removePlayer = (playerId: string, side: 'give' | 'get') => {
    if (side === 'give') {
      setGivePlayers(givePlayers.filter(p => p.id !== playerId))
    } else {
      setGetPlayers(getPlayers.filter(p => p.id !== playerId))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-zinc-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Trade Analyzer</h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white text-xl font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-zinc-400 mt-2">
            Compare player values to evaluate potential trades
          </p>
        </div>

        <div className="p-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Give Side */}
            <div className="bg-zinc-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-red-400">You Give</h3>
              
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search players to give..."
                  value={searchGive}
                  onChange={(e) => {
                    setSearchGive(e.target.value)
                    setShowGiveResults(e.target.value.length > 0)
                  }}
                  className="w-full bg-zinc-700 text-white p-2 rounded"
                />
                
                {showGiveResults && filteredGivePlayers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-zinc-700 border border-zinc-600 rounded mt-1 max-h-48 overflow-y-auto z-10">
                    {filteredGivePlayers.map(player => (
                      <button
                        key={player.id}
                        onClick={() => addPlayer(player, 'give')}
                        className="w-full text-left p-2 hover:bg-zinc-600 flex items-center gap-2"
                      >
                        <span className="text-xs text-zinc-400">{player.position}</span>
                        <span>{player.name}</span>
                        <span className="text-xs text-zinc-400">({player.team})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-4">
                {givePlayers.map(player => (
                  <div key={player.id} className="flex justify-between items-center bg-zinc-700 p-2 rounded">
                    <div>
                      <div className="font-semibold">{player.name}</div>
                      <div className="text-xs text-zinc-400">{player.position} - {player.team}</div>
                      <div className="text-xs text-green-400">Value: {calculatePlayerValue(player)}</div>
                    </div>
                    <button
                      onClick={() => removePlayer(player.id, 'give')}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-700 pt-3">
                <div className="text-lg font-bold text-red-400">
                  Total Value: {giveValue}
                </div>
              </div>
            </div>

            {/* Analysis */}
            <div className="bg-zinc-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-purple-400">Analysis</h3>
              
              {giveValue > 0 && getValue > 0 ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getTradeGrade().color}`}>
                      {getTradeGrade().grade}
                    </div>
                    <div className="text-sm text-zinc-400">{getTradeGrade().description}</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Value Difference:</span>
                      <span className={tradeDifference >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {tradeDifference >= 0 ? '+' : ''}{tradeDifference}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trade Ratio:</span>
                      <span className={tradePercentage >= 100 ? 'text-green-400' : 'text-red-400'}>
                        {tradePercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="bg-zinc-700 p-3 rounded">
                    <h4 className="font-semibold mb-2">Recommendation</h4>
                    <p className="text-sm text-zinc-300">
                      {tradeDifference >= 25 ? 
                        'This is a great trade for you! You\'re getting significantly more value.' :
                      tradeDifference >= 10 ?
                        'This is a good trade. You\'re getting solid value in return.' :
                      tradeDifference >= -10 ?
                        'This is a fair trade. Both sides get roughly equal value.' :
                      tradeDifference >= -25 ?
                        'This trade slightly favors your opponent. Consider if you have specific needs.' :
                        'This trade heavily favors your opponent. You might want to reconsider.'
                      }
                    </p>
                  </div>

                  <div className="bg-zinc-700 p-3 rounded">
                    <h4 className="font-semibold mb-2">Considerations</h4>
                    <ul className="text-xs text-zinc-300 space-y-1">
                      <li>• Position scarcity affects player value</li>
                      <li>• Bye week timing impacts value (early bye = +5%, late bye = -5%)</li>
                      <li>• Player tiers significantly impact long-term value</li>
                      <li>• Consider your team's specific needs and depth</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center text-zinc-400 py-8">
                  <p>Add players to both sides to see trade analysis</p>
                </div>
              )}
            </div>

            {/* Get Side */}
            <div className="bg-zinc-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-green-400">You Get</h3>
              
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search players to get..."
                  value={searchGet}
                  onChange={(e) => {
                    setSearchGet(e.target.value)
                    setShowGetResults(e.target.value.length > 0)
                  }}
                  className="w-full bg-zinc-700 text-white p-2 rounded"
                />
                
                {showGetResults && filteredGetPlayers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-zinc-700 border border-zinc-600 rounded mt-1 max-h-48 overflow-y-auto z-10">
                    {filteredGetPlayers.map(player => (
                      <button
                        key={player.id}
                        onClick={() => addPlayer(player, 'get')}
                        className="w-full text-left p-2 hover:bg-zinc-600 flex items-center gap-2"
                      >
                        <span className="text-xs text-zinc-400">{player.position}</span>
                        <span>{player.name}</span>
                        <span className="text-xs text-zinc-400">({player.team})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-4">
                {getPlayers.map(player => (
                  <div key={player.id} className="flex justify-between items-center bg-zinc-700 p-2 rounded">
                    <div>
                      <div className="font-semibold">{player.name}</div>
                      <div className="text-xs text-zinc-400">{player.position} - {player.team}</div>
                      <div className="text-xs text-green-400">Value: {calculatePlayerValue(player)}</div>
                    </div>
                    <button
                      onClick={() => removePlayer(player.id, 'get')}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-700 pt-3">
                <div className="text-lg font-bold text-green-400">
                  Total Value: {getValue}
                </div>
              </div>
            </div>
          </div>

          {giveValue > 0 && getValue > 0 && (
            <div className="mt-6 bg-zinc-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Trade Summary</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-red-400 mb-2">You're Giving ({giveValue} pts)</h4>
                  <ul className="space-y-1">
                    {givePlayers.map(player => (
                      <li key={player.id} className="text-sm">
                        {player.name} ({player.position}) - {calculatePlayerValue(player)} pts
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-green-400 mb-2">You're Getting ({getValue} pts)</h4>
                  <ul className="space-y-1">
                    {getPlayers.map(player => (
                      <li key={player.id} className="text-sm">
                        {player.name} ({player.position}) - {calculatePlayerValue(player)} pts
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
