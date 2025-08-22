'use client'

import { Home, List, PersonStanding, Trophy, TrendingUp, Users, Target, ChevronsLeft, ChevronsRight } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"
import { useState } from "react"
import { motion } from "framer-motion"

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 z-40 bg-slate-900 text-white p-4 hidden md:flex flex-col gap-4 border-r border-slate-800 overflow-y-auto transition-all duration-300",
        collapsed ? "w-16 items-center" : "w-64"
      )}
    >
      <div className="text-2xl font-bold mb-2">
        {!collapsed && "only W's"}
      </div>

      <Link
        href="/"
        className={clsx("flex items-center gap-2 p-2 rounded", {
          "bg-slate-800": pathname === "/"
        })}
        aria-label="Home"
      >
        <>
          <Home size={18} />
          {!collapsed && "home"}
        </>
      </Link>

      <Link
        href="/draftboard"
        className={clsx("flex items-center gap-2 p-2 rounded", {
          "bg-slate-800": pathname === "/draftboard"
        })}
        aria-label="Draftboard"
      >
        <>
          <List size={18} />
          {!collapsed && "draftboard"}
        </>
      </Link>

      <Link
        href="/players"
        className={clsx("flex items-center gap-2 p-2 rounded", {
          "bg-slate-800": pathname === "/players"
        })}
        aria-label="Players"
      >
        <>
          <PersonStanding size={18} />
          {!collapsed && "players"}
        </>
      </Link>

      <Link
        href="/draft-recap"
        className={clsx("flex items-center gap-2 p-2 rounded", {
          "bg-slate-800": pathname === "/draft-recap"
        })}
        aria-label="Draft Recap"
      >
        <>
          <Trophy size={18} />
          {!collapsed && "draft recap 🚧"}
        </>
      </Link>

      <Link
        href="/trade-analyzer"
        className={clsx("flex items-center gap-2 p-2 rounded", {
          "bg-slate-800": pathname === "/trade-analyzer"
        })}
        aria-label="Trade Analyzer"
      >
        <>
          <TrendingUp size={18} />
          {!collapsed && "trade analyzer 🚧"}
        </>
      </Link>

      <Link
        href="/waiver-wire"
        className={clsx("flex items-center gap-2 p-2 rounded", {
          "bg-slate-800": pathname === "/waiver-wire"
        })}
        aria-label="Waiver Wire"
      >
        <>
          <Users size={18} />
          {!collapsed && "waiver wire 🚧"}
        </>
      </Link>

      <Link
        href="/lineup-optimizer"
        className={clsx("flex items-center gap-2 p-2 rounded", {
          "bg-slate-800": pathname === "/lineup-optimizer"
        })}
        aria-label="Lineup Optimizer"
      >
        <>
          <Target size={18} />
          {!collapsed && "lineup optimizer 🚧"}
        </>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute bottom-20 left-1/2 transform -translate-x-1/2"
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.1 }}
          onClick={() => setCollapsed(!collapsed)}
          className="text-white p-1 rounded hover:bg-slate-800 transition"
          aria-label="Toggle Sidebar"
        >
          {collapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
        </motion.button>
      </motion.div>
    </aside>
  )
}