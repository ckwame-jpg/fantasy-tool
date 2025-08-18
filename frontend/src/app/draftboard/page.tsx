"use client"

import React, { useState, useEffect, useMemo } from "react";
import { API_BASE_URL } from "@/constants";
import { fetcher, getAdp, savePicks, clearPicks } from "@/lib/api";
import { getByeWeekInfo } from "@/lib/player-utils";

// --- Local types ---
type Player = {
  id: string;
  name: string;
  team?: string;
  position?: string;
  fantasyPoints?: number;
  rushAtt?: number;
  rushYds?: number;
  rushTD?: number;
  receptions?: number;
  targets?: number;
  recYds?: number;
  recTD?: number;
  passAtt?: number;
  passCmp?: number;
  passYds?: number;
  passTD?: number;
  adp?: number;
  rank?: number;
  posRank?: number;
  tier?: string;
  tierClass?: string;
};

type AdpEntry = { name: string; position: string; adp: number };

// --- Small helpers & constants (assumptions noted) ---
// Assumption: default league size (picks per round). Change if your league size differs.
const PICKS_PER_ROUND = 12;
const ROUNDS = 15; // assumption: 15 rounds
const TOTAL_PICKS = PICKS_PER_ROUND * ROUNDS;
const CURRENT_YEAR = new Date().getFullYear();
const DISPLAY_YEAR = CURRENT_YEAR - 1;

const CELL = "px-1.5 py-0.5 whitespace-nowrap";
const CELL_NUM = `${CELL} text-right tabular-nums font-mono`;

const styles = {
  progressBarContainer: "w-full bg-zinc-700 h-2 rounded overflow-hidden mt-2",
  progressBarFill: "h-full bg-purple-600 transition-all",
};

function getPath(obj: any, path: string) {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((acc: any, k: string) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
}

function toNum(v: any) {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t || t === "-" || t.toLowerCase() === "na") return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  }
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function normalizeStats(raw: any): Partial<Player> {
  const pickFlat = (...keys: string[]) => {
    for (const k of keys) {
      if (raw?.[k] !== undefined && raw?.[k] !== null) return raw[k];
    }
    return undefined;
  };
  const pickNested = (...paths: string[]) => {
    for (const p of paths) {
      const v = getPath(raw, p);
      if (v !== undefined && v !== null) return v;
    }
    return undefined;
  };

  return {
    fantasyPoints: toNum(pickFlat("fantasy_points", "fantasyPoints", "fp", "points", "pts") ?? pickNested("fantasy.points")),
    rushAtt: toNum(pickFlat("rush_att", "rushing_att", "rush_attempts", "carries", "att_rush", "attempts_rush") ?? pickNested("rushing.att", "rushing.attempts", "rush.att")),
    rushYds: toNum(pickFlat("rush_yds", "rushing_yds", "rush_yards") ?? pickNested("rushing.yds", "rushing.yards", "rush.yds")),
    rushTD: toNum(pickFlat("rush_td", "rushing_td", "rush_tds", "rushing_tds", "rtd") ?? pickNested("rushing.td", "rushing.tds", "rush.td")),
    receptions: toNum(pickFlat("rec", "receptions", "recs", "catches") ?? pickNested("receiving.rec", "receiving.receptions", "rec.rec")),
    targets: toNum(pickFlat("targets", "tgt") ?? pickNested("receiving.targets", "rec.targets")),
    recYds: toNum(pickFlat("rec_yds", "receiving_yds", "rec_yards", "recv_yards") ?? pickNested("receiving.yds", "receiving.yards", "rec.yds")),
    recTD: toNum(pickFlat("rec_td", "receiving_td", "rec_tds", "receiving_tds") ?? pickNested("receiving.td", "receiving.tds", "rec.td")),
    passAtt: toNum(pickFlat("pass_att", "attempts", "att") ?? pickNested("passing.att", "passing.attempts", "pass.att", "pass.attempts")),
    passCmp: toNum(pickFlat("pass_cmp", "cmp", "completions", "pass_completions") ?? pickNested("passing.cmp", "passing.completions", "pass.cmp", "pass.completions")),
    passYds: toNum(pickFlat("pass_yds", "passing_yds", "pass_yards") ?? pickNested("passing.yds", "passing.yards", "pass.yds")),
    passTD: toNum(pickFlat("pass_td", "passing_td", "pass_tds", "passing_tds") ?? pickNested("passing.td", "passing.tds", "pass.td")),
  };
}

