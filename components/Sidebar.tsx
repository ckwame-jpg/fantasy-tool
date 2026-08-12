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
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { useLeague } from '@/lib/league-context'
import BrandOrb from './BrandOrb'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: { text: string; tone?: 'neon' | 'hot' }
  emphasis?: 'gm'
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const groups: NavGroup[] = [
  {
    items: [
      { href: '/', label: 'home', icon: Home },
      { href: '/ask-gm', label: 'ask the GM', icon: Sparkles, emphasis: 'gm' },
    ],
  },
  {
    label: 'league',
    items: [
      { href: '/matchups', label: 'matchups', icon: Globe2, badge: { text: 'live', tone: 'neon' } },
      { href: '/standings', label: 'standings', icon: ListOrdered },
      { href: '/transactions', label: 'transactions', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'my team',
    items: [
      { href: '/roster', label: 'my roster', icon: UserRound },
      { href: '/lineup-optimizer', label: 'lineup optimizer', icon: Target },
      { href: '/trade-analyzer', label: 'trade analyzer', icon: TrendingUp },
      { href: '/waiver-wire', label: 'waiver wire', icon: Users },
    ],
  },
  {
    label: 'research',
    items: [
      { href: '/players', label: 'players', icon: PersonStanding },
      { href: '/projections', label: 'projections', icon: LineChart },
      { href: '/draftboard', label: 'draftboard', icon: ListIcon },
      { href: '/draft-recap', label: 'draft recap', icon: Trophy },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { isConnected, leagueName, username } = useLeague()
  const initial = (username || 'W').charAt(0).toUpperCase()
  const teamLabel = isConnected ? leagueName || 'connected' : 'not connected'

  return (
    <aside className="side hidden md:flex">
      <div className="side-brand">
        <BrandOrb size={32} />
        <div>
          <div className="brand-name">RN</div>
          <div className="brand-sub">command center</div>
        </div>
      </div>

      <nav className="nav">
        {groups.map((group, gi) => (
          <div key={gi} className="nav-group">
            {group.label && <div className="nav-label">{group.label}</div>}
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive =
                pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'nav-item',
                    item.emphasis === 'gm' && 'nav-item--gm',
                    isActive && 'nav-item--active',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="ico">
                    <Icon size={16} />
                  </span>
                  <span className="lbl">{item.label}</span>
                  {item.emphasis === 'gm' && <span className="gm-pulse" aria-hidden />}
                  {item.badge && (
                    <span className={clsx('badge', item.badge.tone === 'hot' && 'badge--hot')}>
                      {item.badge.text}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <Link
        href="/settings"
        className={clsx('side-foot', pathname === '/settings' && 'side-foot--active')}
        aria-current={pathname === '/settings' ? 'page' : undefined}
        title={isConnected ? 'account & settings' : 'sign in'}
      >
        <div className="avatar">{initial}</div>
        <div className="me-meta">
          <div className="me-name">{username || 'sign in'}</div>
          <div className="me-team">{teamLabel}</div>
        </div>
        <ChevronRight size={14} className="me-chev" />
      </Link>

      <style jsx>{`
        .side {
          position: fixed;
          top: 0;
          left: 0;
          width: var(--sidebar-w);
          height: 100vh;
          z-index: 40;
          flex-direction: column;
          border-right: 1px solid var(--line);
          background: linear-gradient(180deg, rgba(20, 18, 40, 0.6), rgba(8, 10, 22, 0.85));
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          padding: 22px 0 18px;
        }
        .side-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 22px 22px;
          border-bottom: 1px solid var(--line-2);
        }
        .brand-name {
          font-family: var(--font-display);
          font-size: 22px;
          letter-spacing: 0.04em;
          line-height: 1;
          color: var(--ink);
        }
        .brand-sub {
          font-family: var(--font-mono);
          font-size: 9.5px;
          letter-spacing: 0.18em;
          color: var(--ink-3);
          margin-top: 3px;
          text-transform: uppercase;
        }
        .nav {
          display: flex;
          flex-direction: column;
          padding: 8px 12px 6px;
          flex: 1;
          overflow-y: auto;
          gap: 0;
        }
        .nav-group {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .nav-label {
          font-family: var(--font-mono);
          font-size: 9.5px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--ink-3);
          padding: 16px 10px 6px;
        }
        :global(.nav-item) {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 9px 12px;
          border-radius: 8px;
          color: var(--ink-2);
          font-size: 13.5px;
          font-weight: 500;
          transition: background 0.12s, color 0.12s;
          position: relative;
          cursor: pointer;
        }
        :global(.nav-item:hover) {
          background: rgba(255, 255, 255, 0.03);
          color: var(--ink);
        }
        :global(.nav-item .ico) {
          width: 16px;
          height: 16px;
          display: grid;
          place-items: center;
          color: var(--ink-3);
          flex-shrink: 0;
        }
        :global(.nav-item:hover .ico),
        :global(.nav-item--active .ico) {
          color: var(--neon);
        }
        :global(.nav-item--active) {
          background: linear-gradient(90deg, rgba(115, 110, 245, 0.18), rgba(115, 110, 245, 0.04));
          color: var(--ink);
        }
        :global(.nav-item--active::before) {
          content: '';
          position: absolute;
          left: 0;
          top: 8px;
          bottom: 8px;
          width: 2px;
          background: var(--neon);
          border-radius: 0 2px 2px 0;
          box-shadow: 0 0 8px var(--neon);
        }
        :global(.nav-item--gm) {
          background: linear-gradient(90deg, rgba(115, 110, 245, 0.08), transparent);
          border: 1px dashed rgba(115, 110, 245, 0.3);
          margin: 4px 0;
        }
        :global(.nav-item--gm.nav-item--active) {
          background: linear-gradient(90deg, rgba(115, 110, 245, 0.18), rgba(115, 110, 245, 0.04));
          border-color: rgba(115, 110, 245, 0.5);
        }
        :global(.nav-item .gm-pulse) {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--neon);
          box-shadow: 0 0 8px var(--neon);
          margin-left: auto;
          animation: pulse 1.6s ease-in-out infinite;
        }
        :global(.nav-item .badge) {
          margin-left: auto;
          font-family: var(--font-mono);
          font-size: 9.5px;
          font-weight: 600;
          letter-spacing: 0.06em;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(115, 110, 245, 0.18);
          color: var(--neon);
          text-transform: uppercase;
        }
        :global(.nav-item .badge--hot) {
          background: rgba(255, 80, 60, 0.16);
          color: hsl(8 90% 70%);
        }
        :global(.side-foot) {
          padding: 14px 14px 14px;
          border-top: 1px solid var(--line-2);
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          color: inherit;
          text-decoration: none;
          transition: background 0.12s;
          position: relative;
        }
        :global(.side-foot:hover) {
          background: rgba(255, 255, 255, 0.04);
        }
        :global(.side-foot--active) {
          background: linear-gradient(90deg, rgba(115, 110, 245, 0.18), rgba(115, 110, 245, 0.04));
        }
        :global(.side-foot--active::before) {
          content: '';
          position: absolute;
          left: 0;
          top: 12px;
          bottom: 12px;
          width: 2px;
          background: var(--neon);
          border-radius: 0 2px 2px 0;
          box-shadow: 0 0 8px var(--neon);
        }
        :global(.side-foot .me-chev) {
          margin-left: auto;
          color: var(--ink-3);
          flex-shrink: 0;
          transition: color 0.12s, transform 0.12s;
        }
        :global(.side-foot:hover .me-chev),
        :global(.side-foot--active .me-chev) {
          color: var(--neon);
        }
        :global(.side-foot:hover .me-chev) {
          transform: translateX(2px);
        }
        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          background: linear-gradient(135deg, hsl(262 60% 36%), hsl(262 70% 22%));
          display: grid;
          place-items: center;
          font-family: var(--font-display);
          font-size: 15px;
          color: var(--ink);
          border: 1px solid rgba(115, 110, 245, 0.45);
        }
        .me-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .me-name {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--ink);
          text-transform: lowercase;
        }
        .me-team {
          font-family: var(--font-quicksand), system-ui, sans-serif;
          font-size: 11px;
          font-weight: 500;
          color: var(--ink-3);
          letter-spacing: 0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 160px;
        }
      `}</style>
    </aside>
  )
}
