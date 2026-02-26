'use client'

import Link from "next/link"
import { List, PersonStanding, TrendingUp, Users, Target, Trophy } from "lucide-react"
import PlatformConnect from "@/components/PlatformConnect"
import { useLeague } from "@/lib/league-context"

const features = [
  {
    href: "/draftboard",
    icon: List,
    title: "Draftboard",
    description: "Mock draft with ADP rankings, positional tiers, and team builder.",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
  },
  {
    href: "/players",
    icon: PersonStanding,
    title: "Players",
    description: "Browse all NFL players with stats, projections, and detailed profiles.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    href: "/trade-analyzer",
    icon: TrendingUp,
    title: "Trade Analyzer",
    description: "VORP-based trade calculator with contender/rebuilder modes and lineup impact.",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    href: "/waiver-wire",
    icon: Users,
    title: "Waiver Wire",
    description: "Find available players ranked by priority with add/drop trends.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    href: "/lineup-optimizer",
    icon: Target,
    title: "Lineup Optimizer",
    description: "Optimize your weekly lineup with projected, ceiling, and floor strategies.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    href: "/draft-recap",
    icon: Trophy,
    title: "Draft Recap",
    description: "Post-draft analysis with grades, bye week distribution, and starting lineup.",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
  },
]

export default function HomePage() {
  const { isConnected, leagueName } = useLeague()

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Only W's Fantasy</h1>
          <p className="text-slate-400">
            Your all-in-one fantasy football toolkit. Connect your Sleeper or ESPN league to get started.
          </p>
        </div>

        {/* League connect */}
        <PlatformConnect />

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
          {features.map(({ href, icon: Icon, title, description, color, bg }) => (
            <Link
              key={href}
              href={href}
              className="group bg-slate-800/50 border border-slate-700 hover:border-slate-600 rounded-lg p-4 transition-colors"
            >
              <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
                <Icon size={20} className={color} />
              </div>
              <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                {title}
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
            </Link>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-[10px] text-slate-600 mt-8 text-center">
          built with Next.js, FastAPI, and Sleeper API
        </p>
      </div>
    </main>
  )
}