function makeKey(name?: string, position?: string) {
  return `${(name || "").toLowerCase().trim()}|${(position || "").toUpperCase().trim()}`;
}

const nameBlacklist = /^(?:TBD|Unknown)$/i;

function isOnTeam(p: Player) {
  return Boolean(p && p.team && String(p.team).trim() !== "");
}

function toPickArray(drafted: Player[], picksPerRound: number) {
  // Convert local drafted players into the API pick format (simple sequential mapping).
  return drafted.map((p, i) => ({
    id: `${i}-${p.id}`,
    player_id: p.id,
    player_name: p.name,
    position: p.position ?? "",
    team: p.team ?? "",
    round: Math.floor(i / picksPerRound) + 1,
    overall: i + 1,
    slot: null,
    timestamp: Math.floor(Date.now() / 1000),
  }));
}

export default function Page() {

  // --- State ---
  const [players, setPlayers] = useState<Player[]>([]);
  const [adpByKey, setAdpByKey] = useState<Record<string, number>>({});
  const [drafted, setDrafted] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showByeWeeks, setShowByeWeeks] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [position, setPosition] = useState("ALL");
  const [isOnlineMode, setIsOnlineMode] = useState(false);
  const [sortField, setSortField] = useState<keyof Player | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc"|"desc">("desc");

  // Lightweight placeholders for draft/socket context
  const draftId = "local-draft";
  const socket: any = null;

  // Starter/bench layout derived from drafted picks (very small heuristic)
  const starterSlots = ["QB", "RB", "WR", "TE", "FLEX", "K", "DEF"];
  const startersWithSlots = drafted.slice(0, starterSlots.length);
  const bench = drafted.slice(starterSlots.length);

  const currentRound = Math.floor(drafted.length / PICKS_PER_ROUND) + 1;
  const currentPick = (drafted.length % PICKS_PER_ROUND) + 1;
  const progress = (drafted.length / Math.max(1, TOTAL_PICKS)) * 100;

  function handleSort(field: keyof Player) {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
  }

  function hasAvailableStarterSlot(player: Player) {
    // Simple heuristic: allow drafting unless already drafted
    return !drafted.some((p) => p.id === player.id);
  }
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

    // Filter and sort players once for both table and mobile card views
    const visiblePlayers = useMemo(() => {
      return [...processedPlayers]
        .filter((player) => {
          const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase())
          const onTeam = isOnTeam(player) && !nameBlacklist.test(player.name)

          if (!showByeWeeks && selectedWeek > 0) {
            const bye = getByeWeekInfo(player.team ?? "")
            const isBye = selectedWeek > 0 && (bye?.week ?? 0) === selectedWeek
            if (isBye) return false
          }

          return matchesSearch && onTeam
        })
        .sort((a, b) => {
          if (!sortField) return 0

          const va = (a as any)[sortField]
          const vb = (b as any)[sortField]

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
            const aNum = typeof va === "number" ? va : sortOrder === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY
            const bNum = typeof vb === "number" ? vb : sortOrder === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY
            const primary = sortOrder === "asc" ? aNum - bNum : bNum - aNum
            if (primary !== 0) return primary
            return a.name.localeCompare(b.name)
          }

          const aStr = String(va ?? "")
          const bStr = String(vb ?? "")
          return sortOrder === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
        })
    }, [processedPlayers, searchTerm, showByeWeeks, selectedWeek, sortField, sortOrder])

    return (
      <div className="h-screen overflow-hidden flex flex-col p-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold">Draftboard</h1>
          <p className="text-sm text-zinc-400">
            Showing {DISPLAY_YEAR} stats + ADP
            {selectedWeek > 0 && ` • Week ${selectedWeek} Focus`}
            {isOnlineMode ? " • Live Draft Mode" : " • Offline Mode"}
          </p>
        </div>

        <div className="flex-1 min-h-0 flex gap-6 items-stretch flex-col md:flex-row">
          {/* Filters sidebar (hidden on small screens) */}
          <aside className="hidden md:block w-[200px] shrink-0 bg-zinc-800 p-4 rounded-lg h-full overflow-auto">
            <h2 className="text-lg font-semibold mb-2">Filters</h2>
            <div className="mb-4">
              <label className="text-sm text-zinc-400 mb-2 block">Draft Mode</label>
              <div className="flex gap-2">
                <button
                  className={`px-2 py-1 text-xs rounded ${!isOnlineMode ? "bg-blue-600 text-white" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"}`}
                  onClick={() => setIsOnlineMode(false)}
                >
                  Offline
                </button>
                <button
                  className={`px-2 py-1 text-xs rounded ${isOnlineMode ? "bg-green-600 text-white" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"}`}
                  onClick={() => setIsOnlineMode(true)}
                >
                  Online
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm text-zinc-400 mb-2 block">Week Focus</label>
              <select title="Select week focus" className="w-full bg-zinc-700 text-white p-1 rounded text-sm" value={selectedWeek} onChange={(e) => setSelectedWeek(Number(e.target.value))}>
                <option value={0}>All Season</option>
                {Array.from({ length: 18 }, (_, i) => i + 1).map(w => (
                  <option key={w} value={w}>Week {w}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input type="checkbox" checked={showByeWeeks} onChange={(e) => setShowByeWeeks(e.target.checked)} className="rounded" />
                Show Bye Weeks
              </label>
            </div>

            <div>
              <select title="Filter by position" className="w-full bg-zinc-700 text-white p-2 rounded" value={position} onChange={(e) => setPosition(e.target.value)}>
                <option value="ALL">All Positions</option>
                <option value="QB">QB</option>
                <option value="RB">RB</option>
                <option value="WR">WR</option>
                <option value="TE">TE</option>
                <option value="K">K</option>
                <option value="DEF">DEF</option>
              </select>
            </div>
          </aside>

          {/* Players area */}
          <main className="flex-1 min-w-0 bg-zinc-800 p-4 rounded-lg flex flex-col">
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search players..."
                className="w-full bg-zinc-700 text-white p-2 rounded"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Mobile stacked cards */}
              <div className="md:hidden space-y-2">
                {visiblePlayers.map((player) => {
                  const isDrafted = drafted.find((p) => p.id === player.id)
                  const isSlotAvailable = hasAvailableStarterSlot(player)
                  const byeInfo = getByeWeekInfo(player.team ?? "")
                  const byeWeek = byeInfo?.week ?? 0
                  const isBye = selectedWeek > 0 && byeWeek === selectedWeek

                  return (
                    <article
                      key={player.id}
                      className={`bg-zinc-900 p-3 rounded-lg border border-zinc-800 ${isDrafted ? "opacity-60" : isBye && selectedWeek > 0 ? "border-red-700" : "hover:border-zinc-700"}`}
                      onClick={() => {
                        if (isDrafted) removePlayer(player.id)
                        else if (isSlotAvailable) draftPlayer(player)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="font-semibold truncate" title={player.name}>{player.name}</div>
                          <div className="text-xs text-zinc-400 truncate">{player.position} • {player.team} {byeWeek ? `• Bye ${byeWeek}` : ''}</div>
                        </div>
                        <div className="text-right ml-2">
                          <div className="text-sm font-mono">{typeof player.adp === 'number' ? player.adp.toFixed(1) : '-'}</div>
                          <div className="text-xs text-zinc-400">ADP</div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-zinc-300 grid grid-cols-3 gap-2">
                        <div>Pts: {typeof player.fantasyPoints === 'number' ? player.fantasyPoints.toFixed(1) : '-'}</div>
                        <div>Rec: {player.receptions ?? '-'}</div>
                        <div>Rush Yds: {player.rushYds ?? '-'}</div>
                      </div>
                    </article>
                  )
                })}
              </div>

              {/* Desktop table placeholder (hidden on small) - will flesh out next step */}
              <div className="hidden md:block">
                <div className="w-full text-sm text-zinc-400">Desktop table view will be reintroduced next — {visiblePlayers.length} players</div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
}