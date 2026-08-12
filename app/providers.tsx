"use client"

import { LeagueProvider } from "@/lib/league-context"

export default function Providers({ children }: { children: React.ReactNode }) {
  return <LeagueProvider>{children}</LeagueProvider>
}
