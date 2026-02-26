"use client"

import { useState } from "react"
import { useLeague } from "@/lib/league-context"
import { ChevronDown, ChevronUp, Wifi, RefreshCw, X } from "lucide-react"

type UITab = "sleeper" | "espn" | "nfl"

export default function PlatformConnect() {
  const {
    platform,
    username,
    leagueName,
    isConnected,
    isLoading,
    error,
    leagues,
    myPlayerIds,
    espnTeams,
    connectSleeper,
    connectESPN,
    selectLeague,
    selectEspnTeam,
    disconnect,
    refreshRoster,
    leagueSettings,
    updateLeagueSettings,
  } = useLeague()

  const [expanded, setExpanded] = useState(!isConnected)
  const [inputUsername, setInputUsername] = useState("")
  const [espnLeagueId, setEspnLeagueId] = useState("")
  const [espnSeason, setEspnSeason] = useState(String(new Date().getFullYear()))
  const [selectedTab, setSelectedTab] = useState<UITab>("sleeper")

  const handleSleeperConnect = async () => {
    if (!inputUsername.trim()) return
    await connectSleeper(inputUsername.trim())
  }

  const handleEspnConnect = async () => {
    if (!espnLeagueId.trim()) return
    await connectESPN(espnLeagueId.trim(), parseInt(espnSeason) || new Date().getFullYear())
  }

  // Collapsed: show connection status bar
  if (!expanded && isConnected) {
    return (
      <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <Wifi size={14} className="text-green-400" />
          </div>
          <span className="text-sm text-slate-300">
            connected to <span className="text-white font-medium">{leagueName}</span>
            <span className="text-slate-500 ml-1">({platform})</span>
          </span>
          <span className="text-xs text-slate-500">{myPlayerIds.length} players</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshRoster()}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Refresh roster"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setExpanded(true)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Expand settings"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
    )
  }

  const showPlatformSelector = !isConnected && !leagues.length && !espnTeams.length

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300">connect fantasy platform</h3>
        {isConnected && (
          <button
            onClick={() => setExpanded(false)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Collapse settings"
          >
            <ChevronUp size={14} />
          </button>
        )}
      </div>

      {/* Platform selector */}
      {showPlatformSelector && (
        <>
          <div className="flex gap-2 mb-3">
            {(["sleeper", "espn", "nfl"] as UITab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  selectedTab === tab
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                {tab === "sleeper" ? "Sleeper" : tab === "espn" ? "ESPN" : "NFL.com"}
              </button>
            ))}
          </div>

          {/* Sleeper input */}
          {selectedTab === "sleeper" && (
            <div className="flex gap-2">
              <input
                type="text"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSleeperConnect()}
                placeholder="sleeper username..."
                className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleSleeperConnect}
                disabled={isLoading || !inputUsername.trim()}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded transition-colors"
              >
                {isLoading ? "connecting..." : "connect"}
              </button>
            </div>
          )}

          {/* ESPN input */}
          {selectedTab === "espn" && (
            <div>
              <p className="text-xs text-slate-500 mb-2">
                public leagues only. find your league ID in the ESPN fantasy URL.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={espnLeagueId}
                  onChange={(e) => setEspnLeagueId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEspnConnect()}
                  placeholder="league ID (e.g. 12345678)"
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="number"
                  value={espnSeason}
                  onChange={(e) => setEspnSeason(e.target.value)}
                  className="w-20 bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="year"
                />
                <button
                  onClick={handleEspnConnect}
                  disabled={isLoading || !espnLeagueId.trim()}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded transition-colors"
                >
                  {isLoading ? "connecting..." : "connect"}
                </button>
              </div>
            </div>
          )}

          {/* NFL.com stub */}
          {selectedTab === "nfl" && (
            <p className="text-xs text-slate-500">
              NFL.com doesn't offer a public API. Use manual roster entry or import from Sleeper/ESPN instead.
            </p>
          )}
        </>
      )}

      {/* Sleeper league picker */}
      {!isConnected && leagues.length > 0 && (
        <div>
          <p className="text-sm text-slate-400 mb-2">
            found {leagues.length} league{leagues.length !== 1 ? "s" : ""} for <span className="text-white">{username}</span>
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {leagues.map((league) => (
              <button
                key={league.league_id}
                onClick={() => selectLeague(league.league_id)}
                disabled={isLoading}
                className="w-full text-left px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
              >
                <div className="text-sm font-medium text-white">{league.name}</div>
                <div className="text-xs text-slate-400">
                  {league.total_rosters} teams &middot; {league.season}
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={disconnect}
            className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            back
          </button>
        </div>
      )}

      {/* ESPN team picker */}
      {!isConnected && espnTeams.length > 0 && (
        <div>
          <p className="text-sm text-slate-400 mb-2">
            select your team from <span className="text-white">{leagueName}</span>
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {espnTeams.map((team) => (
              <button
                key={team.id}
                onClick={() => selectEspnTeam(team.id)}
                className="w-full text-left px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
              >
                <div className="text-sm font-medium text-white">{team.name}</div>
                <div className="text-xs text-slate-400">
                  {team.playerIds.length} players
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={disconnect}
            className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            back
          </button>
        </div>
      )}

      {/* Connected state (expanded view) */}
      {isConnected && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-sm text-white font-medium">{leagueName}</span>
            <span className="text-xs text-slate-500">via {platform}</span>
          </div>
          <div className="text-xs text-slate-400 mb-3">
            {myPlayerIds.length} players on your roster &middot; {username}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => refreshRoster()}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-sm text-slate-300 rounded transition-colors"
            >
              <RefreshCw size={12} />
              {isLoading ? "refreshing..." : "refresh"}
            </button>
            <button
              onClick={disconnect}
              className="flex items-center gap-1 px-3 py-1 bg-slate-700 hover:bg-red-500/20 text-sm text-slate-400 hover:text-red-400 rounded transition-colors"
            >
              <X size={12} />
              disconnect
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}

      {/* League Settings */}
      <div className="mt-3 pt-3 border-t border-slate-700">
        <h4 className="text-xs font-semibold text-slate-400 mb-2">league settings</h4>
        <div className="flex flex-wrap items-center gap-3">
          {/* League type toggle */}
          <div className="flex gap-1">
            {(["redraft", "dynasty"] as const).map((type) => (
              <button
                key={type}
                onClick={() => updateLeagueSettings({ leagueType: type })}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  leagueSettings.leagueType === type
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Scoring format */}
          <select
            title="Scoring format"
            value={leagueSettings.scoringFormat}
            onChange={(e) => updateLeagueSettings({ scoringFormat: e.target.value as any })}
            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ppr">PPR</option>
            <option value="half_ppr">Half-PPR</option>
            <option value="standard">Standard</option>
          </select>

          {/* Roster slots (editable) */}
          <div className="flex flex-wrap items-center gap-1">
            {leagueSettings.rosterSlots.map((slot, i) => (
              <span
                key={`${slot}-${i}`}
                className={`group flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  slot === "SUPER_FLEX"
                    ? "bg-purple-500/20 text-purple-400"
                    : slot === "FLEX" || slot === "REC_FLEX" || slot === "WRRB_FLEX"
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {slot === "SUPER_FLEX" ? "SF" : slot === "REC_FLEX" ? "R/W" : slot === "WRRB_FLEX" ? "W/R" : slot}
                <button
                  type="button"
                  onClick={() => {
                    const updated = [...leagueSettings.rosterSlots]
                    updated.splice(i, 1)
                    updateLeagueSettings({ rosterSlots: updated })
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 ml-0.5 transition-opacity"
                  title={`Remove ${slot}`}
                >
                  ×
                </button>
              </span>
            ))}
            <select
              title="Add roster slot"
              onChange={(e) => {
                if (!e.target.value) return
                updateLeagueSettings({ rosterSlots: [...leagueSettings.rosterSlots, e.target.value] })
                e.target.value = ""
              }}
              className="bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-[10px] text-slate-400 focus:outline-none"
              defaultValue=""
            >
              <option value="">+ add</option>
              <option value="QB">QB</option>
              <option value="RB">RB</option>
              <option value="WR">WR</option>
              <option value="TE">TE</option>
              <option value="FLEX">FLEX</option>
              <option value="SUPER_FLEX">SF</option>
              <option value="REC_FLEX">R/W</option>
              <option value="WRRB_FLEX">W/R</option>
              <option value="K">K</option>
              <option value="DEF">DEF</option>
            </select>
          </div>
        </div>
        {isConnected && (
          <p className="text-[10px] text-slate-500 mt-1.5">auto-detected from {leagueName}</p>
        )}
      </div>
    </div>
  )
}
