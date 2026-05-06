'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Send, Sparkles, Trophy, Flame, Inbox } from 'lucide-react'
import { useLeague } from '@/lib/league-context'
import { useHomeData } from '@/hooks/useHomeData'
import { API_BASE_URL } from '@/constants'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Suggestion {
  cat: string
  q: string
  Icon: React.ComponentType<{ size?: number }>
}

const SUGGESTIONS: Suggestion[] = [
  {
    cat: 'start / sit',
    q: 'who should i start at flex this week — and why?',
    Icon: Sparkles,
  },
  {
    cat: 'trade grader',
    q: 'is there a trade i should propose right now? grade it for me.',
    Icon: Trophy,
  },
  {
    cat: 'waiver wire',
    q: 'sneaky waiver pickups for next week worth real FAAB?',
    Icon: Flame,
  },
  {
    cat: 'playoff math',
    q: "what's my path to the #1 seed?",
    Icon: Inbox,
  },
]

const QUICK_CHIPS: { q: string; label: string }[] = [
  { q: 'optimize my lineup for sunday', label: 'optimize lineup' },
  { q: "who's my biggest playoff threat?", label: 'playoff threats' },
  { q: 'should i drop anyone for waiver targets?', label: 'drop suggestion' },
  { q: 'give me trash talk for my opponent this week', label: 'roast my opponent' },
  { q: 'injury report for my roster', label: 'injury report' },
]

