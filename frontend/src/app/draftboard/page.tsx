'use client'

import { useEffect, useState, useMemo } from "react"
import styles from "./page_clean.module.css"
import { API_BASE_URL } from "@/constants"
import { fetcher } from "@/lib/api"
import { getAdp, type AdpEntry } from "@/lib/api"
import { getPicks, savePicks, clearPicks, type Pick } from "@/lib/api"
import type { Player as BasePlayer } from "@/types"
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
  tier?: string
  tierClass?: string
  score?: number
}

// Table cell helpers for consistent spacing and alignment
const CELL = "px-1.5 py-0.5 whitespace-nowrap";
const CELL_NUM = `${CELL} text-right tabular-nums font-mono`;

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
function getPath(obj: any, path: string) {
  if (!obj || !path) return undefined
  return path.split(".").reduce((acc: any, k: string) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj)
}

function toNum(v: any) {
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
function normalizeStats(raw: any): Partial<Player> {
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

export default function DraftPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [position, setPosition] = useState("ALL")
  const [searchTerm, setSearchTerm] = useState("")
  const [drafted, setDrafted] = useState<Player[]>([])
  const [sortField, setSortField] = useState<keyof Player | null>("adp")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [socket, setSocket] = useState<any>(null)
  const [isOnlineMode, setIsOnlineMode] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [showByeWeeks, setShowByeWeeks] = useState(true)
  const draftId = "global-draft" // Single global draft board

  const CURRENT_YEAR = new Date().getFullYear() // for current draft season (2025)
  const STATS_YEAR = CURRENT_YEAR - 1 // for last year's stats (2024)
  const DISPLAY_YEAR = STATS_YEAR + 1 // show in UI subtitle (2025)

  const [adpByKey, setAdpByKey] = useState<Record<string, number>>({})
  const makeKey = (name: string, pos: string) => `${name}`.trim().toUpperCase() + "|" + `${pos}`.trim().toUpperCase()

  // Only show players who are currently on an NFL team (hide FAs/invalid placeholders)
  const isOnTeam = (p: Player) => {
    const t = (p.team || "").trim().toUpperCase()
    if (!t) return false
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

  const PICKS_PER_ROUND = 10
  const TOTAL_ROUNDS = 15
  const TOTAL_PICKS = PICKS_PER_ROUND * TOTAL_ROUNDS
  const progress = Math.min((drafted.length / TOTAL_PICKS) * 100, 100)
  const currentRound = Math.floor(drafted.length / PICKS_PER_ROUND) + 1
  const currentPick = (drafted.length % PICKS_PER_ROUND) + 1

  const starterSlots = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF"]

  const ROSTER_LIMITS: Record<string, number> = {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 1,
    K: 1,
    DEF: 1
  }

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

  // Fix: Don't filter starters by position - show all drafted players
  const startersWithSlots: (Player | null)[] = []
  const usedPlayerIds = new Set<string>()

  starterSlots.forEach((slot) => {
    let player: Player | null = null
    if (slot === "FLEX") {
      player =
        drafted.find(
          (p) =>
            !usedPlayerIds.has(p.id) &&
            ["RB", "WR", "TE"].includes(p.position)
        ) || null
    } else {
      player =
        drafted.find(
          (p) => !usedPlayerIds.has(p.id) && p.position === slot
        ) || null
    }
    if (player) {
      usedPlayerIds.add(player.id)
    }
    startersWithSlots.push(player)
  })

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
    fetcher(`${API_BASE_URL}/players?position=${position}&season=${CURRENT_YEAR}&on_team_only=true`)
      .then((data: Player[]) => {
        const normalized = (data || []).map((raw: any) => {
          const stats = normalizeStats(raw)
          // Only keep defined values so we don't overwrite existing fields with `undefined`
          const cleaned = Object.fromEntries(
            Object.entries(stats).filter(([, v]) => v !== undefined)
          )
          return { ...raw, ...cleaned }
        })
        
        const withAdp = normalized.map((p) => {
          const key = makeKey(p.name, p.position)
          const adp = adpByKey[key]
          return typeof adp === "number" ? { ...p, adp } : p
        })
        setPlayers(withAdp)
      })
      .catch(console.error)
  }, [position, CURRENT_YEAR, adpByKey])

  useEffect(() => {
    if (!players.length || !Object.keys(adpByKey).length) return
    setPlayers((prev) => prev.map((p) => {
      const key = makeKey(p.name, p.position)
      const adp = adpByKey[key]
      return typeof adp === "number" ? { ...p, adp } : p
    }))
  }, [adpByKey])

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
  }, [CURRENT_YEAR])

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
    } catch (error) {
      console.error("Failed to save team:", error)
      alert("Failed to save team.")
    }
  }

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

    const n = scored.length
    const withOverall = scored.map((p, i) => {
      const rank = i + 1
      let tier = "😴"
      let tierClass = "bg-zinc-600 text-white"

      if (rank <= Math.ceil(n * 0.08)) {
        tier = "T1"; tierClass = "bg-purple-600 text-white"
      } else if (rank <= Math.ceil(n * 0.24)) {
        tier = "T2"; tierClass = "bg-blue-600 text-white"
      } else if (rank <= Math.ceil(n * 0.48)) {
        tier = "T3"; tierClass = "bg-green-600 text-white"
      } else if (rank <= Math.ceil(n * 0.72)) {
        tier = "T4"; tierClass = "bg-yellow-600 text-white"
      }

      return { ...p, rank, tier, tierClass }
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

  return (
    <div className="h-screen overflow-hidden flex flex-col p-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">Draftboard</h1>
        <p className="text-sm text-zinc-400">
          Showing {DISPLAY_YEAR} stats + ADP
          {selectedWeek > 0 && ` • Week ${selectedWeek} Focus`}
          {isOnlineMode ? " • Live Draft Mode" : " • Offline Mode"}
        </p>
        <p className="text-xs text-zinc-500">
          ADP loaded: {Object.keys(adpByKey).length}
          {selectedWeek > 0 && !showByeWeeks && " • Bye week players hidden"}
        </p>
      </div>

      <div className="flex-1 min-h-0 flex gap-6 items-stretch">
        {/* Filters and Controls */}
        <div className="w-[160px] shrink-0 bg-zinc-800 p-4 rounded-lg h-full overflow-auto">
          <h2 className="text-lg font-semibold mb-2">Filters</h2>
          
          {/* Mode Toggle */}
          <div className="mb-4">
            <label className="text-sm text-zinc-400 mb-2 block">Draft Mode</label>
            <div className="flex gap-1">
              <button
                className={`px-2 py-1 text-xs rounded ${
                  !isOnlineMode 
                    ? "bg-blue-600 text-white" 
                    : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                }`}
                onClick={() => setIsOnlineMode(false)}
                title="Focus on building your personal team"
              >
                Offline
              </button>
              <button
                className={`px-2 py-1 text-xs rounded ${
                  isOnlineMode 
                    ? "bg-green-600 text-white" 
                    : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                }`}
                onClick={() => setIsOnlineMode(true)}
                title="Connect to live draft"
              >
                Online
              </button>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {isOnlineMode 
                ? "Track live draft picks" 
                : "Personal draft simulation"
              }
            </p>
          </div>

          {/* Week Selector */}
          <div className="mb-4">
            <label className="text-sm text-zinc-400 mb-2 block">Week Focus</label>
            <select
              className="w-full bg-zinc-700 text-white p-1 rounded text-sm"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              title="Focus on players for specific week"
            >
              <option value={0}>All Season</option>
              {Array.from({ length: 18 }, (_, i) => i + 1).map(week => (
                <option key={week} value={week}>Week {week}</option>
              ))}
            </select>
          </div>

          {/* Bye Week Toggle */}
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input
                type="checkbox"
                checked={showByeWeeks}
                onChange={(e) => setShowByeWeeks(e.target.checked)}
                className="rounded"
              />
              Show Bye Weeks
            </label>
          </div>

          <select
            className="w-full bg-zinc-700 text-white p-2 rounded"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            title="Filter players by position"
          >
            <option value="ALL">All Positions</option>
            <option value="QB">QB</option>
            <option value="RB">RB</option>
            <option value="WR">WR</option>
            <option value="TE">TE</option>
            <option value="K">K</option>
            <option value="DEF">DEF</option>
          </select>

          <div className="mt-6">
            <button
              className="mb-2 px-3 py-1 bg-purple-800 hover:bg-purple-900 text-white text-sm rounded w-full"
              onClick={async () => { setDrafted([]); await clearPicks(draftId).catch(console.error) }}
              title="Remove all drafted players from your team"
            >
              Clear All Picks
            </button>
            <button
              className="mb-2 px-3 py-1 bg-blue-800 hover:bg-blue-900 text-white text-sm rounded w-full"
              onClick={saveCurrentTeam}
              title="Save current drafted players as a named team"
            >
              Save as Team
            </button>
            <p className="text-sm text-zinc-400 mb-1">
              Round {currentRound} • Pick {currentPick} of {PICKS_PER_ROUND}
            </p>
            <div className={styles.progressBarContainer}>
              <div
                className={styles.progressBarFill}
                data-progress={progress}
                title={`Draft progress: ${progress.toFixed(1)}% complete`}
                role="progressbar"
                aria-label={`Draft progress: ${drafted.length} of ${TOTAL_PICKS} picks completed`}
              />
            </div>
            <p className="text-xs text-zinc-400 mb-2">
              {drafted.length} of {TOTAL_PICKS} picks completed ({progress.toFixed(1)}%)
            </p>
            <h2 className="text-lg font-semibold mb-2">Starters</h2>
            <ul className="text-sm space-y-1 mb-4">
              {starterSlots.map((slot, index) => {
                const player = startersWithSlots[index]
                return (
                  <li
                    key={index}
                    className="cursor-pointer hover:text-purple-400"
                    onClick={() => player && removePlayer(player.id)}
                  >
                    {slot}: {player ? player.name : "Empty"}
                  </li>
                )
              })}
            </ul>
            <h2 className="text-lg font-semibold mb-2">Bench</h2>
            <ul className="text-sm space-y-1">
              {bench.map((p) => (
                <li
                  key={p.id}
                  className="cursor-pointer hover:text-purple-400"
                  onClick={() => removePlayer(p.id)}
                >
                  {p.name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Player Table */}
        <div className="flex-1 min-w-0 bg-zinc-800 p-4 rounded-lg flex flex-col min-h-0">
          <h2 className="text-lg font-semibold mb-2">Players</h2>
          <input
            type="text"
            placeholder="Search players..."
            className="mb-3 w-full bg-zinc-700 text-white p-2 rounded"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            title="Search for players by name"
          />
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <table className="w-full table-fixed text-[12px] text-left">
              <colgroup>
                {[
                  "w-[16%]", // Name (slightly narrower)
                  "w-[4%]",  // Team
                  "w-[3%]",  // Pos
                  "w-[3%]",  // Bye
                  "w-[4%]",  // Rank
                  "w-[4%]",  // ADP
                  "w-[5.5%]",  // Fantasy Pts
                  "w-[3.5%]",  // Rush Att
                  "w-[4.5%]",  // Rush Yds
                  "w-[3.5%]",  // Rush TD
                  "w-[3.5%]",  // Targets
                  "w-[3.5%]",  // Rec
                  "w-[4.5%]",  // Rec Yds
                  "w-[3.5%]",  // Rec TD
                  "w-[4%]",  // Pass Att
                  "w-[4%]",  // Pass Cmp
                  "w-[5%]",  // Pass Yds
                  "w-[4%]",  // Pass TD
                ].map((cls, i) => (
                  <col key={i} className={cls} />
                ))}
              </colgroup>
              <thead className="sticky top-0 bg-zinc-800 z-10">
                {/* Row 1: frozen labels + grouped category headers */}
                <tr className="text-zinc-400 border-b border-zinc-700 whitespace-nowrap">
                  <th rowSpan={2} className={`${CELL} text-[10px]`}>Name</th>
                  <th rowSpan={2} className={`${CELL} text-[10px] cursor-pointer`} onClick={() => handleSort('team')}>
                    Team {sortField === 'team' ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th rowSpan={2} className={`${CELL} text-[10px] cursor-pointer`} onClick={() => handleSort('position')}>
                    Pos {sortField === 'position' ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th rowSpan={2} className={`${CELL} text-[10px]`}>Bye</th>
                  <th rowSpan={2} className={`${CELL_NUM} text-[10px] cursor-pointer`} onClick={() => handleSort('posRank')}>
                    Rank {sortField === 'posRank' ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th rowSpan={2} className={`${CELL_NUM} text-[10px] cursor-pointer`} onClick={() => handleSort('adp')}>
                    ADP {sortField === 'adp' ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  {/* Grouped headers */}
                  <th colSpan={1} className={`${CELL_NUM} text-[9px] tracking-wide text-center`}>FANTASY</th>
                  <th colSpan={3} className={`${CELL_NUM} text-[9px] tracking-wide text-center`}>RUSHING</th>
                  <th colSpan={4} className={`${CELL_NUM} text-[9px] tracking-wide text-center`}>RECEIVING</th>
                  <th colSpan={4} className={`${CELL_NUM} text-[9px] tracking-wide text-center`}>PASSING</th>
                </tr>
                {/* Row 2: sortable sub-headers */}
                <tr className="text-zinc-400 border-b border-zinc-700 whitespace-nowrap">
                  {([
                    { key: "fantasyPoints", label: "Pts" },
                    // Rushing
                    { key: "rushAtt",      label: "Att" },
                    { key: "rushYds",      label: "Yds" },
                    { key: "rushTD",       label: "TD"  },
                    // Receiving
                    { key: "targets",      label: "Tgt" },
                    { key: "receptions",   label: "Rec" },
                    { key: "recYds",       label: "Yds" },
                    { key: "recTD",        label: "TD"  },
                    // Passing
                    { key: "passAtt",      label: "Att" },
                    { key: "passCmp",      label: "Cmp" },
                    { key: "passYds",      label: "Yds" },
                    { key: "passTD",       label: "TD"  },
                  ] as { key: keyof Player; label: string }[]).map((col) => (
                    <th
                      key={col.key as string}
                      className={`${CELL_NUM} cursor-pointer text-[9px] font-normal`} 
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label} {sortField === col.key ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...processedPlayers]
                  .filter((player) => {
                    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase())
                    const onTeam = isOnTeam(player) && !nameBlacklist.test(player.name)
                    
                    // Bye week filtering
                    if (!showByeWeeks && selectedWeek > 0) {
                      const { isBye } = getByeWeekInfo(player.team, selectedWeek)
                      if (isBye) return false
                    }
                    
                    return matchesSearch && onTeam
                  })
                  .sort((a, b) => {
                    if (!sortField) return 0

                    const va = (a as any)[sortField]
                    const vb = (b as any)[sortField]

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
                  .map((player) => {
                    const isDrafted = drafted.find((p) => p.id === player.id)
                    const isSlotAvailable = hasAvailableStarterSlot(player)
                    const { isBye, byeWeek } = getByeWeekInfo(player.team, selectedWeek)
                    
                    return (
                      <tr
                        key={player.id}
                        className={`border-b border-zinc-700 cursor-pointer ${
                          isDrafted
                            ? "bg-zinc-900 text-zinc-500 cursor-not-allowed"
                            : !isSlotAvailable
                            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                            : isBye && selectedWeek > 0
                            ? "bg-red-900/20 text-red-300 hover:bg-red-800/30"
                            : "hover:bg-zinc-700"
                        }`}
                        onClick={() => {
                          if (isDrafted) {
                            removePlayer(player.id)
                          } else if (isSlotAvailable) {
                            draftPlayer(player)
                          }
                        }}
                      >
                        <td className={`${CELL} flex items-center gap-1 min-w-0`}>
                          <span className="truncate" title={player.name}>{player.name}</span>
                          <span className={`shrink-0 text-[9px] px-1 py-0.5 rounded-full ${player.tierClass ?? "bg-zinc-600 text-white"}`}>
                            {player.tier ?? "😴"}
                          </span>
                        </td>
                        <td className={CELL}>{player.team}</td>
                        <td className={CELL}>{player.position}</td>
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
                        <td className={CELL_NUM}>
                          {typeof player.fantasyPoints === "number" ? player.fantasyPoints.toFixed(1) : "-"}
                        </td>
                        {/* Rushing */}
                        <td className={CELL_NUM}>{player.rushAtt ?? "-"}</td>
                        <td className={CELL_NUM}>{player.rushYds ?? "-"}</td>
                        <td className={CELL_NUM}>{player.rushTD ?? "-"}</td>
                        {/* Receiving */}
                        <td className={CELL_NUM}>{player.targets ?? "-"}</td>
                        <td className={CELL_NUM}>{player.receptions ?? "-"}</td>
                        <td className={CELL_NUM}>{player.recYds ?? "-"}</td>
                        <td className={CELL_NUM}>{player.recTD ?? "-"}</td>
                        {/* Passing */}
                        <td className={CELL_NUM}>{player.passAtt ?? "-"}</td>
                        <td className={CELL_NUM}>{player.passCmp ?? "-"}</td>
                        <td className={CELL_NUM}>{player.passYds ?? "-"}</td>
                        <td className={CELL_NUM}>{player.passTD ?? "-"}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
