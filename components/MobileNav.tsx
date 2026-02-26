'use client'

import { useState } from "react"
import { Home, List, PersonStanding, Trophy, TrendingUp, Users, Target, Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/draftboard", label: "Draftboard", icon: List },
  { href: "/players", label: "Players", icon: PersonStanding },
  { href: "/trade-analyzer", label: "Trade Analyzer", icon: TrendingUp },
  { href: "/waiver-wire", label: "Waiver Wire", icon: Users },
  { href: "/lineup-optimizer", label: "Lineup Optimizer", icon: Target },
  { href: "/draft-recap", label: "Draft Recap", icon: Trophy },
]

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const closeNav = () => setIsOpen(false)

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded-lg md:hidden"
        aria-label="Toggle navigation"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeNav}
        />
      )}

      {/* Mobile navigation */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white p-4 flex flex-col gap-1 border-r border-slate-800 overflow-y-auto transform transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="text-2xl font-bold mb-4 mt-12">Only W's</div>

        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-2.5 px-2 py-2 rounded text-sm transition-colors",
              pathname === href
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            )}
            onClick={closeNav}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </aside>
    </>
  )
}