export default function AskGmPage() {
  const league = useLeague()
  const home = useHomeData()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const heroVisible = messages.length === 0

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  const send = async (questionOverride?: string) => {
    const question = (questionOverride ?? input).trim()
    if (!question || busy) return
    setBusy(true)
    setError(null)
    const nextMessages: Message[] = [...messages, { role: 'user', content: question }]
    setMessages(nextMessages)
    setInput('')
    if (taRef.current) taRef.current.style.height = 'auto'

    try {
      const res = await fetch(`${API_BASE_URL}/gm/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          league_id: league.leagueId || null,
          user_id: league.userId || null,
          roster_id: league.rosterId || null,
          week: home.week,
          question,
          history: messages.slice(-8),
        }),
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(detail?.detail || `HTTP ${res.status}`)
      }
      const payload = await res.json()
      setMessages([...nextMessages, { role: 'assistant', content: payload.answer || '' }])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'request failed'
      setError(msg)
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content:
            "i can't reach the model right now. " +
            (msg.toLowerCase().includes('openai_api_key')
              ? 'the backend is missing OPENAI_API_KEY — set it and restart.'
              : msg),
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }

  const ctxCards = useMemo(() => {
    const seedLabel = home.myStanding ? `#${home.myStanding}` : '—'
    return [
      {
        title: league.leagueName || 'your team',
        rows: [
          { lbl: 'record', val: `${home.myRecord.wins}-${home.myRecord.losses}` },
          { lbl: 'points for', val: home.myRecord.pf.toFixed(1) },
          { lbl: 'standing', val: seedLabel },
          { lbl: 'week', val: `${home.week}` },
        ],
      },
      {
        title: 'this week',
        rows: [
          {
            lbl: 'matchup pts',
            val: `${(home.myMatchup?.points ?? 0).toFixed(1)} – ${(home.oppMatchup?.points ?? 0).toFixed(1)}`,
          },
          { lbl: 'win prob', val: `${Math.round(home.winProb * 100)}%` },
          { lbl: 'opponent', val: home.opponentName || '—' },
        ],
      },
    ]
  }, [home, league.leagueName])

  return (
    <>
      <div className="gm-layout">
        <section className="gm-chat">
          <div className="chat-stream custom-scrollbar" ref={streamRef}>
            <div className="chat-inner">
              {heroVisible ? (
                <div className="gm-hero">
                  <div className="badge">
                    <span className="d" />
                    your gm · always reading the slate
                  </div>
                  <h1>
                    start, sit, trade.
                    <br />
                    <span className="neon">just ask.</span>
                  </h1>
                  <p>
                    your gm has eyes on your roster, the waiver pool, every league move, and the latest projections. ask
                    anything — start/sit calls, waiver targets, trade grades, even what to say in #trash-talk.
                  </p>
                  <div className="suggestions">
                    {SUGGESTIONS.map((s) => {
                      const Icon = s.Icon
                      return (
                        <button key={s.q} type="button" className="sg" onClick={() => send(s.q)}>
                          <span className="sg-cat">
                            <Icon size={11} />
                            {s.cat}
                          </span>
                          <span className="q">{s.q}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="msg-list">
                  {messages.map((m, i) => (
                    <div key={i} className={`msg ${m.role}`}>
                      <div className="av">{m.role === 'user' ? (league.username?.[0] || 'M').toUpperCase() : 'G'}</div>
                      <div className="bubble">
                        <div className="role">{m.role === 'user' ? 'you' : 'your gm'}</div>
                        <div className="body">
                          {m.content.split('\n').map((line, idx) => (
                            <p key={idx}>{line}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {busy && (
                    <div className="msg assistant">
                      <div className="av">G</div>
                      <div className="bubble">
                        <div className="role">your gm</div>
                        <div className="body typing">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    </div>
                  )}
                  {error && !busy && <div className="error-row">{error}</div>}
                </div>
              )}
            </div>
          </div>

          <div className="composer-wrap">
            <div className="composer">
              <div className="quick-chips">
                {QUICK_CHIPS.map((c) => (
                  <button key={c.q} type="button" className="quick-chip" onClick={() => send(c.q)} disabled={busy}>
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="composer-box">
                <textarea
                  ref={taRef}
                  value={input}
                  onChange={onChange}
                  onKeyDown={handleKey}
                  rows={1}
                  placeholder="ask the gm anything…"
                />
                <div className="composer-actions">
                  <button
                    type="button"
                    className="send-btn"
                    onClick={() => send()}
                    disabled={busy || !input.trim()}
                    aria-label="send"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
              <div className="composer-hint">
                press <kbd>enter</kbd> to send · <kbd>shift+enter</kbd> for newline
              </div>
            </div>
          </div>
        </section>

        <aside className="gm-context">
          <div className="ctx-h">your context</div>
          {ctxCards.map((card) => (
            <div className="ctx-card" key={card.title}>
              <div className="ttl">{card.title}</div>
              {card.rows.map((row) => (
                <div className="ctx-row" key={row.lbl}>
                  <span className="lbl">{row.lbl}</span>
                  <b>{row.val}</b>
                </div>
              ))}
            </div>
          ))}
          <div className="ctx-h" style={{ marginTop: 18 }}>
            quick prompts
          </div>
          <div className="threads">
            {SUGGESTIONS.map((s) => (
              <button type="button" key={s.q} className="thread" onClick={() => send(s.q)} disabled={busy}>
                <div className="t-q">{s.q}</div>
                <div className="t-time">{s.cat}</div>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <style jsx>{`
        .gm-layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          height: 100vh;
          min-height: 0;
        }
        @media (max-width: 1100px) {
          .gm-layout {
            grid-template-columns: 1fr;
          }
          .gm-context {
            display: none;
          }
        }

        .gm-chat {
          display: grid;
          grid-template-rows: 1fr auto;
          min-height: 0;
          position: relative;
        }
        .chat-stream {
          overflow-y: auto;
          padding: 36px 0 24px;
        }
        .chat-inner {
          max-width: 760px;
          margin: 0 auto;
          padding: 0 28px;
        }

        .gm-hero {
          margin: 32px 0 28px;
        }
        .gm-hero .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 11px;
          border-radius: 999px;
          background: rgba(115, 110, 245, 0.1);
          border: 1px solid rgba(115, 110, 245, 0.3);
          font-family: var(--font-mono);
          font-size: 10.5px;
          letter-spacing: 0.18em;
          color: hsl(245 80% 82%);
          text-transform: uppercase;
        }
        .gm-hero .badge .d {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--neon);
          box-shadow: 0 0 6px var(--neon);
          animation: pulse 1.6s ease-in-out infinite;
        }
        .gm-hero h1 {
          font-family: var(--font-display);
          font-size: 56px;
          line-height: 0.95;
          letter-spacing: 0.02em;
          margin: 18px 0 8px;
          color: var(--ink);
        }
        .gm-hero h1 .neon {
          color: var(--neon);
        }
        .gm-hero p {
          font-size: 15px;
          color: var(--ink-2);
          line-height: 1.55;
          max-width: 540px;
          margin: 0;
        }
        .suggestions {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-top: 26px;
        }
        @media (max-width: 720px) {
          .suggestions {
            grid-template-columns: 1fr;
          }
          .gm-hero h1 {
            font-size: 40px;
          }
        }
        .sg {
          text-align: left;
          padding: 14px 16px;
          background: rgba(8, 16, 12, 0.6);
          border: 1px solid var(--line);
          border-radius: 12px;
          color: var(--ink);
          cursor: pointer;
          transition: border-color 0.15s, transform 0.15s, background 0.15s;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-family: inherit;
        }
        .sg:hover {
          border-color: rgba(115, 110, 245, 0.4);
          background: rgba(115, 110, 245, 0.04);
          transform: translateY(-1px);
        }
        .sg-cat {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono);
          font-size: 9.5px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--neon);
        }
        .sg .q {
          font-size: 14px;
          font-weight: 500;
          line-height: 1.4;
        }

        .msg-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .msg {
          display: flex;
          gap: 14px;
          margin-bottom: 22px;
          align-items: flex-start;
        }
        .msg.user {
          flex-direction: row-reverse;
        }
        .msg .av {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          font-family: var(--font-display);
          font-size: 14px;
        }
        .msg.assistant .av {
          background: linear-gradient(135deg, var(--neon), var(--neon-dim));
          color: hsl(250 60% 6%);
          box-shadow: 0 0 12px rgba(115, 110, 245, 0.3);
        }
        .msg.user .av {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid var(--line);
          color: var(--ink-2);
        }
        .msg .bubble {
          max-width: 88%;
        }
        .msg .role {
          font-family: var(--font-mono);
          font-size: 9.5px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ink-3);
          margin-bottom: 6px;
        }
        .msg.assistant .role {
          color: var(--neon);
        }
        .msg.user .role {
          text-align: right;
        }
        .msg .body {
          font-size: 14.5px;
          line-height: 1.6;
          color: var(--ink);
        }
        .msg.user .body {
          background: rgba(115, 110, 245, 0.06);
          border: 1px solid rgba(115, 110, 245, 0.18);
          padding: 10px 14px;
          border-radius: 12px 12px 4px 12px;
        }
        .msg .body :global(p) {
          margin: 0 0 10px;
        }
        .msg .body :global(p:last-child) {
          margin-bottom: 0;
        }

        .typing {
          display: inline-flex;
          gap: 4px;
        }
        .typing span {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--neon);
          animation: typingDot 1.2s ease-in-out infinite;
        }
        .typing span:nth-child(2) {
          animation-delay: 0.15s;
        }
        .typing span:nth-child(3) {
          animation-delay: 0.3s;
        }
        @keyframes typingDot {
          0%,
          60%,
          100% {
            opacity: 0.3;
            transform: translateY(0);
          }
          30% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }
        .error-row {
          color: var(--hot);
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.06em;
          padding: 8px 12px;
          border: 1px solid rgba(255, 80, 60, 0.25);
          border-radius: 6px;
          background: rgba(255, 80, 60, 0.04);
        }

        .composer-wrap {
          padding: 16px 28px 22px;
          border-top: 1px solid var(--line-2);
          background: rgba(10, 10, 24, 0.7);
          backdrop-filter: blur(14px);
        }
        .composer {
          max-width: 760px;
          margin: 0 auto;
        }
        .quick-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 10px;
        }
        .quick-chip {
          padding: 5px 11px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--line);
          color: var(--ink-2);
          font-family: var(--font-sans);
          font-size: 11px;
          cursor: pointer;
        }
        .quick-chip:hover {
          color: var(--ink);
          border-color: rgba(115, 110, 245, 0.45);
        }
        .quick-chip:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .composer-box {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          background: rgba(8, 16, 12, 0.6);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 10px 12px;
          transition: border-color 0.15s;
        }
        .composer-box:focus-within {
          border-color: rgba(115, 110, 245, 0.45);
        }
        .composer-box textarea {
          flex: 1;
          resize: none;
          background: transparent;
          border: none;
          outline: none;
          color: var(--ink);
          font-family: inherit;
          font-size: 14px;
          line-height: 1.5;
          padding: 4px 4px;
          min-height: 24px;
          max-height: 200px;
        }
        .composer-box textarea::placeholder {
          color: var(--ink-3);
        }
        .composer-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .send-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--neon), var(--neon-dim));
          color: hsl(250 60% 6%);
          border: none;
          cursor: pointer;
          display: grid;
          place-items: center;
          box-shadow: 0 4px 14px rgba(115, 110, 245, 0.3);
          transition: transform 0.1s;
        }
        .send-btn:hover {
          transform: translateY(-1px);
        }
        .send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }
        .composer-hint {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--ink-3);
          letter-spacing: 0.06em;
          margin-top: 8px;
          text-align: center;
        }
        .composer-hint :global(kbd) {
          background: var(--line);
          padding: 1px 5px;
          border-radius: 3px;
          font-family: var(--font-mono);
          font-size: 9.5px;
          color: var(--ink-2);
        }

        .gm-context {
          border-left: 1px solid var(--line);
          background: rgba(6, 12, 9, 0.4);
          padding: 22px 20px;
          overflow-y: auto;
        }
        .ctx-h {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--ink-3);
          margin-bottom: 10px;
        }
        .ctx-card {
          border: 1px solid var(--line);
          border-radius: 12px;
          background: rgba(8, 16, 12, 0.5);
          padding: 14px;
          margin-bottom: 12px;
        }
        .ctx-card .ttl {
          font-family: var(--font-display);
          font-size: 16px;
          letter-spacing: 0.04em;
          line-height: 1;
          margin-bottom: 8px;
          color: var(--ink);
        }
        .ctx-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--ink-2);
          border-top: 1px dashed var(--line-2);
        }
        .ctx-row:first-of-type {
          border-top: none;
        }
        .ctx-row .lbl {
          color: var(--ink-3);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-size: 9.5px;
        }
        .ctx-row :global(b) {
          font-weight: 600;
          color: var(--ink);
        }

        .threads {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .thread {
          padding: 9px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid transparent;
          cursor: pointer;
          transition: border-color 0.12s, background 0.12s;
          text-align: left;
          color: inherit;
          font-family: inherit;
        }
        .thread:hover {
          border-color: var(--line);
          background: rgba(255, 255, 255, 0.04);
        }
        .thread:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .thread .t-q {
          font-size: 12.5px;
          line-height: 1.4;
          color: var(--ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .thread .t-time {
          font-family: var(--font-mono);
          font-size: 9.5px;
          color: var(--ink-3);
          letter-spacing: 0.06em;
          margin-top: 2px;
          text-transform: uppercase;
        }
      `}</style>
    </>
  )
}
