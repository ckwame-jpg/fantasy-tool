"use client";

import React, { useState, useEffect, useMemo } from "react";
import { API_BASE_URL } from "../../constants";
import { fetcher } from "../../lib/api";

// Extended Player type with normalized fields and computed fields
type Player = {
  id: string;
  name: string;
  team: string;
  position: string;
  // Normalized stats from Draftboard
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
  // Computed fields
  posRank?: number;
};

// Table cell helpers for consistent spacing and alignment (copied from Draftboard)
const CELL = "px-1.5 py-0.5 whitespace-nowrap";
const CELL_NUM = `${CELL} text-right tabular-nums font-mono`;

// Helpers to read nested fields and coerce values (copied from Draftboard)
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

// Map backend fields (flat or nested) to the local camelCase fields we render (copied from Draftboard)
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
    // Receiving targets
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
    // Passing attempts
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
  };
}

// Sort comparison function (copied from Draftboard logic)
function compare(a: Player, b: Player, key: keyof Player, direction: "asc" | "desc") {
  const nameA = (a.name ?? "").toString().toLowerCase();
  const nameB = (b.name ?? "").toString().toLowerCase();

  const va = (a as any)[key];
  const vb = (b as any)[key];

  // Fields that should be compared numerically (from Draftboard)
  const numericFields: (keyof Player)[] = [
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
    "posRank",
    "adp",
  ];

  if (numericFields.includes(key)) {
    const aNum =
      typeof va === "number"
        ? va
        : direction === "asc"
        ? Number.POSITIVE_INFINITY
        : Number.NEGATIVE_INFINITY;

    const bNum =
      typeof vb === "number"
        ? vb
        : direction === "asc"
        ? Number.POSITIVE_INFINITY
        : Number.NEGATIVE_INFINITY;

    const primary = direction === "asc" ? aNum - bNum : bNum - aNum;
    if (primary !== 0) return primary;

    // Stable tie break to avoid jitter
    return nameA.localeCompare(nameB);
  }

  // String-ish fields
  const aStr = String(va ?? "");
  const bStr = String(vb ?? "");
  return direction === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
}

