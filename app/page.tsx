'use client'

import { useMemo } from 'react'
import { useLeague } from '@/lib/league-context'
import { useHomeData, type PulseItem, type SlimPlayer } from '@/hooks/useHomeData'
import LiveTicker, { type TickerItem } from '@/components/LiveTicker'
import Scoreboard from '@/components/home/Scoreboard'
import RosterCompare from '@/components/home/RosterCompare'
import PulseFeedView from '@/components/home/PulseFeed'
import StandingsRail from '@/components/home/StandingsRail'
import CollapsibleSection from '@/components/CollapsibleSection'
import PlatformConnect from '@/components/PlatformConnect'

function buildTicker(items: PulseItem[], players: Record<string, SlimPlayer>): TickerItem[] {
  return items.slice(0, 18).map((item, idx) => {
    if (item.kind === 'trade') {
      const adds = item.adds || []
      const drops = item.drops || []
      const head = adds[0] || drops[0]
      return {
        id: `t-${idx}`,
        label: 'trade',
        position: head?.position,
        detail: [
          adds.map((a) => a.name).join(' + '),
          drops.length ? `for ${drops.map((d) => d.name).join(' + ')}` : '',
        ]
          .filter(Boolean)
          .join(' '),
      }
    }
    if (item.kind === 'waiver' || item.kind === 'free_agent') {
      const head = (item.adds || [])[0]
      return {
        id: `w-${idx}`,
        label: head?.name || 'pickup',
        position: head?.position,
        detail: item.kind === 'waiver' ? 'waiver claim' : 'free agent',
        pts: item.waiver_bid != null ? `$${item.waiver_bid}` : undefined,
        trend: 'up',
      }
    }
    if (item.kind === 'injury' && item.player) {
      return {
        id: `i-${idx}`,
        label: item.player.name,
        position: item.player.position,
        detail: `${item.status}${item.body_part ? ` (${item.body_part})` : ''}`,
        trend: 'down',
      }
    }
    if (item.kind === 'trending') {
      const p = (item.adds || [])[0]
      return {
        id: `tr-${idx}`,
        label: p?.name || 'trending',
        position: p?.position,
        detail: item.count != null ? `+${item.count.toLocaleString()} adds` : 'trending up',
        trend: 'up',
      }
    }
    return { id: `o-${idx}`, label: 'league activity' }
  })
}

export default function HomePage() {
  const league = useLeague()
  const data = useHomeData()

  const rosterSlots = league.leagueSettings.rosterSlots

  const myStartersPoints = data.myMatchup?.starters_points || []
  const oppStartersPoints = data.oppMatchup?.starters_points || []

  const myProj = useMemo(() => {
    if (!data.myMatchup) return 0
    const ids = data.myMatchup.starters || []
    return ids.reduce((sum, id) => {
      const p = data.projections[id]?.stats
      return sum + Number(p?.pts_ppr ?? p?.pts_half_ppr ?? 0)
    }, 0)
  }, [data.myMatchup, data.projections])

  const oppProj = useMemo(() => {
    if (!data.oppMatchup) return 0
    const ids = data.oppMatchup.starters || []
    return ids.reduce((sum, id) => {
      const p = data.projections[id]?.stats
      return sum + Number(p?.pts_ppr ?? p?.pts_half_ppr ?? 0)
    }, 0)
  }, [data.oppMatchup, data.projections])

  const tickerItems = useMemo(() => buildTicker(data.pulse?.items ?? [], data.players), [data.pulse, data.players])

  const isLive = (data.myMatchup?.points ?? 0) > 0 || (data.oppMatchup?.points ?? 0) > 0

  return (
    <>
      <div className="page-frame">
        {league.isConnected && (
          <div className="page-pill-row">
            <span className="week-pill">
              <span className="live-d" />
              week {data.week} · {league.platform}
            </span>
          </div>
        )}
        {!league.isConnected ? (
          <div style={{ maxWidth: 720, margin: '40px auto' }}>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 56,
                lineHeight: 0.95,
                letterSpacing: '0.02em',
                margin: '0 0 12px',
              }}
            >
              connect your league.
            </h1>
            <p style={{ color: 'var(--ink-2)', fontSize: 15, margin: '0 0 24px', lineHeight: 1.55 }}>
              only W's pulls live from Sleeper or ESPN — your roster, your matchup, the whole league pulse, and the GM
              that has your back. drop your Sleeper username below to wake the cosmos.
            </p>
            <PlatformConnect />
          </div>
        ) : (
          <>
            {tickerItems.length > 0 && <LiveTicker items={tickerItems} />}

            <Scoreboard
              leagueName={league.leagueName}
              week={data.week}
              myTeamName={data.myName}
              myRecord={data.myRecord}
              mySeed={data.myStanding}
              myScore={data.myMatchup?.points ?? 0}
              myProjected={myProj}
              oppTeamName={data.opponentName ?? 'opponent'}
              oppRecord={
                data.oppMatchup
                  ? data.rosterSettings[data.oppMatchup.roster_id] || { wins: 0, losses: 0, ties: 0 }
                  : { wins: 0, losses: 0, ties: 0 }
              }
              oppSeed={
                data.oppMatchup ? data.standings.findIndex((s) => s.rosterId === data.oppMatchup!.roster_id) + 1 || null : null
              }
              oppScore={data.oppMatchup?.points ?? 0}
              oppProjected={oppProj}
              winProb={data.winProb}
              isLive={isLive}
            />

            <CollapsibleSection title="on the field" meta="starters · live">
              <RosterCompare
                myTeamName={data.myName}
                myStarters={data.myMatchup?.starters || []}
                myStartersPoints={myStartersPoints}
                myTotal={data.myMatchup?.points ?? 0}
                oppTeamName={data.opponentName ?? 'opponent'}
                oppStarters={data.oppMatchup?.starters || []}
                oppStartersPoints={oppStartersPoints}
                oppTotal={data.oppMatchup?.points ?? 0}
                rosterSlots={rosterSlots}
                players={data.players}
                projections={data.projections}
              />
            </CollapsibleSection>

            <div className="below">
              <CollapsibleSection title="league pulse" meta="trades · waivers · injuries">
                <PulseFeedView data={data.pulse} players={data.players} />
              </CollapsibleSection>
              <CollapsibleSection title="standings" meta={`wk ${data.week}`}>
                <StandingsRail rows={data.standings} myRosterId={league.rosterId} limit={10} />
              </CollapsibleSection>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .below {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
          margin-top: 6px;
        }
        @media (max-width: 1100px) {
          .below {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}
