"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import type { Player } from "@/types"
import { X } from "lucide-react"

type ExtendedPlayer = Player & {
  fantasyPoints?: number
  rushAtt?: number
  receptions?: number
  targets?: number
  passAtt?: number
  passCmp?: number
  rushYds?: number
  rushTD?: number
  recYds?: number
  recTD?: number
  passYds?: number
  passTD?: number
  adp?: number
  posRank?: number
}

interface PlayerDetailModalProps {
  player: ExtendedPlayer | null
  onClose: () => void
  onDraft?: (player: ExtendedPlayer) => void
  isDrafted?: boolean
}

function formatHeight(inches: string | number | undefined): string {
  if (inches === undefined || inches === null) return "-"
  const total = typeof inches === "string" ? parseInt(inches, 10) : inches
  if (isNaN(total) || total <= 0) return "-"
  const ft = Math.floor(total / 12)
  const inn = total % 12
  return `${ft}'${inn}"`
}

function formatExp(years: number | undefined): string {
  if (years === undefined || years === null) return "-"
  if (years === 0) return "rookie"
  return `${years} yr${years > 1 ? "s" : ""}`
}

function StatRow({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-800 last:border-0">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className="text-white text-sm font-medium tabular-nums">{value ?? "-"}</span>
    </div>
  )
}

export default function PlayerDetailModal({ player, onClose, onDraft, isDrafted }: PlayerDetailModalProps) {
  const [imgError, setImgError] = useState(false)

  // Reset image error when player changes
  useEffect(() => {
    setImgError(false)
  }, [player?.id])

  // Escape key handler
  useEffect(() => {
    if (!player) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [player, onClose])

  // Body scroll lock
  useEffect(() => {
    if (player) {
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = "" }
    }
  }, [player])

  function getStats(p: ExtendedPlayer) {
    const pos = p.position?.toUpperCase()
    if (pos === "QB") {
      return [
        { label: "pass yds", value: p.passYds },
        { label: "pass td", value: p.passTD },
        { label: "comp / att", value: p.passCmp != null && p.passAtt != null ? `${p.passCmp} / ${p.passAtt}` : "-" },
        { label: "rush yds", value: p.rushYds },
        { label: "rush td", value: p.rushTD },
        { label: "int", value: (p as any).interceptions },
        { label: "fumbles", value: (p as any).fumbles },
      ]
    }
    if (pos === "RB") {
      return [
        { label: "rush att", value: p.rushAtt },
        { label: "rush yds", value: p.rushYds },
        { label: "rush td", value: p.rushTD },
        { label: "targets", value: p.targets },
        { label: "receptions", value: p.receptions },
        { label: "rec yds", value: p.recYds },
        { label: "rec td", value: p.recTD },
        { label: "fumbles", value: (p as any).fumbles },
      ]
    }
    // WR, TE
    return [
      { label: "targets", value: p.targets },
      { label: "receptions", value: p.receptions },
      { label: "rec yds", value: p.recYds },
      { label: "rec td", value: p.recTD },
      { label: "rush att", value: p.rushAtt },
      { label: "rush yds", value: p.rushYds },
      { label: "rush td", value: p.rushTD },
    ]
  }

  return (
    <AnimatePresence>
      {player && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[420px] max-w-full bg-slate-900 border-l border-slate-700 z-50 overflow-y-auto"
          >
            <div className="p-6">
              {/* Close button */}
              <motion.button
                onClick={onClose}
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </motion.button>

              {/* Header: Photo + Name */}
              <div className="flex items-center gap-4 mb-6">
                {!imgError ? (
                  <Image
                    src={`https://sleepercdn.com/content/nfl/players/thumb/${player.id}.jpg`}
                    alt={player.name}
                    width={80}
                    height={80}
                    className="rounded-full object-cover bg-slate-800"
                    onError={() => setImgError(true)}
                    unoptimized
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 text-2xl font-bold">
                    {player.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-white">{player.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="pos-pill" data-p={(player.position || "").toUpperCase()} style={{ width: 'auto', padding: '2px 8px', height: 22 }}>
                      {player.position}
                    </span>
                    <span className="text-slate-400 text-sm">
                      {player.team || "TBD"}
                      {player.number != null && ` #${player.number}`}
                    </span>
                  </div>
                  {player.injury_status && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                      {player.injury_status}
                    </span>
                  )}
                </div>
              </div>

              {/* Bio grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: "age", value: player.age ?? "-" },
                  { label: "height", value: formatHeight(player.height) },
                  { label: "weight", value: player.weight ? `${player.weight} lbs` : "-" },
                  { label: "exp", value: formatExp(player.years_exp) },
                  { label: "college", value: player.college || "-" },
                ].map((item) => (
                  <div key={item.label} className={`bg-slate-800 rounded-lg p-2.5 text-center ${item.label === "college" ? "col-span-2" : ""}`}>
                    <div className="text-[10px] uppercase text-slate-500 mb-0.5">{item.label}</div>
                    <div className="text-sm font-medium text-white truncate">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Rankings */}
              <div className="flex gap-2 mb-6">
                {player.posRank != null && (
                  <div className="bg-slate-800 rounded-lg px-3 py-2 text-center flex-1">
                    <div className="text-lg font-bold text-white">#{player.posRank}</div>
                    <div className="text-[10px] uppercase text-slate-500">{player.position}</div>
                  </div>
                )}
                {player.rank != null && player.rank > 0 && (
                  <div className="bg-slate-800 rounded-lg px-3 py-2 text-center flex-1">
                    <div className="text-lg font-bold text-white">#{player.rank}</div>
                    <div className="text-[10px] uppercase text-slate-500">overall</div>
                  </div>
                )}
                {player.adp != null && (
                  <div className="bg-slate-800 rounded-lg px-3 py-2 text-center flex-1">
                    <div className="text-lg font-bold text-white">{player.adp}</div>
                    <div className="text-[10px] uppercase text-slate-500">adp</div>
                  </div>
                )}
              </div>

              {/* Season stats */}
              <div className="mb-6">
                <h3 className="text-xs uppercase text-slate-500 mb-2">2025 season stats</h3>
                <div className="bg-slate-800 rounded-lg p-4">
                  {/* Fantasy points highlight */}
                  <div className="flex justify-between py-2 mb-2 border-b border-slate-700">
                    <span className="text-cyan-400 font-semibold text-sm">fantasy pts</span>
                    <span className="text-cyan-400 font-bold text-lg tabular-nums">
                      {player.fantasyPoints?.toFixed(1) ?? "-"}
                    </span>
                  </div>
                  {getStats(player).map((s) => (
                    <StatRow key={s.label} label={s.label} value={s.value} />
                  ))}
                </div>
              </div>

              {/* Draft button */}
              {onDraft && (
                <button
                  onClick={() => {
                    if (!isDrafted) {
                      onDraft(player)
                      onClose()
                    }
                  }}
                  disabled={isDrafted}
                  className={`w-full py-4 rounded-lg font-semibold text-base transition-colors ${
                    isDrafted
                      ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white"
                  }`}
                >
                  {isDrafted ? "drafted" : "draft player"}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
