'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { API_BASE_URL } from '@/constants'
import DraftRecap from '@/components/DraftRecap'
import PageFrame from '@/components/PageFrame'
import { useLeague } from '@/lib/league-context'

export default function DraftRecapPage() {
  const { season, myPlayerIds, isConnected, leagueName, leagueSettings } = useLeague()
  const [allPlayers, setAllPlayers] = useState<any[]>([])
  const [draftedPlayers, setDraftedPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'league' | 'draftboard' | 'none'>('none')

  useEffect(() => {
    const loadData = async () => {
      try {
        const playersRes = await fetch(`${API_BASE_URL}/players?season=${season}&on_team_only=true`)
        const playersData = await playersRes.json()
        const players = Array.isArray(playersData) ? playersData : []
        setAllPlayers(players)

        if (isConnected && myPlayerIds.length > 0) {
          const myPlayerIdSet = new Set(myPlayerIds)
          const roster = players.filter((p: any) => myPlayerIdSet.has(String(p.id)))
          setDraftedPlayers(roster)
          setSource('league')
          setLoading(false)
          return
        }

        try {
          const picksRes = await fetch(`${API_BASE_URL}/drafts/global-draft/picks`)
          const picksData = await picksRes.json()
          if (Array.isArray(picksData) && picksData.length > 0) {
            const pickedIds = new Set(picksData.map((p: any) => String(p.player_id)))
            const drafted = players.filter((p: any) => pickedIds.has(String(p.id)))
            if (drafted.length > 0) {
              setDraftedPlayers(drafted)
              setSource('draftboard')
              setLoading(false)
              return
            }
          }
        } catch {
          /* ignore */
        }
        setSource('none')
        setLoading(false)
      } catch {
        setError('Failed to load player data. Make sure the backend is running.')
        setLoading(false)
      }
    }
    loadData()
  }, [season, isConnected, myPlayerIds])

  const sourceLabel = source === 'league' ? leagueName || 'league' : source === 'draftboard' ? 'draftboard' : 'unset'

  return (
    <PageFrame
      crumb="draft recap"
      rightPill={
        <span className="week-pill">
          <Trophy size={12} />
          {sourceLabel}
        </span>
      }
      hero={{
        eyebrow: 'research · draft recap',
        title: (
          <>
            grade your draft <span className="ch-hl">before</span> the season has its say.
          </>
        ),
        sub: (
          <>
            position breakdown, bye-week distribution, and a projected starting lineup based on the roster you actually drafted.
          </>
        ),
        chips: [
          { label: 'roster', value: draftedPlayers.length || '—' },
          { label: 'source', value: source },
          { label: 'season', value: String(season) },
        ],
      }}
    >
      {loading ? (
        <div className="empty-state">loading draft data…</div>
      ) : error ? (
        <div className="empty-state error">{error}</div>
      ) : source === 'none' || draftedPlayers.length === 0 ? (
        <div className="empty-state-rich glass">
          <h2>no draft data yet</h2>
          <p>connect a fantasy platform to import your roster, or use the draftboard to mock draft first.</p>
          <Link href="/draftboard">go to draftboard</Link>
        </div>
      ) : (
        <div className="dr-wrap">
          <DraftRecap
            draftedPlayers={draftedPlayers}
            onClose={() => {}}
            isPage
            rosterSlots={leagueSettings.rosterSlots}
          />
        </div>
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
        .empty-state-rich {
          padding: 60px 28px;
          text-align: center;
          max-width: 520px;
          margin: 40px auto;
        }
        .empty-state-rich h2 {
          font-family: var(--font-display);
          font-size: 32px;
          letter-spacing: 0.04em;
          margin: 0 0 10px;
          color: var(--ink);
        }
        .empty-state-rich p {
          color: var(--ink-2);
          font-size: 14px;
          line-height: 1.55;
          margin: 0 0 20px;
        }
        .empty-state-rich a {
          display: inline-block;
          padding: 10px 18px;
          background: linear-gradient(135deg, var(--neon), var(--neon-dim));
          color: hsl(250 60% 6%);
          font-weight: 600;
          font-size: 13px;
          border-radius: 10px;
          text-decoration: none;
          box-shadow: 0 6px 20px -6px rgba(140, 100, 255, 0.6);
        }
        .dr-wrap {
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
