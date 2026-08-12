'use client'

import { useState, useEffect } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { API_BASE_URL } from '@/constants'
import Transactions from '@/components/Transactions'
import PageFrame from '@/components/PageFrame'
import { useLeague } from '@/lib/league-context'

export default function TransactionsPage() {
  const { isConnected, leagueId, rosterOwners, leagueName } = useLeague()
  const [currentWeek, setCurrentWeek] = useState(1)
  const [players, setPlayers] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE_URL}/sleeper/state/nfl`)
      .then((r) => r.json())
      .then((data) => {
        const week = data.week || data.display_week || 1
        setCurrentWeek(Math.max(week, 1))
      })
      .catch(() => setCurrentWeek(1))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE_URL}/players?season=2026&on_team_only=false`)
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, any> = {}
        for (const p of Array.isArray(data) ? data : []) map[String(p.id)] = p
        setPlayers(map)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const heroChips = [
    { label: 'week', value: String(currentWeek) },
    { label: 'league', value: leagueName || '—' },
    { label: 'teams', value: String(rosterOwners.length || 12) },
  ]

  return (
    <PageFrame
      crumb="transactions"
      rightPill={
        <span className="week-pill">
          <ArrowLeftRight size={12} />
          ledger
        </span>
      }
      hero={{
        eyebrow: 'league · transactions',
        title: (
          <>
            the <span className="ch-hl">paper trail</span> for every move in your league.
          </>
        ),
        sub: <>trades, waivers, free agent claims — all the receipts, sorted by week.</>,
        chips: heroChips,
      }}
    >
      {!isConnected ? (
        <div className="empty-state">connect a Sleeper league to view transactions.</div>
      ) : loading ? (
        <div className="empty-state">loading transactions…</div>
      ) : (
        <div className="t-wrap">
          <Transactions
            leagueId={leagueId}
            rosterOwners={rosterOwners}
            players={players}
            initialWeek={currentWeek}
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
        .t-wrap {
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
