interface PositionPillProps {
  position: string
  className?: string
}

const LABEL_OVERRIDES: Record<string, string> = {
  FLEX: 'W/R',
  WRRB_FLEX: 'W/R',
  REC_FLEX: 'W/T',
  SUPER_FLEX: 'SF',
  BN: 'BE',
}

export default function PositionPill({ position, className = '' }: PositionPillProps) {
  const key = position.toUpperCase()
  const label = LABEL_OVERRIDES[key] ?? key
  return (
    <span className={`pos-pill ${className}`} data-p={key}>
      {label}
    </span>
  )
}
