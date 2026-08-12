'use client'

import { UserCog, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import PageFrame from '@/components/PageFrame'
import PlatformConnect from '@/components/PlatformConnect'
import { useLeague } from '@/lib/league-context'

export default function SettingsPage() {
  const {
    isConnected,
    platform,
    username,
    leagueName,
    season,
    myPlayerIds,
    totalRosters,
    isLoading,
    disconnect,
    refreshRoster,
  } = useLeague()

  return (
    <PageFrame
      rightPill={
        <span className="week-pill">
          <UserCog size={12} />
          {isConnected ? 'connected' : 'not connected'}
        </span>
      }
      hero={{
        eyebrow: 'account · settings',
        title: (
          <>
            your <span className="ch-hl">profile</span>, your league.
          </>
        ),
        sub: (
          <>switch fantasy accounts, connect a new league, or tune your scoring &amp; roster setup.</>
        ),
        chips: [
          { label: 'platform', value: isConnected ? platform : '—' },
          { label: 'season', value: isConnected ? String(season) : '—' },
          { label: 'roster', value: isConnected ? `${myPlayerIds.length} players` : '—' },
        ],
      }}
    >
      <div className="settings-stack">
        <section className="card glass">
          <div className="card-head">
            <div className="card-title">
              {isConnected ? <Wifi size={14} className="ico-on" /> : <WifiOff size={14} className="ico-off" />}
              <span>currently signed in</span>
            </div>
          </div>

          {isConnected ? (
            <div className="acct-grid">
              <div className="acct-row">
                <span className="acct-k">platform</span>
                <span className="acct-v">{platform}</span>
              </div>
              <div className="acct-row">
                <span className="acct-k">username</span>
                <span className="acct-v">{username || '—'}</span>
              </div>
              <div className="acct-row">
                <span className="acct-k">league</span>
                <span className="acct-v">{leagueName || '—'}</span>
              </div>
              <div className="acct-row">
                <span className="acct-k">season</span>
                <span className="acct-v">{season}</span>
              </div>
              <div className="acct-row">
                <span className="acct-k">teams</span>
                <span className="acct-v">{totalRosters}</span>
              </div>
              <div className="acct-row">
                <span className="acct-k">roster</span>
                <span className="acct-v">{myPlayerIds.length} players</span>
              </div>
              <div className="acct-actions">
                <div className="acct-btn-row">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => refreshRoster()}
                    disabled={isLoading}
                  >
                    <RefreshCw size={12} />
                    {isLoading ? 'refreshing…' : 'refresh roster'}
                  </button>
                  <button type="button" className="btn-danger" onClick={disconnect}>
                    sign out / switch account
                  </button>
                </div>
                <p className="hint">disconnects this account so you (or someone else) can sign in to a different Sleeper or ESPN league.</p>
              </div>
            </div>
          ) : (
            <p className="muted">no account connected. use the form below to sign in to Sleeper or connect an ESPN league.</p>
          )}
        </section>

        <section className="card glass">
          <div className="card-head">
            <div className="card-title">
              <UserCog size={14} />
              <span>{isConnected ? 'connect a different account' : 'sign in'}</span>
            </div>
          </div>
          <PlatformConnect defaultExpanded />
        </section>
      </div>

      <style jsx>{`
        .settings-stack {
          display: flex;
          flex-direction: column;
          gap: 18px;
          max-width: 760px;
        }
        .card {
          border-radius: 14px;
          padding: 18px 18px 20px;
          border: 1px solid var(--line);
        }
        .card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.18em;
          color: var(--ink-3);
          text-transform: uppercase;
        }
        .card-title :global(.ico-on) {
          color: hsl(140 70% 60%);
        }
        .card-title :global(.ico-off) {
          color: hsl(8 90% 70%);
        }
        .acct-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 24px;
        }
        .acct-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 6px 0;
          border-bottom: 1px dashed var(--line-2);
          gap: 12px;
        }
        .acct-k {
          font-family: var(--font-mono);
          font-size: 10.5px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-3);
        }
        .acct-v {
          font-size: 13.5px;
          color: var(--ink);
          font-weight: 500;
          text-align: right;
          word-break: break-word;
        }
        .acct-actions {
          grid-column: 1 / -1;
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .acct-btn-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--line);
          color: var(--ink-2);
          font-size: 12.5px;
          font-weight: 600;
          letter-spacing: 0.02em;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.12s, color 0.12s, border-color 0.12s;
        }
        .btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
          color: var(--ink);
          border-color: var(--line-2);
        }
        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-danger {
          padding: 8px 14px;
          background: rgba(255, 80, 60, 0.08);
          border: 1px solid rgba(255, 80, 60, 0.35);
          color: hsl(8 90% 75%);
          font-size: 12.5px;
          font-weight: 600;
          letter-spacing: 0.02em;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.12s, border-color 0.12s;
        }
        .btn-danger:hover {
          background: rgba(255, 80, 60, 0.16);
          border-color: rgba(255, 80, 60, 0.55);
        }
        .hint {
          font-size: 11.5px;
          color: var(--ink-3);
          margin: 0;
          line-height: 1.45;
        }
        .muted {
          color: var(--ink-3);
          font-size: 13px;
          margin: 0;
        }
        @media (max-width: 640px) {
          .acct-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </PageFrame>
  )
}
