"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { API_BASE_URL } from "@/constants"

// ---- Types ----

export type Platform = "sleeper" | "espn" | "none"
export type LeagueType = "redraft" | "dynasty"
export type ScoringFormat = "ppr" | "half_ppr" | "standard"

export interface LeagueSettings {
  leagueType: LeagueType
  scoringFormat: ScoringFormat
  rosterSlots: string[]
}

export const DEFAULT_REDRAFT_SLOTS = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF"]
export const DEFAULT_DYNASTY_SLOTS = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "SUPER_FLEX", "K", "DEF"]

const DEFAULT_SETTINGS: LeagueSettings = {
  leagueType: "redraft",
  scoringFormat: "ppr",
  rosterSlots: DEFAULT_REDRAFT_SLOTS,
}

export interface LeagueInfo {
  league_id: string
  name: string
  total_rosters: number
  season: string
  sport: string
  roster_positions?: string[]
}

export interface RosterOwner {
  rosterId: number
  ownerId: string
  displayName: string
  playerIds: string[]
  starters: string[]
}

export interface LeagueConnection {
  platform: Platform
  username: string
  userId: string
  leagueId: string
  leagueName: string
  rosterId: number
  myPlayerIds: string[]
  myStarters: string[]
  allRosteredIds: string[]
  rosterOwners: RosterOwner[]
  season: number
  leagueSettings: LeagueSettings
  isConnected: boolean
  isLoading: boolean
  error: string | null
  leagues: LeagueInfo[]
}

export interface EspnTeam {
  id: number
  name: string
  abbrev: string
  playerIds: string[]
}

interface LeagueContextValue extends LeagueConnection {
  connectSleeper: (username: string) => Promise<void>
  connectESPN: (leagueId: string, season?: number) => Promise<void>
  selectLeague: (leagueId: string) => Promise<void>
  selectEspnTeam: (teamId: number) => void
  espnTeams: EspnTeam[]
  disconnect: () => void
  refreshRoster: () => Promise<void>
  updateLeagueSettings: (settings: Partial<LeagueSettings>) => void
}

const STORAGE_KEY = "wfantasy:league-connection"

const defaultState: LeagueConnection = {
  platform: "none",
  username: "",
  userId: "",
  leagueId: "",
  leagueName: "",
  rosterId: -1,
  myPlayerIds: [],
  myStarters: [],
  allRosteredIds: [],
  rosterOwners: [],
  season: new Date().getFullYear(),
  leagueSettings: { ...DEFAULT_SETTINGS },
  isConnected: false,
  isLoading: false,
  error: null,
  leagues: [],
}

const LeagueContext = createContext<LeagueContextValue>({
  ...defaultState,
  connectSleeper: async () => {},
  connectESPN: async () => {},
  selectLeague: async () => {},
  selectEspnTeam: () => {},
  espnTeams: [],
  disconnect: () => {},
  refreshRoster: async () => {},
  updateLeagueSettings: () => {},
})

export function useLeague() {
  return useContext(LeagueContext)
}

// ---- Helper: fetch JSON ----

