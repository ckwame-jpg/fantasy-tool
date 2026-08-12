'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { API_BASE_URL } from '@/constants'
import type { LeagueSettings } from '@/lib/league-context'
import { SLOT_ELIGIBLE } from '@/lib/roster-utils'
import {
  calculateReplacementLevels,
  calculateVORP,
  calculatePickValue,
  calculateLineupDelta,
  getPickHitRate,
  getVORPTier,
  buildTierComparison,
  getTradeGrade,
  type TradeMode,
  type DraftPick,
  type PickPosition,
  type VORPContext,
  type TierEntry,
  type TrendingPlayer,
} from '@/lib/trade-values'

interface TradeAnalyzerProps {
  allPlayers: any[]
  onClose: () => void
  isPage?: boolean
  myPlayerIds?: string[]
  leagueSettings?: LeagueSettings
  currentSeason?: number
  leagueSize?: number
  rosterOwners?: { playerIds: string[] }[]
}

// ---- Multi-team types ----
interface TeamSide {
  id: number
  label: string
  players: any[]
  picks: DraftPick[]
  search: string
  showResults: boolean
}

export default function TradeAnalyzer({
  allPlayers,
  onClose,
  isPage,
  myPlayerIds,
  leagueSettings,
  currentSeason,
  leagueSize: leagueSizeProp,
  rosterOwners,
}: TradeAnalyzerProps) {
  const isDynasty = leagueSettings?.leagueType === 'dynasty'
  const hasSuperFlex = leagueSettings?.rosterSlots?.includes('SUPER_FLEX') ?? false
  const rosterSlots = leagueSettings?.rosterSlots || ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF']
  const season = currentSeason || new Date().getFullYear()
  const leagueSize = leagueSizeProp || rosterOwners?.length || 12
  const starterCount = rosterSlots.length

  // ---- State ----
  const [teams, setTeams] = useState<TeamSide[]>([
    { id: 0, label: 'You give', players: [], picks: [], search: '', showResults: false },
    { id: 1, label: 'You get', players: [], picks: [], search: '', showResults: false },
  ])
  const [mode, setMode] = useState<TradeMode>('neutral')
  const [activeTab, setActiveTab] = useState<'analysis' | 'tiers' | 'lineup'>('analysis')

  // Trending data
  const [trendingAdds, setTrendingAdds] = useState<Map<string, number>>(new Map())
  const [trendingDrops, setTrendingDrops] = useState<Map<string, number>>(new Map())

  // Fetch trending data on mount
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const [addRes, dropRes] = await Promise.all([
          fetch(`${API_BASE_URL}/sleeper/trending/add?lookback_hours=24&limit=50`),
          fetch(`${API_BASE_URL}/sleeper/trending/drop?lookback_hours=24&limit=50`),
        ])
        if (addRes.ok) {
          const data: TrendingPlayer[] = await addRes.json()
          setTrendingAdds(new Map(data.map(d => [String(d.player_id), d.count])))
        }
        if (dropRes.ok) {
          const data: TrendingPlayer[] = await dropRes.json()
          setTrendingDrops(new Map(data.map(d => [String(d.player_id), d.count])))
        }
      } catch {
        // Trending data is non-critical
      }
    }
    fetchTrending()
  }, [])

  // ---- VORP context ----
  const vorpCtx = useMemo<VORPContext>(
    () => calculateReplacementLevels(allPlayers, rosterSlots, leagueSize),
    [allPlayers, rosterSlots, leagueSize],
  )

  // ---- Helpers ----
  const allUsedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const t of teams) {
      for (const p of t.players) ids.add(String(p.id))
    }
    return ids
  }, [teams])

  const allUsedPickIds = useMemo(() => {
    const ids = new Set<string>()
    for (const t of teams) {
      for (const p of t.picks) ids.add(p.id)
    }
    return ids
  }, [teams])

  const myIdSet = myPlayerIds?.length ? new Set(myPlayerIds.map(String)) : null

  const getFilteredPlayers = useCallback(
    (teamId: number, search: string) => {
      if (!search) return []
      const isMyTeam = teamId === 0
      return allPlayers
        .filter(
          (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) &&
            !allUsedIds.has(String(p.id)) &&
            (!isMyTeam || !myIdSet || myIdSet.has(String(p.id))),
        )
        .slice(0, 10)
    },
    [allPlayers, allUsedIds, myIdSet],
  )

  // ---- Team mutations ----
  const updateTeam = (teamId: number, updates: Partial<TeamSide>) => {
    setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, ...updates } : t)))
  }

  const addPlayer = (teamId: number, player: any) => {
    setTeams((prev) =>
      prev.map((t) =>
        t.id === teamId
          ? { ...t, players: [...t.players, player], search: '', showResults: false }
          : t,
      ),
    )
  }

  const removePlayer = (teamId: number, playerId: string) => {
    setTeams((prev) =>
      prev.map((t) =>
        t.id === teamId ? { ...t, players: t.players.filter((p) => p.id !== playerId) } : t,
      ),
    )
  }

  const addPick = (teamId: number, pickSeason: number, round: number, pos?: PickPosition) => {
    const rdLabel = round === 1 ? '1st' : round === 2 ? '2nd' : round === 3 ? '3rd' : `${round}th`
    const pick: DraftPick = {
      id: `${pickSeason}-${round}`,
      season: pickSeason,
      round,
      label: `${pickSeason} ${rdLabel}`,
      position: pos,
    }
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t
        if (t.picks.find((p) => p.id === pick.id)) return t
        return { ...t, picks: [...t.picks, pick] }
      }),
    )
  }

  const removePick = (teamId: number, pickId: string) => {
    setTeams((prev) =>
      prev.map((t) =>
        t.id === teamId ? { ...t, picks: t.picks.filter((p) => p.id !== pickId) } : t,
      ),
    )
  }

  const cyclePickPosition = (teamId: number, pickId: string) => {
    const order: PickPosition['kind'][] = ['unknown', 'early', 'mid', 'late']
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t
        return {
          ...t,
          picks: t.picks.map((p) => {
            if (p.id !== pickId) return p
            const curr = p.position?.kind || 'unknown'
            const next = order[(order.indexOf(curr) + 1) % order.length]
            return { ...p, position: { kind: next } }
          }),
        }
      }),
    )
  }

  // ---- Multi-team management ----
  const addTeam = () => {
    const nextId = Math.max(...teams.map((t) => t.id)) + 1
    setTeams((prev) => [
      ...prev,
      { id: nextId, label: `Team ${nextId + 1}`, players: [], picks: [], search: '', showResults: false },
    ])
  }

  const removeTeam = (teamId: number) => {
    if (teams.length <= 2) return
    setTeams((prev) => prev.filter((t) => t.id !== teamId))
  }

  // ---- Computed values ----
  const teamValues = useMemo(() => {
    return teams.map((t) => {
      const playerValue = t.players.reduce(
        (sum, p) => sum + calculateVORP(p, vorpCtx, mode, isDynasty, hasSuperFlex),
        0,
      )
      const pickValue = t.picks.reduce(
        (sum, p) => sum + calculatePickValue(p, season, leagueSize, starterCount, mode),
        0,
      )
      return { teamId: t.id, playerValue, pickValue, total: Math.round(playerValue + pickValue) }
    })
  }, [teams, vorpCtx, mode, isDynasty, hasSuperFlex, season, leagueSize, starterCount])

  // For 2-team mode, compute give/get analysis
  const is2Team = teams.length === 2
  const giveValue = is2Team ? teamValues[0]?.total || 0 : 0
  const getValue = is2Team ? teamValues[1]?.total || 0 : 0
  const tradeDifference = getValue - giveValue
  const tradeRatio = giveValue > 0 ? (getValue / giveValue) * 100 : 0
  const grade = getTradeGrade(tradeDifference, mode)

  // Lineup delta (only for 2-team mode with connected roster)
  const lineupDelta = useMemo(() => {
    if (!is2Team || !myPlayerIds?.length) return null
    const givePlayers = teams[0].players
    const getPlayers = teams[1].players
    if (givePlayers.length === 0 && getPlayers.length === 0) return null
    return calculateLineupDelta(myPlayerIds, givePlayers, getPlayers, rosterSlots, allPlayers)
  }, [is2Team, myPlayerIds, teams, rosterSlots, allPlayers])

  // Tier comparison
  const tierEntries = useMemo<TierEntry[]>(() => {
    if (!is2Team) return []
    return buildTierComparison(teams[0].players, teams[1].players, vorpCtx, mode, isDynasty, hasSuperFlex)
  }, [is2Team, teams, vorpCtx, mode, isDynasty, hasSuperFlex])

  // Available seasons for draft picks
  const pickSeasons = isDynasty ? [season + 1, season + 2, season + 3] : [season + 1]
  const pickRounds = [1, 2, 3, 4]

  const hasValues = is2Team ? giveValue > 0 && getValue > 0 : teamValues.some((v) => v.total > 0)

  // ---- Render helpers ----
  const getTrendingBadge = (playerId: string) => {
    const adds = trendingAdds.get(String(playerId))
    const drops = trendingDrops.get(String(playerId))
    if (adds && adds > 5) return { label: 'HOT', color: 'bg-green-500/20 text-green-400' }
    if (drops && drops > 5) return { label: 'COLD', color: 'bg-red-500/20 text-red-400' }
    if (adds) return { label: `+${adds}`, color: 'bg-green-500/10 text-green-500' }
    if (drops) return { label: `-${drops}`, color: 'bg-red-500/10 text-red-500' }
    return null
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
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">trade analyzer</h2>
              <p className="text-sm text-slate-400 mt-1">
                VORP-based valuation · {leagueSize}-team {isDynasty ? 'dynasty' : 'redraft'}
                {hasSuperFlex ? ' · superflex' : ''}
              </p>
            </div>
            {!isPage && (
              <button onClick={onClose} className="text-slate-400 hover:text-white text-xl font-bold">
                ×
              </button>
            )}
          </div>

          {/* Mode toggle + multi-team controls */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {/* Contender / Rebuilder toggle */}
            <div className="flex gap-1 bg-slate-800 rounded-lg p-0.5">
              {(['neutral', 'contender', 'rebuilder'] as TradeMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    mode === m
                      ? m === 'contender'
                        ? 'bg-amber-600 text-white'
                        : m === 'rebuilder'
                          ? 'bg-blue-600 text-white'
                          : 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Multi-team controls */}
            <button
              onClick={addTeam}
              className="text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded transition-colors"
            >
              + add team
            </button>

            {teams.length > 2 && (
              <span className="text-xs text-slate-500">{teams.length}-team trade</span>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Team columns */}
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${Math.min(teams.length, 4)}, 1fr)` }}
          >
            {teams.map((team, teamIdx) => {
              const tv = teamValues.find((v) => v.teamId === team.id)
              const filtered = getFilteredPlayers(team.id, team.search)
              const isGive = teamIdx === 0 && is2Team
              const isGet = teamIdx === 1 && is2Team
              const accentColor = isGive ? 'text-red-400' : isGet ? 'text-green-400' : 'text-purple-400'
              const accentBorder = isGive
                ? 'border-red-500/30'
                : isGet
                  ? 'border-green-500/30'
                  : 'border-purple-500/30'

              return (
                <div key={team.id} className={`bg-slate-800 rounded-lg p-4 border ${accentBorder}`}>
                  {/* Team header */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-sm font-semibold ${accentColor}`}>
                      {is2Team ? (isGive ? 'you give' : 'you get') : team.label}
                    </h3>
                    {teams.length > 2 && (
                      <button
                        onClick={() => removeTeam(team.id)}
                        className="text-xs text-slate-500 hover:text-red-400"
                        title="Remove team"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Search */}
                  <div className="relative mb-3">
                    <input
                      type="text"
                      placeholder={`Search players${isGive && myIdSet ? ' (your roster)' : ''}...`}
                      value={team.search}
                      onChange={(e) =>
                        updateTeam(team.id, { search: e.target.value, showResults: e.target.value.length > 0 })
                      }
                      onBlur={() => setTimeout(() => updateTeam(team.id, { showResults: false }), 200)}
                      className="w-full bg-slate-700 text-white text-sm p-2 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {team.showResults && filtered.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-slate-700 border border-slate-600 rounded mt-1 max-h-48 overflow-y-auto z-10">
                        {filtered.map((player) => {
                          const badge = getTrendingBadge(player.id)
                          return (
                            <button
                              key={player.id}
                              onClick={() => addPlayer(team.id, player)}
                              className="w-full text-left p-2 hover:bg-slate-600 flex items-center gap-2 text-sm"
                            >
                              <span className="text-xs text-slate-400 w-6">{player.position}</span>
                              <span className="flex-1">{player.name}</span>
                              <span className="text-xs text-slate-500">{player.team}</span>
                              {badge && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.color}`}>
                                  {badge.label}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Player cards */}
                  <div className="space-y-1.5 mb-3">
                    {team.players.map((player) => {
                      const vorp = calculateVORP(player, vorpCtx, mode, isDynasty, hasSuperFlex)
                      const tier = getVORPTier(vorp)
                      const badge = getTrendingBadge(player.id)
                      return (
                        <div
                          key={player.id}
                          className="flex items-center gap-2 bg-slate-700/60 p-2 rounded"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">{player.name}</span>
                              {isDynasty && player.age && (
                                <span className="text-[10px] text-slate-400">{player.age}y</span>
                              )}
                              {badge && (
                                <span className={`text-[10px] px-1 py-0.5 rounded ${badge.color}`}>
                                  {badge.label}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-400">
                                {player.position} · {player.team}
                              </span>
                              <span className={tier.color}>{vorp.toFixed(1)} VORP</span>
                              <span className="text-slate-500">{tier.label}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => removePlayer(team.id, player.id)}
                            className="text-slate-500 hover:text-red-400 text-sm"
                          >
                            ×
                          </button>
                        </div>
                      )
                    })}

                    {/* Pick cards */}
                    {team.picks.map((pick) => {
                      const pv = calculatePickValue(pick, season, leagueSize, starterCount, mode)
                      const hr = getPickHitRate(pick.round)
                      return (
                        <div
                          key={pick.id}
                          className="flex items-center gap-2 bg-slate-700/60 p-2 rounded"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium">{pick.label}</div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-400">Draft Pick</span>
                              <span className="text-indigo-400">{pv} value</span>
                              <button
                                onClick={() => cyclePickPosition(team.id, pick.id)}
                                className="text-slate-500 hover:text-white transition-colors"
                                title="Click to cycle: unknown → early → mid → late"
                              >
                                {pick.position?.kind === 'early'
                                  ? '(early)'
                                  : pick.position?.kind === 'mid'
                                    ? '(mid)'
                                    : pick.position?.kind === 'late'
                                      ? '(late)'
                                      : '(?)'}
                              </button>
                              <span className="text-slate-500">{Math.round(hr * 100)}% hit</span>
                            </div>
                          </div>
                          <button
                            onClick={() => removePick(team.id, pick.id)}
                            className="text-slate-500 hover:text-red-400 text-sm"
                          >
                            ×
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {/* Add draft pick */}
                  <div className="mb-3">
                    <div className="text-[10px] text-slate-500 mb-1">add draft pick</div>
                    <div className="flex gap-1 flex-wrap">
                      {pickSeasons.map((yr) =>
                        pickRounds.map((rd) => {
                          const id = `${yr}-${rd}`
                          if (allUsedPickIds.has(id)) return null
                          const rdLabel =
                            rd === 1 ? '1st' : rd === 2 ? '2nd' : rd === 3 ? '3rd' : `${rd}th`
                          return (
                            <button
                              key={id}
                              onClick={() => addPick(team.id, yr, rd)}
                              className="text-[10px] bg-slate-700 hover:bg-slate-600 px-1.5 py-0.5 rounded transition-colors"
                            >
                              {yr} {rdLabel}
                            </button>
                          )
                        }),
                      )}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="border-t border-slate-700 pt-2">
                    <div className={`text-sm font-bold ${accentColor}`}>
                      total: {tv?.total || 0} VORP
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Analysis section (2-team mode) */}
          {is2Team && hasValues && (
            <div className="mt-6">
              {/* Tab bar */}
              <div className="flex gap-1 mb-4 bg-slate-800 rounded-lg p-0.5 w-fit">
                {(
                  [
                    { key: 'analysis', label: 'Analysis' },
                    { key: 'tiers', label: 'Tier Breaks' },
                    ...(myPlayerIds?.length ? [{ key: 'lineup', label: 'Lineup Impact' }] : []),
                  ] as { key: typeof activeTab; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      activeTab === tab.key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Analysis tab */}
              {activeTab === 'analysis' && (
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Grade + numbers */}
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <div className="text-center mb-4">
                      <div className={`text-4xl font-bold ${grade.color}`}>{grade.grade}</div>
                      <div className="text-sm text-slate-400">{grade.description}</div>
                      {mode !== 'neutral' && (
                        <div className="text-[10px] text-slate-500 mt-1">
                          {mode === 'contender' ? 'contender perspective' : 'rebuilder perspective'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">VORP difference</span>
                        <span className={tradeDifference >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {tradeDifference >= 0 ? '+' : ''}
                          {tradeDifference.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">trade ratio</span>
                        <span className={tradeRatio >= 100 ? 'text-green-400' : 'text-red-400'}>
                          {tradeRatio.toFixed(1)}%
                        </span>
                      </div>
                      {lineupDelta !== null && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">lineup impact</span>
                          <span className={lineupDelta >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {lineupDelta >= 0 ? '+' : ''}
                            {lineupDelta.toFixed(1)} pts/wk
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Replacement level context */}
                    <div className="mt-4 pt-3 border-t border-slate-700">
                      <div className="text-[10px] text-slate-500 mb-1.5">replacement levels (VORP baseline)</div>
                      <div className="grid grid-cols-3 gap-1">
                        {Object.entries(vorpCtx.replacementLevels)
                          .filter(([, v]) => v > 0)
                          .sort(([, a], [, b]) => b - a)
                          .map(([pos, pts]) => (
                            <div key={pos} className="text-[10px] text-slate-400">
                              <span className="text-slate-300">{pos}</span> {pts.toFixed(0)}pts
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Recommendation + considerations */}
                  <div className="bg-slate-800 p-4 rounded-lg space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2">recommendation</h4>
                      <p className="text-sm text-slate-300">
                        {tradeDifference >= 25
                          ? "This is a great trade for you. You're getting significantly more VORP."
                          : tradeDifference >= 10
                            ? "Solid trade. You're gaining meaningful value."
                            : tradeDifference >= -10
                              ? 'Fair trade. Both sides are roughly equal in value.'
                              : tradeDifference >= -25
                                ? "This slightly favors your opponent. Consider if it fills a specific need."
                                : "This trade heavily favors your opponent. You might want to reconsider."}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold mb-2">considerations</h4>
                      <ul className="text-xs text-slate-300 space-y-1">
                        <li>
                          &bull; Values based on VORP (replacement level = {leagueSize}-team, {starterCount}{' '}
                          starters)
                        </li>
                        {hasSuperFlex && (
                          <li>&bull; Superflex league: QBs carry a significant premium</li>
                        )}
                        {isDynasty && mode === 'contender' && (
                          <li>&bull; Contender mode: current production weighted heavily, picks discounted</li>
                        )}
                        {isDynasty && mode === 'rebuilder' && (
                          <li>&bull; Rebuilder mode: youth premium amplified, picks valued higher</li>
                        )}
                        {isDynasty && <li>&bull; Dynasty: age curves factor into valuations</li>}
                        {teams[0].players.some((p) => p.injury_status) && (
                          <li>
                            &bull; Injured players are penalized{' '}
                            {mode === 'contender' ? '(-30%)' : '(-15%)'}
                          </li>
                        )}
                        <li>&bull; Consider your team's positional needs and depth</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Tier break visualization */}
              {activeTab === 'tiers' && (
                <div className="bg-slate-800 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold mb-3">tier comparison</h4>
                  {tierEntries.length > 0 ? (
                    <div className="space-y-1.5">
                      {tierEntries.map((entry, i) => {
                        const maxVORP = tierEntries[0]?.vorp || 1
                        const barWidth = Math.max(5, (entry.vorp / maxVORP) * 100)
                        return (
                          <div key={`${entry.name}-${i}`} className="flex items-center gap-2">
                            <div className="w-16 text-right">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  entry.side === 'give'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-green-500/20 text-green-400'
                                }`}
                              >
                                {entry.side === 'give' ? 'GIVE' : 'GET'}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs text-slate-400">{entry.position}</span>
                                <span className="text-sm">{entry.name}</span>
                                <span className={`text-xs ${getVORPTier(entry.vorp).color}`}>
                                  {entry.tierLabel}
                                </span>
                              </div>
                              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    entry.side === 'give' ? 'bg-red-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </div>
                            <div className="w-16 text-right text-xs text-slate-400">
                              {entry.vorp.toFixed(1)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Add players to both sides to see tier comparison</p>
                  )}

                  {/* Tier legend */}
                  <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-700">
                    {[
                      { label: 'Elite', color: 'text-purple-400', min: '80+' },
                      { label: 'Star', color: 'text-blue-400', min: '50-79' },
                      { label: 'Starter', color: 'text-green-400', min: '30-49' },
                      { label: 'Flex', color: 'text-yellow-400', min: '15-29' },
                      { label: 'Bench', color: 'text-orange-400', min: '5-14' },
                      { label: 'Waiver', color: 'text-slate-400', min: '<5' },
                    ].map((t) => (
                      <div key={t.label} className="flex items-center gap-1 text-[10px]">
                        <span className={t.color}>{t.label}</span>
                        <span className="text-slate-500">{t.min}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lineup impact */}
              {activeTab === 'lineup' && myPlayerIds?.length && (
                <div className="bg-slate-800 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold mb-3">projected lineup impact</h4>
                  {lineupDelta !== null ? (
                    <div className="text-center py-4">
                      <div
                        className={`text-3xl font-bold ${
                          lineupDelta >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {lineupDelta >= 0 ? '+' : ''}
                        {lineupDelta.toFixed(1)}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">points per week</div>
                      <p className="text-xs text-slate-500 mt-3">
                        Based on optimal lineup construction with your current roster of{' '}
                        {myPlayerIds.length} players
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {lineupDelta >= 2
                          ? 'This trade significantly improves your weekly ceiling.'
                          : lineupDelta >= 0.5
                            ? 'This trade provides a moderate weekly boost.'
                            : lineupDelta >= -0.5
                              ? 'This trade has minimal impact on your weekly output.'
                              : lineupDelta >= -2
                                ? 'This trade slightly weakens your starting lineup.'
                                : 'This trade significantly hurts your weekly output.'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Add players to both sides to see lineup impact
                    </p>
                  )}
                </div>
              )}

              {/* Trade summary */}
              <div className="mt-4 bg-slate-800 p-4 rounded-lg">
                <h3 className="text-sm font-semibold mb-3">trade summary</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-red-400 mb-2">
                      giving ({giveValue} VORP)
                    </h4>
                    <ul className="space-y-1">
                      {teams[0].players.map((p) => (
                        <li key={p.id} className="text-xs text-slate-300">
                          {p.name} ({p.position}
                          {isDynasty && p.age ? `, ${p.age}` : ''}) —{' '}
                          {calculateVORP(p, vorpCtx, mode, isDynasty, hasSuperFlex).toFixed(1)} VORP
                        </li>
                      ))}
                      {teams[0].picks.map((p) => (
                        <li key={p.id} className="text-xs text-slate-300">
                          {p.label}
                          {p.position?.kind !== 'unknown' ? ` (${p.position?.kind})` : ''} —{' '}
                          {calculatePickValue(p, season, leagueSize, starterCount, mode)} value
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-green-400 mb-2">
                      getting ({getValue} VORP)
                    </h4>
                    <ul className="space-y-1">
                      {teams[1].players.map((p) => (
                        <li key={p.id} className="text-xs text-slate-300">
                          {p.name} ({p.position}
                          {isDynasty && p.age ? `, ${p.age}` : ''}) —{' '}
                          {calculateVORP(p, vorpCtx, mode, isDynasty, hasSuperFlex).toFixed(1)} VORP
                        </li>
                      ))}
                      {teams[1].picks.map((p) => (
                        <li key={p.id} className="text-xs text-slate-300">
                          {p.label}
                          {p.position?.kind !== 'unknown' ? ` (${p.position?.kind})` : ''} —{' '}
                          {calculatePickValue(p, season, leagueSize, starterCount, mode)} value
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Multi-team analysis (3+ teams) */}
          {!is2Team && hasValues && (
            <div className="mt-6 bg-slate-800 p-4 rounded-lg">
              <h3 className="text-sm font-semibold mb-3">multi-team analysis</h3>
              <div className="space-y-2">
                {teams.map((team, idx) => {
                  const tv = teamValues.find((v) => v.teamId === team.id)
                  const avgValue = teamValues.reduce((s, v) => s + v.total, 0) / teams.length
                  const delta = (tv?.total || 0) - avgValue
                  return (
                    <div key={team.id} className="flex items-center justify-between py-2 px-3 bg-slate-700 rounded">
                      <span className="text-sm font-medium">{team.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-300">{tv?.total || 0} VORP</span>
                        <span
                          className={`text-xs ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {delta >= 0 ? '+' : ''}
                          {delta.toFixed(1)} vs avg
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!hasValues && (
            <div className="mt-6 text-center text-slate-400 py-8">
              <p>Add players to both sides to see trade analysis</p>
              <p className="text-xs text-slate-500 mt-1">
                Values calculated using VORP based on your league's {leagueSize}-team, {starterCount}-starter format
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