const PlayersPage = () => {
  const FAVORITES_KEY = "fantasy:favorites";
  const currentYear = new Date().getFullYear();
  const defaultStatsYear = currentYear - 1; // Default to last completed season's stats

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<keyof Player>("fantasyPoints");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [position, setPosition] = useState("ALL");
  const [season, setSeason] = useState(defaultStatsYear);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load persisted state from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPosition = localStorage.getItem("players-position");
      const savedSeason = localStorage.getItem("players-season");
      // Prefer new key; migrate from legacy if needed
      const savedFavoritesNew = localStorage.getItem(FAVORITES_KEY);
      const savedFavoritesLegacy = localStorage.getItem("favorites");

      if (savedPosition) setPosition(savedPosition);
      if (savedSeason) setSeason(Number(savedSeason));
      try {
        if (savedFavoritesNew) {
          setFavorites((JSON.parse(savedFavoritesNew) as any[]).map((x) => String(x)));
        } else if (savedFavoritesLegacy) {
          // Migrate legacy favorites -> new key
          const legacy = (JSON.parse(savedFavoritesLegacy) as any[]).map((x) => String(x));
          setFavorites(legacy);
          localStorage.setItem(FAVORITES_KEY, JSON.stringify(legacy));
          // Optionally clean up legacy key
          // localStorage.removeItem("favorites");
        }
      } catch (e) {
        console.warn("Failed to parse saved favorites:", e);
      }
    }
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("players-position", position);
      localStorage.setItem("players-season", season.toString());
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }
  }, [position, season, favorites]);

  // Fetch players
  const fetchPlayers = async () => {
    setLoading(true);
    try {
      // Never ask the API for "Favorites" (it's a UI-only filter). Fetch ALL, then filter client-side.
      const queryPosition = position === "Favorites" ? "ALL" : position;
      // Backend expects `season` as the draft season and will show stats for (season - 1).
      // To request stats for a given stats year, pass (statsYear + 1) as the season param.
      const draftSeason = season + 1;
      const data = await fetcher(`${API_BASE_URL}/players?position=${queryPosition}&season=${draftSeason}&on_team_only=true`);
      const normalized = (data || []).map((raw: any) => {
        const stats = normalizeStats(raw);
        // Only keep defined values so we don't overwrite existing fields with `undefined`
        const cleaned = Object.fromEntries(
          Object.entries(stats).filter(([, v]) => v !== undefined)
        );
        const coercedId = String(raw?.id ?? raw?.player_id ?? raw?.playerId ?? "");
        return { ...raw, id: coercedId, ...cleaned };
      });
      setPlayers(normalized);
    } catch (error) {
      console.error("Failed to fetch players:", error);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [position, season]);

  // Process players: compute posRank
  const processedPlayers = useMemo(() => {
    if (!players.length) return [];

    // Compute position-specific rank based on fantasy points (higher is better)
    const buckets: Record<string, { idx: number; pts: number }[]> = {};
    players.forEach((p, idx) => {
      const pos = (p.position || "").toUpperCase();
      const pts = typeof p.fantasyPoints === "number" ? p.fantasyPoints : -Infinity;
      (buckets[pos] ||= []).push({ idx, pts });
    });

    const playersWithRank = [...players];
    Object.values(buckets).forEach(list => {
      list.sort((a, b) => b.pts - a.pts);
      list.forEach((item, i) => { 
        playersWithRank[item.idx].posRank = i + 1;
      });
    });

    return playersWithRank;
  }, [players]);

  const toggleFavorite = (playerId: string) => {
    const idStr = String(playerId);
    setFavorites((prev) => {
      const updated = prev.includes(idStr)
        ? prev.filter((id) => id !== idStr)
        : [...prev, idStr];
      // write-through for snappier persistence
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
        }
      } catch {}
      return updated;
    });
  };

  const handleSort = (field: keyof Player) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    return processedPlayers
      .filter((player) => {
        const matchesSearch = player.name.toLowerCase().includes(search.toLowerCase());
        
        // Handle favorites filter specially
        if (position === "Favorites") {
          return matchesSearch && favorites.includes(String(player.id));
        }
        
        // Regular position filtering
        const matchesPosition = position === "ALL" || player.position === position;
        return matchesSearch && matchesPosition;
      })
      .sort((a, b) => compare(a, b, sortField, sortDirection));
  }, [processedPlayers, search, position, favorites, sortField, sortDirection]);

  const positions = ["ALL", "QB", "RB", "WR", "TE"];
  // Offer last 4 completed stat seasons (e.g., if currentYear=2025 -> 2024, 2023, 2022, 2021)
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 1 - i);

  const SortableHeader = ({ field, children }: { field: keyof Player; children: React.ReactNode }) => (
    <th
      className={`${CELL_NUM} cursor-pointer text-[9px] font-normal whitespace-nowrap tabular-nums`}
      onClick={() => handleSort(field)}
    >
      {children} {sortField === field ? (sortDirection === "asc" ? "▲" : "▼") : ""}
    </th>
  );

  return (
    <div className="h-screen overflow-hidden p-6 flex flex-col">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">Players</h1>
        <p className="text-sm text-zinc-400">Showing {season} stats</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
        <div className="flex space-x-2">
          {positions.map((pos) => (
            <button
              key={pos}
              onClick={() => setPosition(pos)}
              className={`px-3 py-1 rounded font-semibold text-sm transition-colors focus:outline-none ${
                position === pos
                  ? "bg-purple-600 text-white"
                  : "bg-zinc-700 text-zinc-300 hover:bg-purple-500 hover:text-white"
              }`}
            >
              {pos}
            </button>
          ))}
          <button
            onClick={() => setPosition(position === "Favorites" ? "ALL" : "Favorites")}
            className={`px-3 py-1 rounded font-semibold text-sm transition-colors focus:outline-none ${
              position === "Favorites"
                ? "bg-[#00CEC8] text-white"
                : "bg-zinc-700 text-zinc-300 hover:bg-[#00CEC8] hover:text-white"
            }`}
          >
            ★ Favorites
          </button>
        </div>
        <div>
          <select
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            className="bg-zinc-700 text-white p-2 rounded border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
            title="Select season to view player statistics for"
          >
            {years.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          className="bg-zinc-700 text-white p-2 rounded w-full md:w-96 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Search by player name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="flex-1 bg-zinc-800 rounded-lg relative min-h-0 flex flex-col p-4">
        {loading ? (
          <div className="text-center text-zinc-400 py-8">Loading players...</div>
        ) : filteredPlayers.length === 0 ? (
          <div className="text-center text-zinc-400 py-8">No players found.</div>
        ) : (
          <div className="flex-1 min-h-0">
            <div className="overflow-y-auto overflow-x-hidden h-full">
              <table className="w-full table-fixed text-sm text-left">
                <colgroup>
                  {[
                    "w-[2%]",   // Fav
                    "w-[18%]",  // Name
                    "w-[5%]",   // Team
                    "w-[4%]",   // Pos
                    "w-[4%]",   // Pos Rank
                    "w-[4%]",   // ADP
                    "w-[5.5%]", // Fantasy Pts
                    "w-[3.5%]", // Rush Att
                    "w-[4.5%]", // Rush Yds
                    "w-[3.5%]", // Rush TD
                    "w-[3.5%]", // Targets
                    "w-[3.5%]", // Rec
                    "w-[4.5%]", // Rec Yds
                    "w-[3.5%]", // Rec TD
                    "w-[4%]",   // Pass Att
                    "w-[4%]",   // Pass Cmp
                    "w-[5%]",   // Pass Yds
                    "w-[4%]",   // Pass TD
                  ].map((cls, i) => (
                    <col key={i} className={cls} />
                  ))}
                </colgroup>
                <thead className="sticky top-0 z-20 bg-zinc-800 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.06)]">
                  {/* Row 1: frozen labels + grouped category headers */}
                  <tr className="text-zinc-400 border-b border-zinc-700">
                    <th rowSpan={2} className={`${CELL} text-[10px] whitespace-nowrap`}>★</th>
                    <th rowSpan={2} className={`${CELL} text-[10px] cursor-pointer whitespace-nowrap`} onClick={() => handleSort('name')}>
                      Name {sortField === 'name' ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th rowSpan={2} className={`${CELL} text-[10px] cursor-pointer whitespace-nowrap`} onClick={() => handleSort('team')}>
                      Team {sortField === 'team' ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th rowSpan={2} className={`${CELL} text-[10px] cursor-pointer whitespace-nowrap`} onClick={() => handleSort('position')}>
                      Pos {sortField === 'position' ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th rowSpan={2} className={`${CELL_NUM} text-[10px] cursor-pointer whitespace-nowrap tabular-nums`} onClick={() => handleSort('posRank')}>
                      Pos Rank {sortField === 'posRank' ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th rowSpan={2} className={`${CELL_NUM} text-[10px] cursor-pointer whitespace-nowrap tabular-nums`} onClick={() => handleSort('adp')}>
                      ADP {sortField === 'adp' ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                    </th>
                    {/* Grouped headers */}
                    <th colSpan={1} className={`${CELL_NUM} text-[9px] tracking-wide text-center whitespace-nowrap`}>FANTASY</th>
                    <th colSpan={3} className={`${CELL_NUM} text-[9px] tracking-wide text-center whitespace-nowrap`}>RUSHING</th>
                    <th colSpan={4} className={`${CELL_NUM} text-[9px] tracking-wide text-center whitespace-nowrap`}>RECEIVING</th>
                    <th colSpan={4} className={`${CELL_NUM} text-[9px] tracking-wide text-center whitespace-nowrap`}>PASSING</th>
                  </tr>
                  {/* Row 2: sortable sub-headers */}
                  <tr className="text-zinc-400 border-b border-zinc-700">
                    <SortableHeader field="fantasyPoints">Pts</SortableHeader>
                    {/* Rushing */}
                    <SortableHeader field="rushAtt">Att</SortableHeader>
                    <SortableHeader field="rushYds">Yds</SortableHeader>
                    <SortableHeader field="rushTD">TD</SortableHeader>
                    {/* Receiving */}
                    <SortableHeader field="targets">Tgt</SortableHeader>
                    <SortableHeader field="receptions">Rec</SortableHeader>
                    <SortableHeader field="recYds">Yds</SortableHeader>
                    <SortableHeader field="recTD">TD</SortableHeader>
                    {/* Passing */}
                    <SortableHeader field="passAtt">Att</SortableHeader>
                    <SortableHeader field="passCmp">Cmp</SortableHeader>
                    <SortableHeader field="passYds">Yds</SortableHeader>
                    <SortableHeader field="passTD">TD</SortableHeader>
                  </tr>
                </thead>
                <tbody className="tabular-nums whitespace-nowrap">
                  {filteredPlayers.map((player) => (
                    <tr
                      key={player.id}
                      className="border-b border-zinc-700 hover:bg-zinc-700"
                    >
                      <td className={`${CELL} text-center`}>
                        {(() => {
                          const isFav = favorites.includes(String(player.id));
                          return (
                            <button onClick={() => toggleFavorite(player.id)} className="focus:outline-none" aria-label={isFav ? "Remove favorite" : "Add favorite"}>
                              <span
                                className={`inline-block text-[16px] transition-colors ${isFav ? "text-[#00CEC8]" : "text-zinc-400"}`}
                              >
                                {isFav ? "★" : "☆"}
                              </span>
                            </button>
                          );
                        })()}
                      </td>
                      <td className={`${CELL} min-w-0`}>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="truncate" title={player.name}>{player.name}</span>
                        </div>
                      </td>
                      <td className={`${CELL} whitespace-nowrap`}>{player.team}</td>
                      <td className={`${CELL} whitespace-nowrap`}>{player.position}</td>
                      <td className={`${CELL_NUM} whitespace-nowrap tabular-nums`}>{typeof player.posRank === "number" ? player.posRank : "-"}</td>
                      <td className={`${CELL_NUM} whitespace-nowrap tabular-nums`}>
                        {typeof player.adp === "number" && Number.isFinite(player.adp) ? player.adp.toFixed(1) : "-"}
                      </td>
                      <td className={`${CELL_NUM} whitespace-nowrap tabular-nums`}>
                        {typeof player.fantasyPoints === "number" ? player.fantasyPoints.toFixed(1) : "-"}
                      </td>
                      {/* Rushing */}
                      <td className={`${CELL_NUM} whitespace-nowrap tabular-nums`}>{player.rushAtt ?? "-"}</td>
                      <td className={`${CELL_NUM} whitespace-nowrap tabular-nums`}>{player.rushYds ?? "-"}</td>
                      <td className={`${CELL_NUM} whitespace-nowrap tabular-nums`}>{player.rushTD ?? "-"}</td>
                      {/* Receiving */}
                      <td className={`${CELL_NUM} whitespace-nowrap tabular-nums`}>{player.targets ?? "-"}</td>
                      <td className={`${CELL_NUM} whitespace-nowrap tabular-nums`}>{player.receptions ?? "-"}</td>
                      <td className={`${CELL_NUM} whitespace-nowrap tabular-nums`}>{player.recYds ?? "-"}</td>
                      <td className={`${CELL_NUM} whitespace-nowrap tabular-nums`}>{player.recTD ?? "-"}</td>
                      {/* Passing */}
                      <td className={`${CELL_NUM} whitespace-nowrap tabular-nums`}>{player.passAtt ?? "-"}</td>
                      <td className={`${CELL_NUM} whitespace-nowrap tabular-nums`}>{player.passCmp ?? "-"}</td>
                      <td className={`${CELL_NUM} whitespace-nowrap tabular-nums`}>{player.passYds ?? "-"}</td>
                      <td className={`${CELL_NUM} whitespace-nowrap tabular-nums`}>{player.passTD ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayersPage;