'use client'

import { useEffect, useMemo, useState } from 'react'
import { API_BASE_URL } from '@/constants'
import { useLeague } from '@/lib/league-context'

export interface SlimPlayer {
  id: string
  name: string
  position: string
  team: string
  injury_status?: string | null
  injury_body_part?: string | null
}

export interface NflState {
  week?: number
  display_week?: number
  season?: string
  season_type?: string
  leg?: number
}

export interface SleeperMatchup {
  roster_id: number
  matchup_id: number | null
  points: number
  custom_points?: number | null
  starters: string[]
  starters_points?: number[]
  players: string[]
  players_points?: Record<string, number>
}

export interface PulseAddDrop {
  id: string
  name: string
  position: string
}

export interface PulsePick {
  season: string
  round: number
  label: string
  owner_roster_id?: number | null
  previous_owner_roster_id?: number | null
  original_roster_id?: number | null
}

export interface PulseItem {
  kind: string
  ts: number
  week: number
  adds?: PulseAddDrop[]
  drops?: PulseAddDrop[]
  picks?: PulsePick[]
  player?: PulseAddDrop
  status?: string
  body_part?: string | null
  waiver_bid?: number | null
  count?: number | null
  roster_ids?: number[]
}

export interface PulseFeed {
  items: PulseItem[]
  generated_at: number
  week: number
}

export interface ProjectionsMap {
  [playerId: string]: { stats?: { pts_ppr?: number; pts_half_ppr?: number; pts_std?: number } }
}

interface FetchState {
  loading: boolean
  error: string | null
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export function useHomeData() {
  const { isConnected, leagueId, rosterId, season, rosterOwners, totalRosters } = useLeague()
  const [state, setState] = useState<FetchState>({ loading: false, error: null })
  const [nflState, setNflState] = useState<NflState | null>(null)
  const [matchups, setMatchups] = useState<SleeperMatchup[]>([])
  const [pulse, setPulse] = useState<PulseFeed | null>(null)
  const [players, setPlayers] = useState<Record<string, SlimPlayer>>({})
  const [projections, setProjections] = useState<ProjectionsMap>({})
  const [rosterSettings, setRosterSettings] = useState<Record<number, { wins: number; losses: number; ties: number; pf: number; pa: number }>>({})

  // 1. Pull NFL state on mount; refresh every 60s.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const s = await fetchJson<NflState>(`${API_BASE_URL}/sleeper/state/nfl`)
      if (!cancelled && s) setNflState(s)
    }
    load()
    const id = setInterval(load, 60_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const week = nflState?.week ?? nflState?.display_week ?? 1

  // 2. Pull matchups for the current week (every 30s while connected).
  // NB: week === 0 is a valid value (preseason) — only bail when undefined.
  useEffect(() => {
    if (!isConnected || !leagueId || week == null) return
    let cancelled = false
    const load = async () => {
      const m = await fetchJson<SleeperMatchup[]>(`${API_BASE_URL}/sleeper/league/${leagueId}/matchups/${week}`)
      if (!cancelled) setMatchups(Array.isArray(m) ? m : [])
    }
    load()
    const id = setInterval(load, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [isConnected, leagueId, week])

  // 3. Pull pulse feed (every 60s). Same caveat — week === 0 is valid in preseason.
  useEffect(() => {
    if (!isConnected || !leagueId || week == null) return
    let cancelled = false
    const load = async () => {
      const p = await fetchJson<PulseFeed>(`${API_BASE_URL}/league/${leagueId}/pulse?week=${week}&weeks_back=2&limit=50`)
      if (!cancelled && p) setPulse(p)
    }
    load()
    const id = setInterval(load, 60_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [isConnected, leagueId, week])

  // 4. Pull projections for the current week. (week === 0 is valid in preseason.)
  useEffect(() => {
    if (!season || week == null) return
    let cancelled = false
    const load = async () => {
      const p = await fetchJson<ProjectionsMap>(`${API_BASE_URL}/sleeper/projections/${season}/${week}`)
      if (!cancelled && p) setProjections(p)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [season, week])

  // 5. Pull roster settings (records, points-for) — refreshes when matchups change.
  useEffect(() => {
    if (!isConnected || !leagueId) return
    let cancelled = false
    const load = async () => {
      const rosters = await fetchJson<any[]>(`${API_BASE_URL}/sleeper/league/${leagueId}/rosters`)
      if (cancelled || !Array.isArray(rosters)) return
      const next: typeof rosterSettings = {}
      for (const r of rosters) {
        const s = r?.settings || {}
        const pfWhole = Number(s.fpts ?? 0)
        const pfDec = Number(s.fpts_decimal ?? 0)
        const paWhole = Number(s.fpts_against ?? 0)
        const paDec = Number(s.fpts_against_decimal ?? 0)
        next[r.roster_id] = {
          wins: Number(s.wins ?? 0),
          losses: Number(s.losses ?? 0),
          ties: Number(s.ties ?? 0),
          pf: pfWhole + pfDec / 100,
          pa: paWhole + paDec / 100,
        }
      }
      setRosterSettings(next)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [isConnected, leagueId, matchups])

  // 6. Pull slim player metadata for everyone we need to display (starters + pulse mentions).
  const playerIdsToResolve = useMemo(() => {
    const ids = new Set<string>()
    for (const m of matchups) for (const id of m.starters || []) if (id && id !== '0') ids.add(id)
    if (pulse) {
      for (const item of pulse.items) {
        for (const p of item.adds || []) ids.add(p.id)
        for (const p of item.drops || []) ids.add(p.id)
        if (item.player) ids.add(item.player.id)
      }
    }
    return Array.from(ids)
  }, [matchups, pulse])

  useEffect(() => {
    if (playerIdsToResolve.length === 0) return
    const missing = playerIdsToResolve.filter((id) => !players[id])
    if (missing.length === 0) return
    let cancelled = false
    const load = async () => {
      const data = await fetchJson<Record<string, SlimPlayer>>(
        `${API_BASE_URL}/sleeper/players/slim?ids=${encodeURIComponent(missing.join(','))}`,
      )
      if (cancelled || !data) return
      setPlayers((prev) => ({ ...prev, ...data }))
    }
    load()
    return () => {
      cancelled = true
    }
    // We intentionally only depend on the join — adding `players` here causes a refetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerIdsToResolve.join(',')])

  // ---- derived ----

  const myMatchup = useMemo(() => matchups.find((m) => m.roster_id === rosterId) || null, [matchups, rosterId])
  const oppMatchup = useMemo(() => {
    if (!myMatchup) return null
    return (
      matchups.find(
        (m) => m.matchup_id === myMatchup.matchup_id && m.roster_id !== myMatchup.roster_id,
      ) || null
    )
  }, [matchups, myMatchup])

  const projForStarters = (m: SleeperMatchup | null) => {
    if (!m) return 0
    let total = 0
    for (const id of m.starters || []) {
      const proj = projections[id]?.stats?.pts_ppr ?? projections[id]?.stats?.pts_half_ppr ?? 0
      total += Number(proj || 0)
    }
    return total
  }

  const winProb = useMemo(() => {
    if (!myMatchup || !oppMatchup) return 0.5
    const myProj = projForStarters(myMatchup)
    const oppProj = projForStarters(oppMatchup)
    const myPts = myMatchup.points || 0
    const oppPts = oppMatchup.points || 0
    // Crude blended estimate: heavier weight on remaining-projection delta as games progress.
    const remainingMine = Math.max(0, myProj - myPts) + myPts
    const remainingOpp = Math.max(0, oppProj - oppPts) + oppPts
    const total = remainingMine + remainingOpp
    if (total <= 0) return 0.5
    const raw = remainingMine / total
    return Math.max(0.05, Math.min(0.95, raw))
  }, [myMatchup, oppMatchup, projections])

  const standings = useMemo(() => {
    const rows = rosterOwners
      .map((o) => {
        const s = rosterSettings[o.rosterId]
        return {
          rosterId: o.rosterId,
          name: o.displayName,
          wins: s?.wins ?? 0,
          losses: s?.losses ?? 0,
          ties: s?.ties ?? 0,
          pf: s?.pf ?? 0,
        }
      })
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins
        return b.pf - a.pf
      })
    return rows
  }, [rosterOwners, rosterSettings])

  const myRecord = useMemo(() => {
    const r = rosterSettings[rosterId]
    return r ? { wins: r.wins, losses: r.losses, ties: r.ties, pf: r.pf } : { wins: 0, losses: 0, ties: 0, pf: 0 }
  }, [rosterSettings, rosterId])

  const myStanding = useMemo(() => {
    const idx = standings.findIndex((s) => s.rosterId === rosterId)
    return idx >= 0 ? idx + 1 : null
  }, [standings, rosterId])

  const opponentName = useMemo(() => {
    if (!oppMatchup) return null
    const o = rosterOwners.find((r) => r.rosterId === oppMatchup.roster_id)
    return o?.displayName || `Team ${oppMatchup.roster_id}`
  }, [oppMatchup, rosterOwners])

  const myName = useMemo(() => {
    const o = rosterOwners.find((r) => r.rosterId === rosterId)
    return o?.displayName || 'your team'
  }, [rosterOwners, rosterId])

  return {
    state,
    setState,
    week,
    nflState,
    matchups,
    myMatchup,
    oppMatchup,
    pulse,
    players,
    projections,
    standings,
    myRecord,
    myStanding,
    opponentName,
    myName,
    rosterSettings,
    winProb,
    totalRosters,
    rosterOwners,
  }
}
