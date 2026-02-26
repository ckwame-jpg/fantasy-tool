'use client'

import { Home, List, PersonStanding, Trophy, TrendingUp, Users, Target, ChevronsLeft, ChevronsRight } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"
import { useState } from "react"

const links = [
  { href: "/", label: "home", icon: Home },
  { href: "/draftboard", label: "draftboard", icon: List },
  { href: "/players", label: "players", icon: PersonStanding },
  { href: "/trade-analyzer", label: "trade analyzer", icon: TrendingUp },
  { href: "/waiver-wire", label: "waiver wire", icon: Users },
  { href: "/lineup-optimizer", label: "lineup optimizer", icon: Target },
  { href: "/draft-recap", label: "draft recap", icon: Trophy },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 z-40 bg-slate-900 text-white p-4 hidden md:flex flex-col border-r border-slate-800 overflow-y-auto transition-all duration-300",
        collapsed ? "w-16 items-center" : "w-64"
      )}
    >
      {/* Header with title + collapse toggle */}
      <div className={clsx("flex items-center mb-4", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && <div className="text-2xl font-bold">only W's</div>}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          aria-label="Toggle Sidebar"
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
      </div>

      {/* Navigation links */}
      <nav className="flex flex-col gap-1.5 flex-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors",
              pathname === href
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            )}
            aria-label={label}
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
