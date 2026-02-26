'use client'

import { useEffect, useState, useMemo, useCallback } from "react"
import { API_BASE_URL } from "@/constants"
import { fetcher } from "@/lib/api"
import { getAdp, type AdpEntry } from "@/lib/api"
import { getPicks, savePicks, clearPicks, type Pick } from "@/lib/api"
import type { Player as BasePlayer } from "@/types"
import PlayerDetailModal from "@/components/PlayerDetailModal"
import PlatformConnect from "@/components/PlatformConnect"
import { useLeague } from "@/lib/league-context"
import { SLOT_ELIGIBLE, countSlots, sortSlotsByPriority, slotLabel } from "@/lib/roster-utils"
import io from "socket.io-client"

// Extend Player type locally to include the stat fields we are using
type Player = BasePlayer & {
  fantasyPoints?: number
  rushAtt?: number
  receptions?: number
  targets?: number
  passAtt?: number
  passCmp?: number
  rushYds?: number
  rushTD?: number
  recYds?: number
  recTD?: number
  passYds?: number
  passTD?: number
  adp?: number
  /** computed */
  rank?: number
  posRank?: number
  score?: number
}

// Table cell helpers for consistent spacing and alignment
const CELL = "px-2 py-1.5 whitespace-nowrap";
const CELL_NUM = `${CELL} text-right tabular-nums font-aptos`;

// Bye week mapping for 2025 NFL season
const BYE_WEEKS: Record<string, number> = {
  'ARI': 11, 'ATL': 12, 'BAL': 14, 'BUF': 12, 'CAR': 7, 'CHI': 7,
  'CIN': 12, 'CLE': 10, 'DAL': 7, 'DEN': 14, 'DET': 5, 'GB': 10,
  'HOU': 14, 'IND': 14, 'JAX': 12, 'KC': 6, 'LV': 10, 'LAC': 5,
  'LAR': 6, 'MIA': 6, 'MIN': 6, 'NE': 14, 'NO': 12, 'NYG': 11,
  'NYJ': 12, 'PHI': 5, 'PIT': 9, 'SF': 9, 'SEA': 10, 'TB': 11,
  'TEN': 5, 'WAS': 14
}

// Helpers to read nested fields and coerce values
function getPath(obj: Record<string, unknown>, path: string): unknown {
  if (!obj || !path) return undefined
  return path.split(".").reduce((acc: unknown, k: string) => {
    return (acc && typeof acc === 'object' && acc !== null && k in acc) 
      ? (acc as Record<string, unknown>)[k] 
      : undefined
  }, obj)
}

function toNum(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined
  if (typeof v === "string") {
    const t = v.trim()
    if (!t || t === "-" || t.toLowerCase() === "na") return undefined
    const n = Number(t)
    return Number.isFinite(n) ? n : undefined
  }
  return typeof v === "number" && Number.isFinite(v) ? v : undefined
}

// Map backend fields (flat or nested) to the local camelCase fields we render
function normalizeStats(raw: Record<string, unknown>): Partial<Player> {
  const pickFlat = (...keys: string[]) => {
    for (const k of keys) {
      if (raw?.[k] !== undefined && raw?.[k] !== null) return raw[k]
    }
    return undefined
  }
  const pickNested = (...paths: string[]) => {
    for (const p of paths) {
      const v = getPath(raw, p)
      if (v !== undefined && v !== null) return v
    }
    return undefined
  }

  return {
    // Fantasy points
    fantasyPoints: toNum(
      pickFlat("fantasy_points", "fantasyPoints", "fp", "points", "pts") ??
      pickNested("fantasy.points")
    ),

    // Rushing
    rushAtt: toNum(
      pickFlat("rush_att", "rushing_att", "rush_attempts", "carries", "att_rush", "attempts_rush") ??
      pickNested("rushing.att", "rushing.attempts", "rush.att")
    ),
    rushYds: toNum(
      pickFlat("rush_yds", "rushing_yds", "rush_yards") ??
      pickNested("rushing.yds", "rushing.yards", "rush.yds")
    ),
    rushTD: toNum(
      pickFlat("rush_td", "rushing_td", "rush_tds", "rushing_tds", "rtd") ??
      pickNested("rushing.td", "rushing.tds", "rush.td")
    ),

    // Receiving
    receptions: toNum(
      pickFlat("rec", "receptions", "recs", "catches") ??
      pickNested("receiving.rec", "receiving.receptions", "rec.rec")
    ),
    targets: toNum(
      pickFlat("targets", "tgt") ??
      pickNested("receiving.targets", "rec.targets")
    ),
    recYds: toNum(
      pickFlat("rec_yds", "receiving_yds", "rec_yards", "recv_yards") ??
      pickNested("receiving.yds", "receiving.yards", "rec.yds")
    ),
    recTD: toNum(
      pickFlat("rec_td", "receiving_td", "rec_tds", "receiving_tds") ??
      pickNested("receiving.td", "receiving.tds", "rec.td")
    ),

    // Passing
    passAtt: toNum(
      pickFlat("pass_att", "attempts", "att") ??
      pickNested("passing.att", "passing.attempts", "pass.att", "pass.attempts")
    ),
    passCmp: toNum(
      pickFlat("pass_cmp", "cmp", "completions", "pass_completions") ??
      pickNested("passing.cmp", "passing.completions", "pass.cmp", "pass.completions")
    ),
    passYds: toNum(
      pickFlat("pass_yds", "passing_yds", "pass_yards") ??
      pickNested("passing.yds", "passing.yards", "pass.yds")
    ),
    passTD: toNum(
      pickFlat("pass_td", "passing_td", "pass_tds", "passing_tds") ??
      pickNested("passing.td", "passing.tds", "pass.td")
    ),
  }
}

