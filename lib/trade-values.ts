import { SLOT_ELIGIBLE } from "./roster-utils"
import type { LeagueSettings } from "./league-context"

// ---- Types ----

export type TradeMode = "neutral" | "contender" | "rebuilder"

export interface PickPosition { kind: "early" | "mid" | "late" | "unknown" }

export interface DraftPick {
  id: string
  season: number
  round: number
  label: string
  position?: PickPosition
}

export interface TrendingPlayer {
  player_id: string
  count: number // number of adds/drops in lookback window
}

export interface VORPContext {
  replacementLevels: Record<string, number>  // position → replacement-level fantasy points
  leagueSize: number
  starterDemand: Record<string, number>      // position → total starters across all teams
}

export interface TradeResult {
  giveValue: number
  getValue: number
  difference: number
  ratio: number
  grade: { grade: string; color: string; description: string }
  lineupDelta: number | null // points/week change, null if no roster connected
  tierComparison: TierEntry[]
}

export interface TierEntry {
  name: string
  position: string
  vorp: number
  tier: number
  tierLabel: string
  side: "give" | "get"
}

// ---- Constants ----

/** Historical hit rates by draft round (% chance of producing a fantasy starter) */
const HIT_RATES: Record<number, number> = { 1: 0.60, 2: 0.35, 3: 0.15, 4: 0.05 }

/** Base pick values by round for a 12-team league */
const PICK_BASE_12: Record<number, number> = { 1: 100, 2: 55, 3: 30, 4: 15 }

/** Pick position multipliers */
const PICK_POSITION_MULT: Record<string, number> = {
  early: 1.25,  // top 4 pick in that round
  mid: 1.0,
  late: 0.80,
  unknown: 1.0,
}

/** League size scaling for pick values */
function leagueSizePickScale(leagueSize: number): number {
  // Larger leagues → slightly less valuable picks (more competition)
  if (leagueSize <= 8) return 1.15
  if (leagueSize <= 10) return 1.08
  if (leagueSize <= 12) return 1.0
  if (leagueSize <= 14) return 0.90
  return 0.82
}

// ---- VORP Engine ----

/**
 * Count how many starting slots each position has across all teams in the league.
 * Flex slots distribute fractional demand across eligible positions.
 */
export function calculateStarterDemand(
  rosterSlots: string[],
  leagueSize: number,
): Record<string, number> {
  const demand: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0 }

  for (const slot of rosterSlots) {
    const eligible = SLOT_ELIGIBLE[slot]
    if (!eligible) continue

    if (eligible.length === 1) {
      // Dedicated slot — full demand
      demand[eligible[0]] = (demand[eligible[0]] || 0) + leagueSize
    } else {
      // Flex slot — distribute demand proportionally by typical usage
      // In practice: FLEX is ~45% RB, ~40% WR, ~15% TE
      // SUPER_FLEX is ~60% QB, ~15% RB, ~15% WR, ~10% TE
      const weights = getFlexWeights(slot)
      for (const pos of eligible) {
        const w = weights[pos] || 1 / eligible.length
        demand[pos] = (demand[pos] || 0) + leagueSize * w
      }
    }
  }

  return demand
}

function getFlexWeights(slot: string): Record<string, number> {
  switch (slot) {
    case "SUPER_FLEX":
      return { QB: 0.60, RB: 0.15, WR: 0.15, TE: 0.10 }
    case "FLEX":
      return { RB: 0.45, WR: 0.40, TE: 0.15 }
    case "REC_FLEX":
      return { WR: 0.65, TE: 0.35 }
    case "WRRB_FLEX":
      return { WR: 0.55, RB: 0.45 }
    default:
      return {}
  }
}

/**
 * Calculate replacement-level points for each position.
 * Replacement level = the points scored by the (N+1)th best player,
 * where N = total starters at that position across the league.
 */
export function calculateReplacementLevels(
  allPlayers: any[],
  rosterSlots: string[],
  leagueSize: number,
): VORPContext {
  const starterDemand = calculateStarterDemand(rosterSlots, leagueSize)
  const replacementLevels: Record<string, number> = {}

  const positions = ["QB", "RB", "WR", "TE", "K", "DEF"]
  for (const pos of positions) {
    // Sort players at this position by fantasy points (descending)
    const posPlayers = allPlayers
      .filter((p) => p.position === pos && typeof p.fantasyPoints === "number")
      .sort((a, b) => (b.fantasyPoints || 0) - (a.fantasyPoints || 0))

    const demandCount = Math.round(starterDemand[pos] || 0)
    // Replacement level is the player just outside the starter pool
    const replacementIndex = Math.min(demandCount, posPlayers.length - 1)
    replacementLevels[pos] = replacementIndex >= 0 && posPlayers[replacementIndex]
      ? posPlayers[replacementIndex].fantasyPoints || 0
      : 0
  }

  return { replacementLevels, leagueSize, starterDemand }
}

