'use client'

import { useState, useEffect, useRef } from 'react'
import { Target } from 'lucide-react'
import { API_BASE_URL } from '@/constants'
import LineupOptimizer from '@/components/LineupOptimizer'
import PageFrame from '@/components/PageFrame'
import PositionPill from '@/components/PositionPill'
import { useLeague } from '@/lib/league-context'
import { computeDefenseMultipliers } from '@/lib/player-utils'

export default function LineupOptimizerPage() {
  const { season, isConnected, myPlayerIds, leagueName, leagueSettings } = useLeague()
  const [allPlayers, setAllPlayers] = useState<any[]>([])
  const [defenseMultipliers, setDefenseMultipliers] = useState<Record<string, number>>({})
  const [roster, setRoster] = useState<any[]>([])
  const [rosterImported, setRosterImported] = useState(false)
  const [search, setSearch] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/players?season=${season}&on_team_only=true&scoring=${leagueSettings.scoringFormat}`)
      .then((r) => r.json())
      .then((data) => {
        const players = Array.isArray(data) ? data : []
        setAllPlayers(players)
        setDefenseMultipliers(computeDefenseMultipliers(players))

        if (isConnected && myPlayerIds.length > 0 && !rosterImported) {
          const idSet = new Set(myPlayerIds)
          const myRoster = players.filter((p: any) => idSet.has(String(p.id)))
          if (myRoster.length > 0) {
            setRoster(myRoster)
            setRosterImported(true)
          }
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load player data. Make sure the backend is running.')
        setLoading(false)
      })
  }, [isConnected, myPlayerIds, season, leagueSettings.scoringFormat, rosterImported])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredPlayers = allPlayers
    .filter(
      (p) =>
        search.length > 0 &&
        p.name?.toLowerCase().includes(search.toLowerCase()) &&
        !roster.find((r) => r.id === p.id),
    )
    .slice(0, 10)

  const addToRoster = (player: any) => {
    setRoster((prev) => [...prev, player])
    setSearch('')
    setShowResults(false)
  }

  const removeFromRoster = (id: string) => {
    setRoster((prev) => prev.filter((p) => p.id !== id))
  }

  const heroChips = [
    { label: 'roster size', value: String(roster.length) },
    { label: 'starters', value: String(leagueSettings.rosterSlots.length) },
    { label: 'scoring', value: leagueSettings.scoringFormat.toUpperCase() },
  ]

  return (
    <PageFrame
      crumb="lineup optimizer"
      rightPill={
        <span className="week-pill">
          <Target size={12} />
          {leagueSettings.leagueType}
        </span>
      }
      hero={{
        eyebrow: 'team ops · lineup optimizer',
        title: (
          <>
            squeeze every <span className="ch-hl">point</span> out of your bench.
          </>
        ),
        sub: rosterImported ? (
          <>
            roster auto-imported from <b>{leagueName}</b>. add or trim players to test alternate starts.
          </>
        ) : (
          <>build a roster below — the optimizer ranks every legal lineup against your league&apos;s scoring rules.</>
        ),
        chips: heroChips,
      }}
    >
      {loading ? (
        <div className="empty-state">loading players…</div>
      ) : error ? (
        <div className="empty-state error">{error}</div>
      ) : (
        <>
          <div className="builder glass">
            <div className="builder-grid">
              <div>
                <label className="lbl">add players to your roster</label>
                <div className="search-wrap" ref={searchRef}>
                  <input
                    type="text"
                    placeholder="search by name (e.g. Tyreek Hill)…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setShowResults(e.target.value.length > 0)
                    }}
                    onFocus={() => search.length > 0 && setShowResults(true)}
                    className="search-input"
                  />
                  {showResults && filteredPlayers.length > 0 && (
                    <div className="search-results glass">
                      {filteredPlayers.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => addToRoster(p)}
                          className="search-result"
                        >
                          <PositionPill position={p.position} />
                          <span className="nm q-name">{p.name}</span>
                          <span className="team tnum">{p.team}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {showResults && search.length > 0 && filteredPlayers.length === 0 && (
                    <div className="search-results glass empty">no players found</div>
                  )}
                </div>
              </div>

              <div>
                <div className="row-between">
                  <label className="lbl">your roster ({roster.length})</label>
                  {roster.length > 0 && (
                    <button type="button" onClick={() => setRoster([])} className="muted-btn">
                      clear all
                    </button>
                  )}
                </div>
                {roster.length === 0 ? (
                  <div className="hint">search above to build your roster.</div>
                ) : (
                  <div className="roster-chips">
                    {roster.map((p) => (
                      <div key={p.id} className="r-chip">
                        <PositionPill position={p.position} />
                        <span className="nm q-name">{p.name}</span>
                        <button type="button" onClick={() => removeFromRoster(p.id)} aria-label="remove">
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="optimizer-wrap">
            <LineupOptimizer
              draftedPlayers={roster}
              onClose={() => {}}
              isPage
              rosterSlots={leagueSettings.rosterSlots}
              defenseMultipliers={defenseMultipliers}
            />
          </div>
        </>
      )}

      <style jsx>{`
        .empty-state {
          padding: 80px 20px;
          text-align: center;
          color: var(--ink-3);
          font-family: var(--font-mono);
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .empty-state.error {
          color: var(--hot);
        }
        .builder {
          padding: 20px;
          margin-bottom: 18px;
        }
        .builder-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 900px) {
          .builder-grid {
            grid-template-columns: 1fr;
          }
        }
        .lbl {
          display: block;
          font-family: var(--font-mono);
          font-size: 10.5px;
          letter-spacing: 0.16em;
          color: var(--ink-3);
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .search-wrap {
          position: relative;
        }
        .search-input {
          width: 100%;
          background: var(--color-cosmos-surface-dim);
          border: 1px solid var(--surface-border);
          color: var(--ink);
          padding: 10px 14px;
          border-radius: 10px;
          font-family: inherit;
          font-size: 13.5px;
          outline: none;
          transition: border-color 0.15s;
        }
        .search-input:focus {
          border-color: var(--color-cosmos-violet-hairline);
        }
        .search-input::placeholder {
          color: var(--ink-3);
        }
        .search-results {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          max-height: 320px;
          overflow-y: auto;
          z-index: 20;
          padding: 4px;
        }
        .search-results.empty {
          padding: 12px 14px;
          color: var(--ink-3);
          font-size: 12px;
        }
        .search-result {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 8px 10px;
          background: transparent;
          border: none;
          color: var(--ink);
          cursor: pointer;
          border-radius: 6px;
          text-align: left;
        }
        .search-result:hover {
          background: var(--color-cosmos-violet-row-tint);
        }
        .search-result .nm {
          font-size: 13.5px;
          flex: 1;
        }
        .search-result .team {
          font-size: 10.5px;
          color: var(--ink-3);
          letter-spacing: 0.06em;
        }
        .row-between {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .muted-btn {
          background: transparent;
          border: none;
          color: var(--ink-3);
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .muted-btn:hover {
          color: var(--hot);
        }
        .hint {
          color: var(--ink-3);
          font-size: 13px;
          padding: 6px 0;
        }
        .roster-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          max-height: 140px;
          overflow-y: auto;
        }
        .r-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 9px;
          background: var(--color-cosmos-surface-dim);
          border: 1px solid var(--surface-border);
          border-radius: 999px;
          font-size: 12.5px;
        }
        .r-chip .nm {
          color: var(--ink);
        }
        .r-chip button {
          background: transparent;
          border: none;
          color: var(--ink-3);
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          padding: 0 2px;
        }
        .r-chip button:hover {
          color: var(--hot);
        }
        .optimizer-wrap {
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-xl);
          background: var(--surface);
          backdrop-filter: blur(var(--glass-blur));
          overflow: hidden;
        }
      `}</style>
    </PageFrame>
  )
}