const toPickArray = (players: Player[], picksPerRound: number): Pick[] =>
  players.map((p, i) => ({
    id: crypto.randomUUID(),
    player_id: p.id,
    player_name: p.name,
    position: p.position,
    team: p.team,
    round: Math.floor(i / picksPerRound) + 1,
    overall: i + 1,
    slot: null,
    timestamp: Date.now() / 1000,
  }))

// Helper to map progress % to Tailwind width class
const getProgressWidthClass = (progress: number): string => {
  const rounded = Math.round(progress)
  if (rounded >= 100) return "w-full"
  if (rounded >= 90) return "w-[90%]"
  if (rounded >= 80) return "w-[80%]"
  if (rounded >= 70) return "w-[70%]"
  if (rounded >= 60) return "w-[60%]"
  if (rounded >= 50) return "w-[50%]"
  if (rounded >= 40) return "w-[40%]"
  if (rounded >= 30) return "w-[30%]"
  if (rounded >= 20) return "w-[20%]"
  if (rounded >= 10) return "w-[10%]"
  return "w-[5%]"
}

export default function DraftPage() {
  const { season, isConnected, allRosteredIds, rosterOwners, myPlayerIds, leagueSettings } = useLeague()
  const [players, setPlayers] = useState<Player[]>([])
  const [position, setPosition] = useState("ALL")
  const [searchTerm, setSearchTerm] = useState("")
  const [drafted, setDrafted] = useState<Player[]>([])
  const [sortField, setSortField] = useState<keyof Player | null>("adp")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null)
  const [isOnlineMode, setIsOnlineMode] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [showByeWeeks, setShowByeWeeks] = useState(true)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const draftId = "global-draft" // Single global draft board

  // Platform sync state for Sleeper integration
  const [selectedPlatform, setSelectedPlatform] = useState("")
  const [sleeperDraftId, setSleeperDraftId] = useState<string | null>(null)
  const [draftedFromPlatform, setDraftedFromPlatform] = useState<string[]>([])

  // Saved teams
  const [savedTeams, setSavedTeams] = useState<{ id: string; name: string; picks?: any[] }[]>([])
  const [showSavedTeams, setShowSavedTeams] = useState(false)

  const CURRENT_YEAR = season
  const STATS_YEAR = CURRENT_YEAR - 1 // last completed NFL season stats
  const DISPLAY_YEAR = STATS_YEAR // show in UI subtitle

  // Build player ID → owner name lookup when connected to a league
  const ownerByPlayerId = useMemo(() => {
    if (!isConnected || !rosterOwners.length) return new Map<string, string>()
    const map = new Map<string, string>()
    for (const owner of rosterOwners) {
      for (const pid of owner.playerIds) {
        map.set(pid, owner.displayName)
      }
    }
    return map
  }, [isConnected, rosterOwners])

  const [adpByKey, setAdpByKey] = useState<Record<string, number>>({})
  const makeKey = useCallback((name: string, pos: string) => 
    `${name}`.trim().toUpperCase() + "|" + `${pos}`.trim().toUpperCase(), [])

  // Only show players who are currently on an NFL team (hide FAs/invalid placeholders)
  const isOnTeam = (p: Player) => {
    const t = (p.team || "").trim().toUpperCase()
    if (!t) return true // allow rookies without team (pre-draft prospects)
    if (t === "FA" || t === "FA*" || t === "FREE AGENT") return false
    return true
  }

  const nameBlacklist = /\b(invalid|player invalid|free agent|practice squad)\b/i

  // Helper function to get bye week info
  const getByeWeekInfo = (team: string, selectedWeek: number) => {
    const byeWeek = BYE_WEEKS[team?.toUpperCase()]
    if (!byeWeek) return { isBye: false, byeWeek: null }
    
    const isBye = selectedWeek === byeWeek
    return { isBye, byeWeek }
  }

  const handleSort = (field: keyof Player) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  const PICKS_PER_ROUND = 15
  const TOTAL_ROUNDS = 1
  const TOTAL_PICKS = PICKS_PER_ROUND * TOTAL_ROUNDS
  const progress = Math.min((drafted.length / TOTAL_PICKS) * 100, 100)
  const currentRound = Math.floor(drafted.length / PICKS_PER_ROUND) + 1
  const currentPick = (drafted.length % PICKS_PER_ROUND) + 1

  const starterSlots = leagueSettings.rosterSlots
  const ROSTER_LIMITS = countSlots(starterSlots)

  const hasAvailableStarterSlot = (player: Player) => {
    const countAtPosition = starters.filter((p) => p.position === player.position).length
    if (countAtPosition < (ROSTER_LIMITS[player.position] || 0)) {
      return true
    }
    if (["RB", "WR", "TE"].includes(player.position)) {
      const flexCount = starters.filter((p) =>
        p.position === "FLEX" || ["RB", "WR", "TE"].includes(p.position)
      ).length
      return (
        flexCount <
        ((ROSTER_LIMITS["RB"] || 0) +
          (ROSTER_LIMITS["WR"] || 0) +
          (ROSTER_LIMITS["TE"] || 0) +
          (ROSTER_LIMITS["FLEX"] || 0))
      )
    }
    return false
  }

  // Fill starter slots in priority order (restrictive first, flex/superflex last)
  const startersWithSlots: (Player | null)[] = new Array(starterSlots.length).fill(null)
  const usedPlayerIds = new Set<string>()

  // Build priority-ordered indices
  const slotIndices = starterSlots.map((slot, i) => ({ slot, i }))
  slotIndices.sort((a, b) => {
    const pa = a.slot === "SUPER_FLEX" ? 3 : a.slot === "FLEX" || a.slot === "REC_FLEX" || a.slot === "WRRB_FLEX" ? 2 : 0
    const pb = b.slot === "SUPER_FLEX" ? 3 : b.slot === "FLEX" || b.slot === "REC_FLEX" || b.slot === "WRRB_FLEX" ? 2 : 0
    return pa - pb
  })

  for (const { slot, i } of slotIndices) {
    const eligible = SLOT_ELIGIBLE[slot] || []
    const player = drafted.find(
      (p) => !usedPlayerIds.has(p.id) && eligible.includes(p.position)
    ) || null
    if (player) usedPlayerIds.add(player.id)
    startersWithSlots[i] = player
  }

  const starters = startersWithSlots.filter((p) => p !== null) as Player[]
  const bench = drafted.filter((p) => !starters.includes(p))

  useEffect(() => {
    if (!players.length) return
    getPicks(draftId)
      .then((serverPicks) => {
        const mapped = serverPicks
          .map((pk) => players.find((pl) => pl.id === pk.player_id))
          .filter(Boolean) as Player[]
        setDrafted(mapped)
      })
      .catch(console.error)
  }, [draftId, players])

  // Socket.IO live sync
  useEffect(() => {
    const newSocket = io(API_BASE_URL)
    setSocket(newSocket)

    newSocket.emit("join_draft", { draft_id: draftId })

    // On reconnect, rejoin room and re-fetch state
    newSocket.on("connect", () => {
      newSocket.emit("join_draft", { draft_id: draftId })
      getPicks(draftId)
        .then((serverPicks) => {
          const mapped = serverPicks
            .map((pk) => players.find((pl) => pl.id === pk.player_id))
            .filter(Boolean) as Player[]
          setDrafted(mapped)
        })
        .catch(console.error)
    })

    newSocket.on("player_drafted", (player: Player) => {
      setDrafted((prev) => {
        // Only add if not already present
        if (!prev.find((p) => p.id === player.id)) {
          return [...prev, player]
        }
        return prev
      })
    })

    newSocket.on("player_removed", (playerId: string) => {
      setDrafted((prev) => prev.filter((p) => p.id !== playerId))
    })

    return () => {
      newSocket.off("connect")
      newSocket.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId])

  useEffect(() => {
    fetcher(`${API_BASE_URL}/players?season=${CURRENT_YEAR}&on_team_only=true&scoring=${leagueSettings.scoringFormat}`)
      .then((data: Record<string, unknown>[]) => {
        const normalized = (data || []).map((raw: Record<string, unknown>) => {
          const stats = normalizeStats(raw)
          // Only keep defined values so we don't overwrite existing fields with `undefined`
          const cleaned = Object.fromEntries(
            Object.entries(stats).filter(([, v]) => v !== undefined)
          )
          return { ...raw, ...cleaned } as unknown as Player
        })

        const withAdp = normalized.map((p) => {
          const key = makeKey(p.name, p.position)
          const adp = adpByKey[key]
          return typeof adp === "number" ? { ...p, adp } : p
        })
        setPlayers(withAdp)
      })
      .catch(console.error)
  }, [CURRENT_YEAR, adpByKey, makeKey, leagueSettings.scoringFormat])

  useEffect(() => {
    if (!players.length || !Object.keys(adpByKey).length) return
    setPlayers((prev) => prev.map((p) => {
      const key = makeKey(p.name, p.position)
      const adp = adpByKey[key]
      return typeof adp === "number" ? { ...p, adp } : p
    }))
  }, [adpByKey, makeKey, players.length])

  useEffect(() => {
    // Fetch ADP for the current draft season (e.g., 2025)
    getAdp(CURRENT_YEAR)
      .then((rows: AdpEntry[]) => {
        const map: Record<string, number> = {}
        for (const r of rows || []) {
          if (!r?.name || !r?.position) continue
          const key = makeKey(r.name, r.position)
          if (typeof r.adp === "number") map[key] = r.adp
        }
        setAdpByKey(map)
      })
      .catch(console.warn)
  }, [CURRENT_YEAR, makeKey])

  // Fetch picks from backend scraper for Sleeper, ESPN, NFL
  useEffect(() => {
    if (!isOnlineMode || !selectedPlatform) return
    fetch(`${API_BASE_URL}/scrape/${selectedPlatform}`)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return
        const draftedIds = data.map((p: any) => String(p.player_id || p.id))
        setDraftedFromPlatform(draftedIds)
      })
      .catch((err) => console.error(`Failed to fetch picks from ${selectedPlatform}:`, err))
  }, [selectedPlatform, isOnlineMode])

  // Poll platform picks every 5 seconds
  useEffect(() => {
    if (!isOnlineMode || !selectedPlatform) return
    const interval = setInterval(() => {
      fetch(`${API_BASE_URL}/scrape/${selectedPlatform}`)
        .then((res) => res.json())
        .then((data) => {
          if (!Array.isArray(data)) return
          const draftedIds = data.map((p: any) => String(p.player_id || p.id))
          setDraftedFromPlatform(draftedIds)
        })
        .catch((err) => console.error(`Polling ${selectedPlatform} failed:`, err))
    }, 5000)
    return () => clearInterval(interval)
  }, [selectedPlatform, isOnlineMode])

  const draftPlayer = async (player: Player) => {
    setDrafted((prev) => {
      const updated = [...prev, player]
      savePicks(draftId, toPickArray(updated, PICKS_PER_ROUND)).catch(console.error)
      return updated
    })
    if (socket) {
      socket.emit("draft_pick", { draft_id: draftId, player })
    }
  }

  const removePlayer = async (playerId: string) => {
    setDrafted((prev) => {
      const updated = prev.filter((p) => p.id !== playerId)
      savePicks(draftId, toPickArray(updated, PICKS_PER_ROUND)).catch(console.error)
      return updated
    })
    if (socket) {
      socket.emit("remove_pick", { draft_id: draftId, player_id: playerId })
    }
  }

  const saveCurrentTeam = async () => {
    const name = prompt("Enter a name for your team:")
    if (!name) return
    
    try {
      // Create the team with the current drafted picks
      const createRes = await fetch(`${API_BASE_URL}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          picks: toPickArray(drafted, PICKS_PER_ROUND)
        }),
      })
      
      if (!createRes.ok) {
        throw new Error(`Failed to create team (${createRes.status})`)
      }
      
      const createdTeam = await createRes.json()
      
      // Set the new team as active
      await fetch(`${API_BASE_URL}/teams/active?team_id=${createdTeam.id}`, {
        method: "POST",
      })
      
      alert(`Team "${name}" saved successfully!`)
      fetchSavedTeams()
    } catch (error) {
      console.error("Failed to save team:", error)
      alert("Failed to save team.")
    }
  }

  const fetchSavedTeams = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/teams`)
      const data = await res.json()
      setSavedTeams(Array.isArray(data) ? data : [])
    } catch {
      // ignore
    }
  }

  const loadTeam = async (team: { id: string; name: string; picks?: any[] }) => {
    if (!team.picks || team.picks.length === 0) {
      alert("This team has no saved picks.")
      return
    }
    const playerIds = team.picks.map((p: any) => String(p.player_id))
    const matched = players.filter(p => playerIds.includes(String(p.id)))
    setDrafted(matched)
    await savePicks(draftId, toPickArray(matched, PICKS_PER_ROUND)).catch(console.error)
    setShowSavedTeams(false)
  }

  const deleteTeam = async (teamId: string) => {
    if (!confirm("Are you sure you want to delete this team?")) return
    try {
      const res = await fetch(`${API_BASE_URL}/teams/${teamId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setSavedTeams(prev => prev.filter(t => t.id !== teamId))
    } catch {
      alert("Failed to delete team.")
    }
  }

  // Fetch saved teams on mount
  useEffect(() => {
    fetchSavedTeams()
  }, [])

  const processedPlayers = useMemo(() => {
    if (!players.length) return []

    // Normalize ADP (lower is better) and fantasy points (higher is better)
    const adps = players
      .map(p => (typeof p.adp === "number" ? p.adp : Number.POSITIVE_INFINITY))
      .filter(n => Number.isFinite(n))
    const points = players.map(p => (typeof p.fantasyPoints === "number" ? p.fantasyPoints : 0))

    const minADP = adps.length ? Math.min(...adps) : 1
    const maxADP = adps.length ? Math.max(...adps) : 1
    const minPts = points.length ? Math.min(...points) : 0
    const maxPts = points.length ? Math.max(...points) : 1

    const scored = players.map(p => {
      const normADP =
        typeof p.adp === "number" && Number.isFinite(p.adp)
          ? (maxADP - p.adp) / Math.max(maxADP - minADP, 1)
          : 0
      const normPts =
        typeof p.fantasyPoints === "number"
          ? (p.fantasyPoints - minPts) / Math.max(maxPts - minPts, 1)
          : 0
      const score = 0.65 * normADP + 0.35 * normPts
      return { ...p, score }
    })

    scored.sort((a, b) => (b.score! - a.score!))

    const withOverall = scored.map((p, i) => {
      const rank = i + 1
      return { ...p, rank }
    })

    // Compute *position-specific* rank based on last year's fantasy points (higher is better)
    const buckets: Record<string, { idx: number; pts: number }[]> = {}
    withOverall.forEach((p, idx) => {
      const pos = (p.position || "").toUpperCase()
      const pts = typeof p.fantasyPoints === "number" ? p.fantasyPoints : -Infinity
      ;(buckets[pos] ||= []).push({ idx, pts })
    })
    Object.values(buckets).forEach(list => {
      list.sort((a, b) => b.pts - a.pts)
      list.forEach((item, i) => { withOverall[item.idx].posRank = i + 1 })
    })

    return withOverall
  }, [players])

  const progressWidthClass = getProgressWidthClass(progress)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold">draftboard</h1>
        <p className="text-sm text-slate-400">
          showing {DISPLAY_YEAR} stats + adp
          {selectedWeek > 0 && ` • week ${selectedWeek} focus`}
          {isOnlineMode ? " • live draft mode" : " • offline mode"}
        </p>
      </div>

      {/* League Connection */}
      <PlatformConnect />

      {/* Controls Bar */}
      <div className="bg-slate-800 p-4 rounded-lg mb-4">
        <div className={`grid grid-cols-2 gap-4 mb-3 ${isOnlineMode ? "md:grid-cols-5" : "md:grid-cols-4"}`}>
          {/* Draft Mode */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">draft mode</label>
            <div className="flex gap-1">
              <button
                className={`flex-1 px-3 py-2 text-sm rounded ${
                  !isOnlineMode
                    ? "bg-indigo-700 text-slate-200"
                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                }`}
                onClick={() => setIsOnlineMode(false)}
                title="Focus on building your personal team"
              >
                offline
              </button>
              <button
                className={`flex-1 px-3 py-2 text-sm rounded ${
                  isOnlineMode
                    ? "bg-cyan-700 text-slate-200"
                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                }`}
                onClick={() => setIsOnlineMode(true)}
                title="Connect to live draft"
              >
                online
              </button>
            </div>
          </div>

          {/* Week Focus */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">week focus</label>
            <select
              className="w-full text-slate-300 text-sm p-2 rounded bg-slate-700"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              title="Focus on players for specific week"
            >
              <option value={0}>all season</option>
              {Array.from({ length: 18 }, (_, i) => i + 1).map(week => (
                <option key={week} value={week}>week {week}</option>
              ))}
            </select>
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">position</label>
            <select
              className="w-full text-slate-300 text-sm p-2 rounded bg-slate-700"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              title="Filter players by position"
            >
              <option value="ALL">all positions</option>
              <option value="QB">QB</option>
              <option value="RB">RB</option>
              <option value="WR">WR</option>
              <option value="TE">TE</option>
              <option value="K">K</option>
              <option value="DEF">DEF</option>
            </select>
          </div>

          {/* Favorites */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">the homies</label>
            <select
              title="Filter by favorites"
              className="w-full text-slate-300 text-sm p-2 rounded bg-slate-700"
              value={showFavoritesOnly ? "favorites" : "all"}
              onChange={(e) => setShowFavoritesOnly(e.target.value === "favorites")}
            >
              <option value="all">all players</option>
              <option value="favorites">only favorites</option>
            </select>
          </div>

          {/* Platform (online mode only) */}
          {isOnlineMode && (
            <div>
              <label className="block text-sm text-slate-400 mb-1">platform</label>
              <select
                className="w-full text-slate-300 text-sm p-2 rounded bg-slate-700"
                title="Select fantasy platform to sync with"
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
              >
                <option value="" disabled>select platform</option>
                <option value="sleeper">Sleeper</option>
                <option value="espn">ESPN</option>
                <option value="nfl">NFL.com</option>
              </select>
            </div>
          )}
        </div>

        {/* Actions + Search */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={async () => { setDrafted([]); await clearPicks(draftId).catch(console.error) }}
            className="bg-slate-700 hover:bg-indigo-800 text-slate-300 text-sm font-semibold px-4 py-2 rounded transition-colors"
          >
            clear all picks
          </button>
          <button
            className="bg-slate-700 hover:bg-indigo-800 text-slate-300 text-sm font-semibold px-4 py-2 rounded transition-colors"
            onClick={saveCurrentTeam}
            title="Save current drafted players as a named team"
          >
            save as team
          </button>
          <div className="relative">
            <button
              className="bg-slate-700 hover:bg-indigo-800 text-slate-300 text-sm font-semibold px-4 py-2 rounded transition-colors"
              onClick={() => { setShowSavedTeams(!showSavedTeams); if (!showSavedTeams) fetchSavedTeams() }}
              title="Load or manage saved teams"
            >
              saved teams {savedTeams.length > 0 && `(${savedTeams.length})`}
            </button>
            {showSavedTeams && (
              <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 w-72 max-h-64 overflow-y-auto">
                {savedTeams.length === 0 ? (
                  <div className="p-3 text-sm text-slate-400">No saved teams yet</div>
                ) : (
                  savedTeams.map(team => (
                    <div key={team.id} className="flex items-center justify-between px-3 py-2 border-b border-slate-700 last:border-0 hover:bg-slate-700/50">
                      <button
                        className="text-sm text-left flex-1 hover:text-indigo-400 transition-colors"
                        onClick={() => loadTeam(team)}
                        title={`Load ${team.name}`}
                      >
                        {team.name}
                        <span className="text-xs text-slate-500 ml-2">{team.picks?.length || 0} picks</span>
                      </button>
                      <button
                        onClick={() => deleteTeam(team.id)}
                        className="text-slate-500 hover:text-red-400 ml-2 text-sm transition-colors"
                        title={`Delete ${team.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <input
            type="text"
            placeholder="search players..."
            className="w-full md:w-72 md:ml-auto text-slate-300 text-sm p-2 rounded bg-slate-700 placeholder-slate-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            title="Search for players by name"
          />
        </div>
      </div>

      {/* Draft Progress + Roster */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* Draft Progress */}
        <div className="bg-slate-800 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">draft progress</h3>
          <p className="text-sm text-slate-400 mb-2">
            round {currentRound} • pick {currentPick} of {PICKS_PER_ROUND}
          </p>
          <div className="w-full h-3 bg-slate-700 rounded overflow-hidden mb-2">
            <div
              className={`h-full bg-linear-45 bg-linear-to-r/oklch from-cyan-400 via-sky-400 to-indigo-400 transition-all duration-300 ${progressWidthClass}`}
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Draft progress: ${drafted.length} of ${TOTAL_PICKS} picks completed`}
              title={`Draft progress: ${progress.toFixed(1)}% complete`}
            />
          </div>
          <p className="text-xs text-slate-400">
            {drafted.length} of {TOTAL_PICKS} picks completed ({progress.toFixed(1)}%)
          </p>
        </div>

        {/* My Roster */}
        <div className="bg-slate-800 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">my roster ({drafted.length} players)</h3>
          {drafted.length === 0 ? (
            <p className="text-sm text-slate-500">click players below to draft them to your roster.</p>
          ) : (
            <div>
              <div className="mb-2">
                <span className="text-xs text-slate-400 block mb-1">starters</span>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
                  {starterSlots.map((slot, index) => {
                    const player = startersWithSlots[index]
                    return (
                      <span
                        key={index}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          player
                            ? "bg-slate-700 text-slate-300 cursor-pointer hover:bg-red-900/40"
                            : "bg-slate-800 text-slate-500"
                        }`}
                        onClick={() => player && removePlayer(player.id)}
                      >
                        <span className="font-bold text-slate-400">{slotLabel(slot)}</span>
                        {player ? player.name : "empty"}
                        {player && <span className="text-slate-500 hover:text-red-400">×</span>}
                      </span>
                    )
                  })}
                </div>
              </div>
              {bench.length > 0 && (
                <div>
                  <span className="text-xs text-slate-400 block mb-1">bench</span>
                  <div className="flex flex-wrap gap-1.5">
                    {bench.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-700 text-slate-300 cursor-pointer hover:bg-red-900/40"
                        onClick={() => removePlayer(p.id)}
                      >
                        {p.name}
                        <span className="text-slate-500 hover:text-red-400">×</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Player Table */}
      <div className="bg-slate-900 rounded-lg p-4">
        <div className="overflow-y-auto overflow-x-auto max-h-[60vh]">
            <table className="min-w-[900px] w-full text-sm text-left leading-tight font-aptos">
              <thead className="sticky top-0 bg-slate-800 z-10">
                {/* Row 1: frozen labels + grouped category headers */}
                <tr className="text-slate-400 border-b border-slate-900 whitespace-nowrap">
                  <th rowSpan={2} className={`${CELL}`}>name</th>
                  <th rowSpan={2} className={`${CELL} cursor-pointer`} onClick={() => handleSort('team')}>
                    team {sortField === 'team' ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th rowSpan={2} className={`${CELL} cursor-pointer`} onClick={() => handleSort('position')}>
                    pos {sortField === 'position' ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th rowSpan={2} className={`${CELL}`}>bye</th>
                  <th rowSpan={2} className={`${CELL_NUM} cursor-pointer`} onClick={() => handleSort('posRank')}>
                    rank {sortField === 'posRank' ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th rowSpan={2} className={`${CELL_NUM} cursor-pointer`} onClick={() => handleSort('adp')}>
                    adp {sortField === 'adp' ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  {/* Grouped headers */}
                  <th colSpan={1} className={`${CELL_NUM} tracking-wide text-center border-l border-slate-600/50`}>fantasy</th>
                  <th colSpan={3} className={`${CELL_NUM} tracking-wide text-center border-l border-slate-600/50`}>rushing</th>
                  <th colSpan={4} className={`${CELL_NUM} tracking-wide text-center border-l border-slate-600/50`}>receiving</th>
                  <th colSpan={4} className={`${CELL_NUM} tracking-wide text-center border-l border-slate-600/50`}>passing</th>
                </tr>
                {/* Row 2: sortable sub-headers */}
                <tr className="text-slate-400 border-b border-slate-700 whitespace-nowrap">
                  <th
                    className={`${CELL_NUM} cursor-pointer font-normal border-l border-slate-600/50`}
                    onClick={() => handleSort("fantasyPoints")}
                  >
                    pts {sortField === "fantasyPoints" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  {/* Rushing */}
                  <th
                    className={`${CELL_NUM} cursor-pointer font-normal border-l border-slate-600/50`}
                    onClick={() => handleSort("rushAtt")}
                  >
                    att {sortField === "rushAtt" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className={`${CELL_NUM} cursor-pointer font-normal`}
                    onClick={() => handleSort("rushYds")}
                  >
                    yds {sortField === "rushYds" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className={`${CELL_NUM} cursor-pointer font-normal`}
                    onClick={() => handleSort("rushTD")}
                  >
                    td {sortField === "rushTD" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  {/* Receiving */}
                  <th
                    className={`${CELL_NUM} cursor-pointer font-normal border-l border-slate-600/50`}
                    onClick={() => handleSort("targets")}
                  >
                    tgt {sortField === "targets" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className={`${CELL_NUM} cursor-pointer font-normal`}
                    onClick={() => handleSort("receptions")}
                  >
                    rec {sortField === "receptions" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className={`${CELL_NUM} cursor-pointer font-normal`}
                    onClick={() => handleSort("recYds")}
                  >
                    yds {sortField === "recYds" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className={`${CELL_NUM} cursor-pointer font-normal`}
                    onClick={() => handleSort("recTD")}
                  >
                    td {sortField === "recTD" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  {/* Passing */}
                  <th
                    className={`${CELL_NUM} cursor-pointer font-normal border-l border-slate-600/50`}
                    onClick={() => handleSort("passAtt")}
                  >
                    att {sortField === "passAtt" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className={`${CELL_NUM} cursor-pointer font-normal`}
                    onClick={() => handleSort("passCmp")}
                  >
                    cmp {sortField === "passCmp" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className={`${CELL_NUM} cursor-pointer font-normal`}
                    onClick={() => handleSort("passYds")}
                  >
                    yds {sortField === "passYds" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className={`${CELL_NUM} cursor-pointer font-normal`}
                    onClick={() => handleSort("passTD")}
                  >
                    td {sortField === "passTD" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-400">
                {[...processedPlayers]
                  .filter((player) => {
                    if (position !== "ALL" && player.position !== position) return false
                    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase())
                    const onTeam = isOnTeam(player) && !nameBlacklist.test(player.name)

                    // Bye week filtering
                    if (!showByeWeeks && selectedWeek > 0) {
                      const { isBye } = getByeWeekInfo(player.team, selectedWeek)
                      if (isBye) return false
                    }

                    if (showFavoritesOnly && !favoriteIds.includes(player.id)) return false

                    return matchesSearch && onTeam
                  })
                  .sort((a, b) => {
                    if (!sortField) return 0

                    const va = a[sortField]
                    const vb = b[sortField]

                    // Fields that should be compared numerically
                    const numericFields: (keyof Player)[] = [
                      "adp",
                      "fantasyPoints",
                      "rushAtt",
                      "rushYds",
                      "rushTD",
                      "targets",
                      "receptions",
                      "recYds",
                      "recTD",
                      "passAtt",
                      "passCmp",
                      "passYds",
                      "passTD",
                      "rank",
                      "posRank",
                    ]

                    if (numericFields.includes(sortField)) {
                      const aNum =
                        typeof va === "number"
                          ? va
                          : sortOrder === "asc"
                          ? Number.POSITIVE_INFINITY
                          : Number.NEGATIVE_INFINITY

                      const bNum =
                        typeof vb === "number"
                          ? vb
                          : sortOrder === "asc"
                          ? Number.POSITIVE_INFINITY
                          : Number.NEGATIVE_INFINITY

                      const primary = sortOrder === "asc" ? aNum - bNum : bNum - aNum
                      if (primary !== 0) return primary

                      // Stable tie break to avoid jitter
                      return a.name.localeCompare(b.name)
                    }

                    // String-ish fields
                    const aStr = String(va ?? "")
                    const bStr = String(vb ?? "")
                    return sortOrder === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
                  })
                  .map((player, index) => {
                    const isDrafted = drafted.find((p) => p.id === player.id) ||
                      (isOnlineMode && draftedFromPlatform.includes(player.id))
                    const isSlotAvailable = true
                    const { isBye, byeWeek } = getByeWeekInfo(player.team, selectedWeek)

                    return (
                      <tr
                        key={player.id}
                        className={`border-b border-slate-700/50 cursor-pointer ${
                          isDrafted
                            ? "bg-slate-900 text-slate-500 cursor-not-allowed"
                            : !isSlotAvailable
                            ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                            : isBye && selectedWeek > 0
                            ? "bg-red-900/20 text-red-300 hover:bg-red-800/30"
                            : index % 2 === 0
                            ? "bg-slate-800/30 hover:bg-slate-700"
                            : "hover:bg-slate-700"
                        }`}
                        onClick={() => {
                          if (isDrafted) {
                            removePlayer(player.id)
                          } else if (isSlotAvailable) {
                            draftPlayer(player)
                          }
                        }}
                      >
                        <td className={`${CELL} flex items-center gap-0.5 min-w-0`}>
                          <span
                            className="truncate font-medium hover:text-indigo-400 hover:underline cursor-pointer"
                            title={player.name}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedPlayer(player)
                            }}
                          >{player.name}</span>
                          {isConnected && ownerByPlayerId.has(String(player.id)) && (
                            <span
                              className={`ml-1 shrink-0 text-[10px] px-1 rounded ${
                                myPlayerIds.includes(String(player.id))
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-slate-600/40 text-slate-500"
                              }`}
                              title={ownerByPlayerId.get(String(player.id))}
                            >
                              {myPlayerIds.includes(String(player.id))
                                ? "mine"
                                : ownerByPlayerId.get(String(player.id))?.split(" ")[0]?.slice(0, 6) || "taken"}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setFavoriteIds((prev) =>
                                prev.includes(player.id)
                                  ? prev.filter((id) => id !== player.id)
                                  : [...prev, player.id]
                              )
                            }}
                            className="ml-1 text-cyan-400"
                            title="toggle favorite"
                          >
                            {favoriteIds.includes(player.id) ? "★" : "☆"}
                          </button>
                        </td>
                        <td className={CELL}>{player.team}</td>
                        <td className={CELL}>
                          <span className={({'QB':'text-red-400','RB':'text-green-400','WR':'text-blue-400','TE':'text-yellow-400','K':'text-purple-400'} as Record<string,string>)[player.position] ?? 'text-slate-400'}>
                            {player.position}
                          </span>
                        </td>
                        <td className={`${CELL} ${isBye && selectedWeek > 0 ? "text-red-400 font-semibold" : ""}`}>
                          {byeWeek || "-"}
                          {isBye && selectedWeek > 0 && (
                            <span className="ml-1 text-red-400">🚫</span>
                          )}
                        </td>
                        <td className={CELL_NUM}>{typeof player.posRank === "number" ? player.posRank : "-"}</td>
                        <td className={CELL_NUM}>
                          {typeof player.adp === "number" && Number.isFinite(player.adp) ? player.adp.toFixed(1) : "-"}
                        </td>
                        <td className={`${CELL_NUM} border-l border-slate-600/50`}>
                          {typeof player.fantasyPoints === "number" ? player.fantasyPoints.toFixed(1) : "-"}
                        </td>
                        {/* Rushing */}
                        <td className={`${CELL_NUM} border-l border-slate-600/50`}>
                          {typeof player.rushAtt === "number" ? player.rushAtt : "-"}
                        </td>
                        <td className={CELL_NUM}>
                          {typeof player.rushYds === "number" ? player.rushYds : "-"}
                        </td>
                        <td className={CELL_NUM}>
                          {typeof player.rushTD === "number" ? player.rushTD : "-"}
                        </td>
                        {/* Receiving */}
                        <td className={`${CELL_NUM} border-l border-slate-600/50`}>
                          {typeof player.targets === "number" ? player.targets : "-"}
                        </td>
                        <td className={CELL_NUM}>
                          {typeof player.receptions === "number" ? player.receptions : "-"}
                        </td>
                        <td className={CELL_NUM}>
                          {typeof player.recYds === "number" ? player.recYds : "-"}
                        </td>
                        <td className={CELL_NUM}>
                          {typeof player.recTD === "number" ? player.recTD : "-"}
                        </td>
                        {/* Passing */}
                        <td className={`${CELL_NUM} border-l border-slate-600/50`}>
                          {typeof player.passAtt === "number" ? player.passAtt : "-"}
                        </td>
                        <td className={CELL_NUM}>
                          {typeof player.passCmp === "number" ? player.passCmp : "-"}
                        </td>
                        <td className={CELL_NUM}>
                          {typeof player.passYds === "number" ? player.passYds : "-"}
                        </td>
                        <td className={CELL_NUM}>
                          {typeof player.passTD === "number" ? player.passTD : "-"}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>

      <PlayerDetailModal
        player={selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        onDraft={draftPlayer}
        isDrafted={drafted.some(p => p.id === selectedPlayer?.id)}
      />
      </div>
  )
}
