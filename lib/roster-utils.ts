/** Which player positions can fill each slot type */
export const SLOT_ELIGIBLE: Record<string, string[]> = {
  QB: ["QB"],
  RB: ["RB"],
  WR: ["WR"],
  TE: ["TE"],
  FLEX: ["RB", "WR", "TE"],
  SUPER_FLEX: ["QB", "RB", "WR", "TE"],
  REC_FLEX: ["WR", "TE"],
  WRRB_FLEX: ["WR", "RB"],
  K: ["K"],
  DEF: ["DEF"],
}

/** Slot fill priority — more restrictive slots should be filled first */
const SLOT_PRIORITY: Record<string, number> = {
  QB: 0,
  RB: 0,
  WR: 0,
  TE: 0,
  K: 0,
  DEF: 0,
  REC_FLEX: 1,
  WRRB_FLEX: 1,
  FLEX: 2,
  SUPER_FLEX: 3,
}

/** Sort roster slots so restrictive ones are filled first */
export function sortSlotsByPriority(slots: string[]): string[] {
  return [...slots].sort((a, b) => (SLOT_PRIORITY[a] ?? 0) - (SLOT_PRIORITY[b] ?? 0))
}

/** Count how many of each slot type exist in the roster */
export function countSlots(slots: string[]): Record<string, number> {
  return slots.reduce((acc, slot) => {
    acc[slot] = (acc[slot] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

/** Check if a player position can fill a given slot */
export function canFillSlot(slot: string, position: string): boolean {
  return (SLOT_ELIGIBLE[slot] || []).includes(position)
}

/** Compute recommended draft targets based on roster slots */
export function draftTargets(slots: string[]): Record<string, number> {
  const counts = countSlots(slots)
  return {
    QB: (counts.QB || 0) + (counts.SUPER_FLEX ? 1 : 0) + 1,
    RB: (counts.RB || 0) + Math.ceil((counts.FLEX || 0) / 2) + 1,
    WR: (counts.WR || 0) + Math.ceil((counts.FLEX || 0) / 2) + 1,
    TE: (counts.TE || 0) + 1,
    K: counts.K || 1,
    DEF: counts.DEF || 1,
  }
}

/** Display label for a slot (shortens SUPER_FLEX to SF) */
export function slotLabel(slot: string): string {
  if (slot === "SUPER_FLEX") return "SF"
  if (slot === "REC_FLEX") return "R/W"
  if (slot === "WRRB_FLEX") return "W/R"
  return slot
}
