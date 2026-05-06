'use client'

import {
  Home,
  Sparkles,
  Globe2,
  ListOrdered,
  ArrowLeftRight,
  UserRound,
  Target,
  TrendingUp,
  Users,
  PersonStanding,
  LineChart,
  List as ListIcon,
  Trophy,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import clsx from 'clsx'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number }>
  emphasis?: 'gm'
}

const ITEMS: NavItem[] = [
  { href: '/', label: 'home', icon: Home },
  { href: '/ask-gm', label: 'ask the GM', icon: Sparkles, emphasis: 'gm' },
  { href: '/matchups', label: 'matchups', icon: Globe2 },
  { href: '/standings', label: 'standings', icon: ListOrdered },
  { href: '/transactions', label: 'transactions', icon: ArrowLeftRight },
  { href: '/roster', label: 'my roster', icon: UserRound },
  { href: '/lineup-optimizer', label: 'lineup', icon: Target },
  { href: '/trade-analyzer', label: 'trades', icon: TrendingUp },
  { href: '/waiver-wire', label: 'waivers', icon: Users },
  { href: '/players', label: 'players', icon: PersonStanding },
  { href: '/projections', label: 'projections', icon: LineChart },
  { href: '/draftboard', label: 'draftboard', icon: ListIcon },
  { href: '/draft-recap', label: 'recap', icon: Trophy },
]

export default function MobileBottomNav() {
  const pathname = usePathname()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLAnchorElement>(null)

  // Auto-scroll the active pill into view on route change.
  useEffect(() => {
    const node = activeRef.current
    if (!node) return
    node.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [pathname])

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname?.startsWith(href))

  return (
    <nav className="m-bottom-nav md:hidden" aria-label="Primary">
      <div className="m-strip" ref={scrollerRef}>
        {ITEMS.map((item, i) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <span key={item.href} className="m-cell">
              {i > 0 && <span className="m-sep" aria-hidden />}
              <Link
                href={item.href}
                ref={active ? activeRef : undefined}
                className={clsx(
                  'm-pill',
                  active && 'm-pill--active',
                  item.emphasis === 'gm' && 'm-pill--gm',
                )}
              >
                <span className={clsx('m-dot', active && 'm-dot--active')} />
                <Icon size={13} />
                <span className="m-lbl">{item.label}</span>
              </Link>
            </span>
          )
        })}
      </div>

      <style jsx>{`
        .m-bottom-nav {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 40;
          background: hsl(var(--color-cosmos-ink-700-hsl) / 0.92);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-top: 1px solid var(--surface-border);
          box-shadow: 0 -8px 24px -16px rgba(0, 0, 0, 0.5);
          padding: 8px 0 calc(env(safe-area-inset-bottom) + 8px);
        }
        /* Belt-and-suspenders: hide on >= md screens regardless of Tailwind state. */
        @media (min-width: 768px) {
          .m-bottom-nav {
            display: none !important;
          }
        }
        .m-strip {
          display: flex;
          align-items: center;
          gap: 0;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 0 14px;
          scroll-snap-type: x proximity;
          /* hide scrollbar */
          scrollbar-width: none;
          -ms-overflow-style: none;
          /* fade edges so it reads as a scrollable rail */
          -webkit-mask: linear-gradient(90deg, transparent 0, black 16px, black calc(100% - 16px), transparent 100%);
          mask: linear-gradient(90deg, transparent 0, black 16px, black calc(100% - 16px), transparent 100%);
        }
        .m-strip::-webkit-scrollbar {
          display: none;
        }
        .m-cell {
          display: inline-flex;
          align-items: center;
          flex: 0 0 auto;
        }
        .m-sep {
          width: 14px;
          height: 14px;
          display: inline-grid;
          place-items: center;
          flex-shrink: 0;
        }
        .m-sep::before {
          content: '';
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: var(--line);
        }
        :global(.m-pill) {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px;
          border-radius: 999px;
          background: hsl(var(--color-cosmos-surface-hsl) / 0.55);
          border: 1px solid var(--surface-border);
          color: var(--ink-2);
          font-family: var(--font-sans);
          font-size: 12.5px;
          font-weight: 500;
          letter-spacing: 0.01em;
          white-space: nowrap;
          text-decoration: none;
          scroll-snap-align: center;
          transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.15s;
        }
        :global(.m-pill:hover) {
          color: var(--ink);
          border-color: hsl(var(--color-cosmos-violet-500-hsl) / 0.4);
        }
        :global(.m-pill--active) {
          background: linear-gradient(135deg, hsl(var(--color-cosmos-violet-500-hsl) / 0.2), hsl(var(--color-cosmos-violet-700-hsl) / 0.32));
          border-color: var(--color-cosmos-violet-hairline);
          color: var(--color-cosmos-violet-300);
          box-shadow: 0 0 0 1px hsl(var(--color-cosmos-violet-500-hsl) / 0.18) inset,
            0 6px 20px -8px hsl(var(--color-cosmos-violet-500-hsl) / 0.6);
        }
        :global(.m-pill--gm) {
          background: linear-gradient(135deg, hsl(var(--color-cosmos-violet-500-hsl) / 0.16), transparent);
          border-style: dashed;
          border-color: hsl(var(--color-cosmos-violet-500-hsl) / 0.45);
          color: var(--color-cosmos-violet-300);
        }
        :global(.m-pill--gm.m-pill--active) {
          border-style: solid;
        }
        :global(.m-dot) {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--ink-3);
          flex-shrink: 0;
        }
        :global(.m-dot--active) {
          background: var(--neon);
          box-shadow: 0 0 6px var(--neon);
        }
        :global(.m-pill .m-lbl) {
          font-size: 12.5px;
          line-height: 1;
        }
        :global(.m-pill svg) {
          opacity: 0.85;
        }
        :global(.m-pill--active svg) {
          opacity: 1;
        }
      `}</style>
    </nav>
  )
}