/**
 * Calculate a player's VORP (Value Over Replacement Player).
 */
export function calculateVORP(
  player: any,
  ctx: VORPContext,
  mode: TradeMode = "neutral",
  isDynasty: boolean = false,
  hasSuperFlex: boolean = false,
): number {
  const pos = player.position as string
  const points = (player.fantasyPoints || 0) as number
  const replacement = ctx.replacementLevels[pos] || 0

  let vorp = points - replacement
  // Floor at 0 — negative VORP players are replacement-level
  vorp = Math.max(vorp, 0)

  // ---- Mode adjustments ----
  if (mode === "contender") {
    // Contenders weight current production more heavily
    vorp *= 1.15
  } else if (mode === "rebuilder") {
    // Rebuilders discount current production
    vorp *= 0.85
  }

  // ---- Dynasty age adjustments ----
  if (isDynasty && player.age) {
    const age = player.age as number
    let ageMult = 1.0

    if (mode === "rebuilder") {
      // Amplified youth premium
      if (age <= 22) ageMult = 1.50
      else if (age <= 24) ageMult = 1.30
      else if (age <= 26) ageMult = 1.05
      else if (age <= 28) ageMult = 0.70
      else if (age <= 30) ageMult = 0.45
      else ageMult = 0.25
    } else if (mode === "contender") {
      // Age matters less for contenders (win-now)
      if (age <= 22) ageMult = 1.10
      else if (age <= 24) ageMult = 1.10
      else if (age <= 26) ageMult = 1.0
      else if (age <= 28) ageMult = 0.90
      else if (age <= 30) ageMult = 0.75
      else ageMult = 0.55
    } else {
      // Neutral dynasty
      if (age <= 22) ageMult = 1.30
      else if (age <= 24) ageMult = 1.20
      else if (age <= 26) ageMult = 1.0
      else if (age <= 28) ageMult = 0.80
      else if (age <= 30) ageMult = 0.60
      else ageMult = 0.40
    }

    // Position-specific aging curves
    if (pos === "RB" && age >= 27) ageMult *= 0.85 // RBs decline faster
    if (pos === "QB" && age < 32) ageMult = Math.max(ageMult, 0.9) * 1.08 // QBs age slower
    if (pos === "WR" && age <= 26) ageMult *= 1.05 // Young WRs have high upside

    vorp *= ageMult
  }

  // ---- Superflex QB premium ----
  // VORP already captures some of this via replacement level,
  // but we add a small additional premium since QB scarcity is amplified
  if (hasSuperFlex && pos === "QB") {
    vorp *= 1.15
  }

  // ---- Injury penalty ----
  if (player.injury_status) {
    const penalty = mode === "contender" ? 0.70 : 0.85
    vorp *= penalty
  }

  return Math.round(vorp * 10) / 10
}

// ---- Draft Pick Valuation ----

/**
 * Calculate the value of a draft pick using league-aware modeling.
 */
export function calculatePickValue(
  pick: DraftPick,
  currentSeason: number,
  leagueSize: number = 12,
  starterCount: number = 9,
  mode: TradeMode = "neutral",
): number {
  const base = PICK_BASE_12[pick.round] || 10

  // Scale by league size
  let value = base * leagueSizePickScale(leagueSize)

  // Scale by starter count (more starters → picks slightly more valuable)
  const starterScale = starterCount > 9 ? 1 + (starterCount - 9) * 0.03 : 1.0
  value *= starterScale

  // Position multiplier (early/mid/late)
  const posMult = PICK_POSITION_MULT[pick.position?.kind || "unknown"]
  value *= posMult

  // Future discount
  const yearsOut = pick.season - currentSeason
  if (mode === "contender") {
    // Contenders discount future picks more aggressively
    value *= Math.pow(0.70, yearsOut)
  } else if (mode === "rebuilder") {
    // Rebuilders barely discount future picks
    value *= Math.pow(0.95, yearsOut)
  } else {
    // Neutral: 10% discount per year
    value *= Math.pow(0.90, yearsOut)
  }

  return Math.round(value)
}

/**
 * Get hit rate for a draft round.
 */
export function getPickHitRate(round: number): number {
  return HIT_RATES[round] || 0.03
}

// ---- Lineup Delta ----

/**
 * Calculate the projected weekly points change from a trade.
 * Uses priority-based slot filling to build optimal lineups before and after.
 */
export function calculateLineupDelta(
  currentRosterIds: string[],
  givePlayers: any[],
  getPlayers: any[],
  rosterSlots: string[],
  allPlayers: any[],
): number {
  // Build player lookup
  const playerMap = new Map<string, any>()
  for (const p of allPlayers) playerMap.set(String(p.id), p)

  // Current roster players
  const beforeIds = new Set(currentRosterIds.map(String))
  const afterIds = new Set(currentRosterIds.map(String))

  // Apply trade
  for (const p of givePlayers) afterIds.delete(String(p.id))
  for (const p of getPlayers) afterIds.add(String(p.id))

  const beforeLineup = buildOptimalLineup(beforeIds, playerMap, rosterSlots)
  const afterLineup = buildOptimalLineup(afterIds, playerMap, rosterSlots)

  const beforePoints = beforeLineup.reduce((sum, e) => sum + (e.player?.fantasyPoints || 0), 0)
  const afterPoints = afterLineup.reduce((sum, e) => sum + (e.player?.fantasyPoints || 0), 0)

  // Convert season total to weekly (17-game season)
  return Math.round(((afterPoints - beforePoints) / 17) * 10) / 10
}