async function fetchJSON(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

// ---- Provider ----

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LeagueConnection>(defaultState)
  const [espnTeams, setEspnTeams] = useState<EspnTeam[]>([])
  const [espnLeagueData, setEspnLeagueData] = useState<any>(null)

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<LeagueConnection>
        if (parsed.platform && parsed.platform !== "none" && parsed.leagueId) {
          setState((prev) => ({
            ...prev,
            ...parsed,
            leagueSettings: parsed.leagueSettings || { ...DEFAULT_SETTINGS },
            isConnected: true,
            isLoading: false,
            error: null,
          }))
        }
      }
    } catch {}
  }, [])

  // Persist to localStorage when connection changes
  useEffect(() => {
    if (state.isConnected) {
      const toSave: Partial<LeagueConnection> = {
        platform: state.platform,
        username: state.username,
        userId: state.userId,
        leagueId: state.leagueId,
        leagueName: state.leagueName,
        rosterId: state.rosterId,
        myPlayerIds: state.myPlayerIds,
        myStarters: state.myStarters,
        allRosteredIds: state.allRosteredIds,
        rosterOwners: state.rosterOwners,
        season: state.season,
        leagueSettings: state.leagueSettings,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    }
  }, [state.isConnected, state.leagueId, state.myPlayerIds, state.allRosteredIds, state.leagueSettings])

  // Connect to Sleeper: step 1 — look up user + fetch leagues
  const connectSleeper = useCallback(async (username: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null, platform: "sleeper" }))
    try {
      const user = await fetchJSON(`${API_BASE_URL}/sleeper/user/${username}`)
      const userId = user.user_id
      if (!userId) throw new Error("User not found")

      const season = new Date().getFullYear()
      const leagues: LeagueInfo[] = await fetchJSON(
        `${API_BASE_URL}/sleeper/user/${userId}/leagues/${season}`
      )

      setState((prev) => ({
        ...prev,
        platform: "sleeper",
        username: user.username || username,
        userId,
        season,
        leagues,
        isLoading: false,
        error: leagues.length === 0 ? `No leagues found for ${season}` : null,
      }))
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err?.message || "Failed to connect",
      }))
    }
  }, [])

  // Connect to Sleeper: step 2 — select a league and load rosters
  const selectLeague = useCallback(
    async (leagueId: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      try {
        const [rosters, users, leagueInfo] = await Promise.all([
          fetchJSON(`${API_BASE_URL}/sleeper/league/${leagueId}/rosters`),
          fetchJSON(`${API_BASE_URL}/sleeper/league/${leagueId}/users`),
          fetchJSON(`${API_BASE_URL}/sleeper/league/${leagueId}`),
        ])

        // Build user display name map
        const userMap: Record<string, string> = {}
        for (const u of users) {
          userMap[u.user_id] = u.display_name || u.username || "Unknown"
        }

        // Build roster owners list + find my roster
        const owners: RosterOwner[] = []
        let myRosterId = -1
        let myPlayerIds: string[] = []
        let myStarters: string[] = []
        const allRostered: string[] = []

        for (const r of rosters) {
          const playerIds = (r.players || []).map(String)
          const starters = (r.starters || []).map(String)
          const ownerId = r.owner_id || ""

          owners.push({
            rosterId: r.roster_id,
            ownerId,
            displayName: userMap[ownerId] || `Team ${r.roster_id}`,
            playerIds,
            starters,
          })

          allRostered.push(...playerIds)

          if (ownerId === state.userId) {
            myRosterId = r.roster_id
            myPlayerIds = playerIds
            myStarters = starters
          }
        }

        const leagueName = leagueInfo?.name || state.leagues.find((l) => l.league_id === leagueId)?.name || "League"

        // Auto-detect league settings from Sleeper data
        const rosterPositions: string[] = leagueInfo?.roster_positions || []
        const scoringSettings = leagueInfo?.scoring_settings || {}
        const recPoints = scoringSettings.rec ?? 1
        const detectedScoring: ScoringFormat =
          recPoints === 0 ? "standard" : recPoints === 0.5 ? "half_ppr" : "ppr"
        const starterPositions = rosterPositions.filter((p: string) => p !== "BN")
        const hasSuperFlex = starterPositions.includes("SUPER_FLEX")
        const detectedType: LeagueType = hasSuperFlex ? "dynasty" : "redraft"
        const detectedSlots = starterPositions.length > 0
          ? starterPositions
          : (detectedType === "dynasty" ? DEFAULT_DYNASTY_SLOTS : DEFAULT_REDRAFT_SLOTS)

        setState((prev) => ({
          ...prev,
          leagueId,
          leagueName,
          rosterId: myRosterId,
          myPlayerIds,
          myStarters,
          allRosteredIds: [...new Set(allRostered)],
          rosterOwners: owners,
          leagueSettings: {
            leagueType: detectedType,
            scoringFormat: detectedScoring,
            rosterSlots: detectedSlots,
          },
          isConnected: true,
          isLoading: false,
          error: myRosterId === -1 ? "Could not find your roster in this league" : null,
        }))
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err?.message || "Failed to load league",
        }))
      }
    },
    [state.userId, state.leagues]
  )

  // Connect ESPN: fetch league data and show team picker
  const connectESPN = useCallback(async (leagueId: string, season?: number) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null, platform: "espn" }))
    try {
      const yr = season || new Date().getFullYear()
      const data = await fetchJSON(
        `${API_BASE_URL}/espn/league/${leagueId}?season=${yr}&view=mRoster,mTeam`
      )

      if (!data?.teams?.length) throw new Error("No teams found. The league may be private.")

      setEspnLeagueData(data)

      // ESPN player IDs are numeric — we'll store them as strings for consistency
      const teams: EspnTeam[] = data.teams.map((t: any) => {
        const playerIds: string[] = (t.roster?.entries || []).map(
          (e: any) => String(e.playerId)
        )
        return {
          id: t.id,
          name: `${t.name || ""} ${t.location || ""}`.trim() || `Team ${t.id}`,
          abbrev: t.abbrev || "",
          playerIds,
        }
      })

      setEspnTeams(teams)

      setState((prev) => ({
        ...prev,
        platform: "espn",
        leagueId,
        season: yr,
        leagueName: data.settings?.name || `ESPN League ${leagueId}`,
        isLoading: false,
        error: null,
      }))
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err?.message || "Failed to load ESPN league",
      }))
    }
  }, [])

  // ESPN step 2: user picks their team
  const selectEspnTeam = useCallback((teamId: number) => {
    const team = espnTeams.find((t) => t.id === teamId)
    if (!team) return

    const allRostered: string[] = []
    const owners: RosterOwner[] = espnTeams.map((t) => {
      allRostered.push(...t.playerIds)
      return {
        rosterId: t.id,
        ownerId: String(t.id),
        displayName: t.name,
        playerIds: t.playerIds,
        starters: [], // ESPN view would need mMatchup for starters
      }
    })

    setState((prev) => ({
      ...prev,
      rosterId: teamId,
      userId: String(teamId),
      username: team.name,
      myPlayerIds: team.playerIds,
      myStarters: [],
      allRosteredIds: [...new Set(allRostered)],
      rosterOwners: owners,
      isConnected: true,
      isLoading: false,
      error: null,
      leagues: [],
    }))
    setEspnTeams([])
  }, [espnTeams])

  // Refresh roster data (re-fetch rosters for current league)
  const refreshRoster = useCallback(async () => {
    if (!state.leagueId) return
    if (state.platform === "espn") {
      await connectESPN(state.leagueId, state.season)
      // Re-select the same team after refresh
      const teamId = state.rosterId
      if (teamId >= 0) {
        // Will be applied after espnTeams updates
      }
      return
    }
    await selectLeague(state.leagueId)
  }, [state.leagueId, state.platform, state.season, state.rosterId, selectLeague, connectESPN])

  // Update league settings (manual override)
  const updateLeagueSettings = useCallback((partial: Partial<LeagueSettings>) => {
    setState((prev) => {
      const merged = { ...prev.leagueSettings, ...partial }
      // When league type changes and no connected league providing slots, swap to defaults
      if (partial.leagueType && !partial.rosterSlots && !prev.isConnected) {
        merged.rosterSlots = partial.leagueType === "dynasty" ? DEFAULT_DYNASTY_SLOTS : DEFAULT_REDRAFT_SLOTS
      }
      return { ...prev, leagueSettings: merged }
    })
  }, [])

  // Disconnect
  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState({ ...defaultState, season: new Date().getFullYear(), leagueSettings: { ...DEFAULT_SETTINGS } })
    setEspnTeams([])
    setEspnLeagueData(null)
  }, [])

  return (
    <LeagueContext.Provider
      value={{
        ...state,
        connectSleeper,
        connectESPN,
        selectLeague,
        selectEspnTeam,
        espnTeams,
        disconnect,
        refreshRoster,
        updateLeagueSettings,
      }}
    >
      {children}
    </LeagueContext.Provider>
  )
}
