'use client'

import { Home, List, PersonStanding, Trophy, TrendingUp, Users, Target } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-zinc-900 text-white p-4 hidden md:flex flex-col gap-4 border-r border-zinc-800 overflow-y-auto">
      <div className="text-2xl font-bold mb-2">Only W's</div>

      <Link
        href="/"
        className={clsx("flex items-center gap-2 p-2 rounded", {
          "bg-zinc-700": pathname === "/"
        })}
      >
        <Home size={18} /> Home
      </Link>

      <Link
        href="/draftboard"
        className={clsx("flex items-center gap-2 p-2 rounded", {
          "bg-zinc-700": pathname === "/draftboard"
        })}
      >
        <List size={18} /> Draftboard
      </Link>

      <Link
        href="/players"
        className={clsx("flex items-center gap-2 p-2 rounded", {
          "bg-zinc-700": pathname === "/players"
        })}
      >
        <PersonStanding size={18} /> Players
      </Link>

      <Link
        href="/draft-recap"
        className={clsx("flex items-center gap-2 p-2 rounded", {
          "bg-zinc-700": pathname === "/draft-recap"
        })}
      >
        <Trophy size={18} /> Draft Recap
      </Link>

      <Link
        href="/trade-analyzer"
        className={clsx("flex items-center gap-2 p-2 rounded", {
          "bg-zinc-700": pathname === "/trade-analyzer"
        })}
      >
        <TrendingUp size={18} /> Trade Analyzer
      </Link>

      <Link
        href="/waiver-wire"
        className={clsx("flex items-center gap-2 p-2 rounded", {
          "bg-zinc-700": pathname === "/waiver-wire"
        })}
      >
        <Users size={18} /> Waiver Wire
      </Link>

      <Link
        href="/lineup-optimizer"
        className={clsx("flex items-center gap-2 p-2 rounded", {
          "bg-zinc-700": pathname === "/lineup-optimizer"
        })}
      >
        <Target size={18} /> Lineup Optimizer
      </Link>
    </aside>
  )
}