function buildOptimalLineup(
  rosterIds: Set<string>,
  playerMap: Map<string, any>,
  rosterSlots: string[],
): { slot: string; player: any | null }[] {
  const players = Array.from(rosterIds)
    .map((id) => playerMap.get(id))
    .filter(Boolean)
    .sort((a, b) => (b.fantasyPoints || 0) - (a.fantasyPoints || 0))

  const usedIds = new Set<string>()
  const filled: { slot: string; player: any | null }[] = rosterSlots.map((s) => ({
    slot: s,
    player: null,
  }))

  // Build priority-ordered indices (restrictive slots first)
  const indices = rosterSlots.map((slot, i) => ({ slot, i }))
  indices.sort((a, b) => {
    const pa = a.slot === "SUPER_FLEX" ? 3 : ["FLEX", "REC_FLEX", "WRRB_FLEX"].includes(a.slot) ? 2 : 0
    const pb = b.slot === "SUPER_FLEX" ? 3 : ["FLEX", "REC_FLEX", "WRRB_FLEX"].includes(b.slot) ? 2 : 0
    return pa - pb
  })

  for (const { slot, i } of indices) {
    const eligible = SLOT_ELIGIBLE[slot] || []
    const best = players.find(
      (p) => !usedIds.has(String(p.id)) && eligible.includes(p.position),
    )
    if (best) {
      usedIds.add(String(best.id))
      filled[i] = { slot, player: best }
    }
  }

  return filled
}

// ---- Tier Breaks ----

const TIER_THRESHOLDS = [
  { min: 80, label: "Elite", tier: 1, color: "text-purple-400" },
  { min: 50, label: "Star", tier: 2, color: "text-blue-400" },
  { min: 30, label: "Starter", tier: 3, color: "text-green-400" },
  { min: 15, label: "Flex", tier: 4, color: "text-yellow-400" },
  { min: 5, label: "Bench", tier: 5, color: "text-orange-400" },
  { min: 0, label: "Waiver", tier: 6, color: "text-slate-400" },
]

export function getVORPTier(vorp: number): { tier: number; label: string; color: string } {
  for (const t of TIER_THRESHOLDS) {
    if (vorp >= t.min) return { tier: t.tier, label: t.label, color: t.color }
  }
  return { tier: 6, label: "Waiver", color: "text-slate-400" }
}

/**
 * Build tier entries for all players in a trade for visualization.
 */
export function buildTierComparison(
  givePlayers: any[],
  getPlayers: any[],
  ctx: VORPContext,
  mode: TradeMode,
  isDynasty: boolean,
  hasSuperFlex: boolean,
): TierEntry[] {
  const entries: TierEntry[] = []

  for (const p of givePlayers) {
    const vorp = calculateVORP(p, ctx, mode, isDynasty, hasSuperFlex)
    const tier = getVORPTier(vorp)
    entries.push({
      name: p.name,
      position: p.position,
      vorp,
      tier: tier.tier,
      tierLabel: tier.label,
      side: "give",
    })
  }

  for (const p of getPlayers) {
    const vorp = calculateVORP(p, ctx, mode, isDynasty, hasSuperFlex)
    const tier = getVORPTier(vorp)
    entries.push({
      name: p.name,
      position: p.position,
      vorp,
      tier: tier.tier,
      tierLabel: tier.label,
      side: "get",
    })
  }

  return entries.sort((a, b) => b.vorp - a.vorp)
}

// ---- Trade Grade ----

export function getTradeGrade(difference: number, mode: TradeMode): { grade: string; color: string; description: string } {
  // Adjust thresholds based on mode
  const bias = mode === "contender" ? -5 : mode === "rebuilder" ? -5 : 0
  const d = difference + bias

  if (d >= 40) return { grade: "A+", color: "text-green-400", description: "Massive win" }
  if (d >= 25) return { grade: "A", color: "text-green-400", description: "Clear win" }
  if (d >= 12) return { grade: "B+", color: "text-green-300", description: "Slight edge" }
  if (d >= -12) return { grade: "B", color: "text-yellow-400", description: "Fair trade" }
  if (d >= -25) return { grade: "C", color: "text-orange-400", description: "Slight loss" }
  if (d >= -40) return { grade: "D", color: "text-red-400", description: "Bad trade" }
  return { grade: "F", color: "text-red-500", description: "Lopsided loss" }
}
