'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface CollapsibleSectionProps {
  title: string
  meta?: ReactNode
  /** When true, the meta and rule render as a normal section header on desktop. */
  children: ReactNode
  /** Default open state (only used on mobile, since desktop is always open). */
  defaultOpen?: boolean
}

/**
 * Section header that becomes a tap-to-toggle on mobile (≤768px) and a static
 * header on desktop. Avoids hydration mismatches by treating the initial
 * server-rendered state as "desktop / open" and updating to mobile after mount.
 */
export default function CollapsibleSection({
  title,
  meta,
  children,
  defaultOpen = true,
}: CollapsibleSectionProps) {
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Desktop / pre-mount: always open, plain header
  if (!mounted || !isMobile) {
    return (
      <div className="cs-wrap">
        <div className="section-h">
          <div className="title">{title}</div>
          {meta && <div className="meta">{meta}</div>}
          <div className="rule" />
        </div>
        {children}
      </div>
    )
  }

  // Mobile: tap-to-toggle, chevron visible
  return (
    <div className="cs-wrap">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="cs-toggle"
      >
        <span className="cs-title">{title}</span>
        {meta && <span className="cs-meta">{meta}</span>}
        <span className="cs-rule" />
        <span className={`cs-chev ${open ? 'cs-chev--open' : ''}`}>
          <ChevronDown size={14} />
        </span>
      </button>
      {open && <div className="cs-body">{children}</div>}

      <style jsx>{`
        .cs-wrap {
          width: 100%;
        }
        .cs-toggle {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 0 12px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: inherit;
          color: inherit;
          text-align: left;
        }
        .cs-title {
          font-family: var(--font-display);
          font-size: 22px;
          letter-spacing: 0.04em;
          line-height: 1;
          color: var(--ink);
        }
        .cs-meta {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-3);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 130px;
        }
        .cs-rule {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, var(--line) 0%, transparent 100%);
        }
        .cs-chev {
          color: var(--ink-3);
          transition: transform 0.2s ease, color 0.15s;
          display: grid;
          place-items: center;
        }
        .cs-chev--open {
          transform: rotate(180deg);
          color: var(--neon);
        }
        .cs-body {
          animation: cs-in 0.18s ease-out;
        }
        @keyframes cs-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
