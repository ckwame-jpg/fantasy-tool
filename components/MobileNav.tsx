'use client'

import { useState } from "react"
import { Home, List, PersonStanding, Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const toggleNav = () => setIsOpen(!isOpen)
  const closeNav = () => setIsOpen(false)

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleNav}
        className="fixed top-4 left-4 z-50 p-2 bg-zinc-800 text-white rounded-lg md:hidden"
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
          "fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 text-white p-4 flex flex-col gap-4 border-r border-zinc-800 overflow-y-auto transform transition-transform duration-500 ease-in-out md:hidden",
          {
          "translate-x-0": isOpen,
          "-translate-x-full": !isOpen,
          }
        )}
      >
        <div className="text-2xl font-bold mb-2 mt-12">Only W's</div>

        <Link
          href="/"
          className={clsx("flex items-center gap-2 p-2 rounded transition-colors duration-300 group", {
            "bg-zinc-700": pathname === "/"
          })}
          onClick={closeNav}
        >
          <span className="transition-transform duration-300 group-hover:scale-110">
            <Home size={18} />
          </span>
          Home
        </Link>

        <Link
          href="/draftboard"
          className={clsx("flex items-center gap-2 p-2 rounded transition-colors duration-300 group", {
            "bg-zinc-700": pathname === "/draftboard"
          })}
          onClick={closeNav}
        >
          <span className="transition-transform duration-300 group-hover:scale-110">
            <List size={18} />
          </span>
          Draftboard
        </Link>

        <Link
          href="/players"
          className={clsx("flex items-center gap-2 p-2 rounded transition-colors duration-300 group", {
            "bg-zinc-700": pathname === "/players"
          })}
          onClick={closeNav}
        >
          <span className="transition-transform duration-300 group-hover:scale-110">
            <PersonStanding size={18} />
          </span>
          Players
        </Link>
      </aside>
    </>
  )
}
