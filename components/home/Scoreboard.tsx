'use client'

interface ScoreboardProps {
  leagueName: string
  week: number
  myTeamName: string
  myRecord: { wins: number; losses: number; ties: number }
  mySeed: number | null
  myScore: number
  myProjected: number
  oppTeamName: string
  oppRecord: { wins: number; losses: number; ties: number }
  oppSeed: number | null
  oppScore: number
  oppProjected: number
  winProb: number // 0..1 in your favor
  isLive: boolean
}

function recordStr(r: { wins: number; losses: number; ties: number }) {
  return r.ties > 0 ? `${r.wins}–${r.losses}–${r.ties}` : `${r.wins}–${r.losses}`
}

function ordinal(n: number | null) {
  if (n == null) return ''
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

export default function Scoreboard({
  leagueName,
  week,
  myTeamName,
  myRecord,
  mySeed,
  myScore,
  myProjected,
  oppTeamName,
  oppRecord,
  oppSeed,
  oppScore,
  oppProjected,
  winProb,
  isLive,
}: ScoreboardProps) {
  const youPct = Math.round(winProb * 100)
  const oppPct = 100 - youPct

  return (
    <div className="scoreboard">
      <div className="sb-banner">
        <span>
          <b>{leagueName || 'your league'}</b> · week {week} · regular season
        </span>
        {isLive ? (
          <span className="live">
            <span className="d" />
            live
          </span>
        ) : (
          <span className="upcoming">kickoff sunday</span>
        )}
        <span className="muted">{new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
      </div>

      <div className="sb-board">
        <div className="sb-team you">
          <div className="meta">
            {recordStr(myRecord)}
            {mySeed != null && (
              <>
                {' · '}
                <b>{ordinal(mySeed)} seed</b>
              </>
            )}
          </div>
          <div className="name">{myTeamName}</div>
          <div className="score">{myScore.toFixed(1)}</div>
          <div className="proj">
            proj <b>{myProjected.toFixed(1)}</b>
          </div>
        </div>

        <div className="sb-clock">
          <div className="qtr">{isLive ? 'live' : 'wk'}</div>
          <div className="time">{isLive ? 'in progress' : `${week}`}</div>
          <div className="vs">vs</div>
        </div>

        <div className="sb-team away">
          <div className="meta">
            {recordStr(oppRecord)}
            {oppSeed != null && (
              <>
                {' · '}
                <b>{ordinal(oppSeed)} seed</b>
              </>
            )}
          </div>
          <div className="name">{oppTeamName || 'opponent'}</div>
          <div className="score">{oppScore.toFixed(1)}</div>
          <div className="proj">
            proj <b>{oppProjected.toFixed(1)}</b>
          </div>
        </div>
      </div>

      <div className="sb-prob">
        <span className="sb-prob-label">win prob</span>
        <div className="sb-prob-bar">
          <div className="fill" style={{ width: `${youPct}%` }} />
        </div>
        <div className="sb-prob-pcts">
          <span className="you-pct">{youPct}%</span>
          <span className="sep">/</span>
          <span className="opp-pct">{oppPct}%</span>
        </div>
      </div>

      <style jsx>{`
        .scoreboard {
          position: relative;
          border-radius: 20px;
          background: radial-gradient(900px 500px at 78% -10%, rgba(160, 120, 255, 0.18), transparent 55%),
            radial-gradient(700px 400px at 18% 110%, rgba(125, 115, 245, 0.16), transparent 55%),
            linear-gradient(180deg, rgba(18, 16, 38, 0.75), rgba(8, 10, 22, 0.85));
          border: 1px solid rgba(160, 140, 220, 0.2);
          box-shadow: 0 0 0 1px rgba(160, 140, 220, 0.05) inset, 0 30px 80px -30px rgba(140, 90, 220, 0.4);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          overflow: hidden;
          margin-bottom: 28px;
        }
        .scoreboard::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(
            90deg,
            transparent 0 calc(10% - 1px),
            rgba(255, 255, 255, 0.04) calc(10% - 1px) 10%
          );
          mask: linear-gradient(180deg, transparent 0%, black 60%, black 100%);
          -webkit-mask: linear-gradient(180deg, transparent 0%, black 60%, black 100%);
        }
        .scoreboard::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 1px;
          background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.12) 30%, rgba(255, 255, 255, 0.12) 70%, transparent);
          pointer-events: none;
        }
        .sb-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink-3);
          position: relative;
          z-index: 1;
        }
        .sb-banner :global(b) {
          color: var(--ink);
          font-weight: 600;
        }
        .sb-banner .live {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 9px;
          border-radius: 4px;
          background: rgba(255, 80, 60, 0.12);
          border: 1px solid rgba(255, 80, 60, 0.4);
          color: hsl(8 90% 72%);
          letter-spacing: 0.18em;
        }
        .sb-banner .live .d {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: hsl(8 90% 60%);
          box-shadow: 0 0 6px hsl(8 90% 60%);
          animation: pulse 1.4s ease-in-out infinite;
        }
        .sb-banner .upcoming {
          color: hsl(245 80% 78%);
          letter-spacing: 0.12em;
        }
        .sb-banner .muted {
          color: var(--ink-3);
        }

        .sb-board {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 0;
          padding: 32px 24px 28px;
          align-items: center;
          position: relative;
          z-index: 1;
        }
        .sb-team {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 0 24px;
        }
        .sb-team.away {
          align-items: flex-end;
          text-align: right;
        }
        .sb-team .meta {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-3);
        }
        .sb-team .meta :global(b) {
          color: var(--ink-2);
          font-weight: 600;
        }
        .sb-team.you .meta {
          color: var(--neon);
        }
        .sb-team .name {
          font-family: var(--font-display);
          font-size: 38px;
          line-height: 1;
          letter-spacing: 0.03em;
          margin-top: 4px;
          color: var(--ink);
        }
        .sb-team .score {
          font-family: var(--font-display);
          font-size: 88px;
          line-height: 0.85;
          letter-spacing: 0.02em;
          margin-top: 12px;
          color: var(--ink);
          font-feature-settings: 'tnum';
        }
        .sb-team.you .score {
          color: var(--neon);
          text-shadow: 0 0 22px rgba(115, 110, 245, 0.45);
        }
        .sb-team .proj {
          font-family: var(--font-mono);
          font-size: 10.5px;
          letter-spacing: 0.1em;
          color: var(--ink-3);
          text-transform: uppercase;
          margin-top: 6px;
        }
        .sb-team .proj :global(b) {
          color: var(--ink-2);
        }

        .sb-clock {
          text-align: center;
          padding: 0 12px;
        }
        .sb-clock .qtr {
          font-family: var(--font-display);
          font-size: 24px;
          line-height: 1;
          color: var(--ink-2);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .sb-clock .time {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 600;
          color: var(--neon);
          margin-top: 4px;
          letter-spacing: 0.08em;
          text-transform: lowercase;
        }
        .sb-clock .vs {
          display: block;
          font-family: var(--font-display);
          font-size: 14px;
          letter-spacing: 0.3em;
          color: var(--ink-3);
          margin-top: 12px;
        }

        .sb-prob {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 24px 18px;
          position: relative;
          z-index: 1;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
        }
        .sb-prob-label {
          font-family: var(--font-mono);
          font-size: 10.5px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ink-3);
          white-space: nowrap;
        }
        .sb-prob-bar {
          flex: 1;
          height: 8px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 80, 60, 0.18);
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .sb-prob-bar .fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          background: linear-gradient(90deg, var(--neon-dim), var(--neon));
          box-shadow: 0 0 12px rgba(115, 110, 245, 0.55);
          transition: width 0.6s ease;
        }
        .sb-prob-bar .fill::after {
          content: '';
          position: absolute;
          right: -3px;
          top: -3px;
          bottom: -3px;
          width: 6px;
          border-radius: 999px;
          background: var(--neon);
          box-shadow: 0 0 10px var(--neon);
        }
        .sb-prob-pcts {
          display: flex;
          gap: 14px;
          font-family: var(--font-quicksand), system-ui, sans-serif;
          font-size: 13px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .sb-prob-pcts .you-pct {
          color: var(--neon);
        }
        .sb-prob-pcts .opp-pct {
          color: hsl(8 80% 70%);
        }
        .sb-prob-pcts .sep {
          color: var(--line);
          font-weight: 400;
        }

        @media (max-width: 720px) {
          .sb-board {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .sb-team,
          .sb-team.away {
            align-items: flex-start;
            text-align: left;
            padding: 0 12px;
          }
          .sb-clock {
            padding: 0 12px;
            text-align: left;
          }
          .sb-team .score {
            font-size: 64px;
          }
          .sb-team .name {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  )
}
