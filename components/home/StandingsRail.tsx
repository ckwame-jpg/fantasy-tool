'use client'

interface StandingsRow {
  rosterId: number
  name: string
  wins: number
  losses: number
  ties: number
  pf: number
}

interface StandingsRailProps {
  rows: StandingsRow[]
  myRosterId: number
  limit?: number
}

export default function StandingsRail({ rows, myRosterId, limit = 10 }: StandingsRailProps) {
  const visible = rows.slice(0, limit)
  return (
    <div className="standings glass">
      <div className="standings-h">
        <div className="ttl">standings</div>
        <div className="meta">top {visible.length}</div>
      </div>
      <div className="stand-list">
        {visible.length === 0 ? (
          <div className="empty">no standings yet</div>
        ) : (
          visible.map((row, idx) => {
            const isYou = row.rosterId === myRosterId
            return (
              <div key={row.rosterId} className={`stand-row ${isYou ? 'you' : ''}`}>
                <div className="stand-rk">{idx + 1}</div>
                <div className="stand-team">
                  <div className="stand-nm q-name">{row.name}</div>
                  <div className="stand-rec">
                    {row.ties > 0 ? `${row.wins}–${row.losses}–${row.ties}` : `${row.wins}–${row.losses}`}
                  </div>
                </div>
                <div className="stand-pf tnum">{row.pf.toFixed(0)}</div>
              </div>
            )
          })
        )}
      </div>

      <style jsx>{`
        .standings {
          overflow: hidden;
        }
        .standings-h {
          padding: 14px 18px;
          border-bottom: 1px solid var(--line-2);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .standings-h .ttl {
          font-family: var(--font-display);
          font-size: 18px;
          letter-spacing: 0.04em;
          color: var(--ink);
        }
        .standings-h .meta {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--ink-3);
          text-transform: uppercase;
        }
        .stand-list {
          padding: 4px 0;
        }
        .empty {
          padding: 24px 18px;
          color: var(--ink-3);
          font-family: var(--font-mono);
          font-size: 11px;
          text-align: center;
        }
        .stand-row {
          display: grid;
          /* minmax(0, 1fr) — without it, long team names grow the track and
             push the panel wider than its parent on mobile. */
          grid-template-columns: 24px minmax(0, 1fr) auto;
          gap: 12px;
          padding: 10px 18px;
          align-items: center;
          border-top: 1px solid var(--line-2);
          position: relative;
          min-width: 0;
        }
        .stand-nm {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
          max-width: 100%;
        }
        .stand-row:first-child {
          border-top-color: transparent;
        }
        .stand-row.you {
          background: linear-gradient(90deg, rgba(115, 110, 245, 0.1), transparent 80%);
        }
        .stand-row.you::before {
          content: '';
          position: absolute;
          left: 0;
          top: 6px;
          bottom: 6px;
          width: 2px;
          background: var(--neon);
          box-shadow: 0 0 8px var(--neon);
        }
        .stand-rk {
          font-family: var(--font-display);
          font-size: 18px;
          line-height: 1;
          color: var(--ink-3);
          text-align: right;
        }
        .stand-row.you .stand-rk {
          color: var(--neon);
        }
        .stand-row:nth-child(1) .stand-rk {
          color: var(--gold);
        }
        .stand-team {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .stand-nm {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .stand-rec {
          font-family: var(--font-mono);
          font-size: 10.5px;
          color: var(--ink-3);
          letter-spacing: 0.04em;
        }
        .stand-pf {
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-2);
          text-align: right;
        }
        .stand-row.you .stand-pf {
          color: var(--neon);
        }
      `}</style>
    </div>
  )
}
