// Player photos and team logos utility functions
export const getPlayerPhotoUrl = (playerId: string, playerName: string) => {
  // ESPN player photos (most reliable)
  const cleanName = playerName.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, '-')
  return `https://a.espncdn.com/i/headshots/nfl/players/full/${playerId}.png`
}

export const getTeamLogoUrl = (teamCode: string) => {
  if (!teamCode) return ''
  const team = teamCode.toUpperCase()
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${team}.png`
}

export const getTeamColors = (teamCode: string): { primary: string; secondary: string } => {
  const colors: Record<string, { primary: string; secondary: string }> = {
    'ARI': { primary: '#97233F', secondary: '#000000' },
    'ATL': { primary: '#A71930', secondary: '#000000' },
    'BAL': { primary: '#241773', secondary: '#000000' },
    'BUF': { primary: '#00338D', secondary: '#C60C30' },
    'CAR': { primary: '#0085CA', secondary: '#101820' },
    'CHI': { primary: '#0B162A', secondary: '#C83803' },
    'CIN': { primary: '#FB4F14', secondary: '#000000' },
    'CLE': { primary: '#311D00', secondary: '#FF3C00' },
    'DAL': { primary: '#003594', secondary: '#869397' },
    'DEN': { primary: '#FB4F14', secondary: '#002244' },
    'DET': { primary: '#0076B6', secondary: '#B0B7BC' },
    'GB': { primary: '#203731', secondary: '#FFB612' },
    'HOU': { primary: '#03202F', secondary: '#A71930' },
    'IND': { primary: '#002C5F', secondary: '#A2AAAD' },
    'JAX': { primary: '#101820', secondary: '#D7A22A' },
    'KC': { primary: '#E31837', secondary: '#FFB81C' },
    'LV': { primary: '#000000', secondary: '#A5ACAF' },
    'LAC': { primary: '#0080C6', secondary: '#FFC20E' },
    'LAR': { primary: '#003594', secondary: '#FFA300' },
    'MIA': { primary: '#008E97', secondary: '#FC4C02' },
    'MIN': { primary: '#4F2683', secondary: '#FFC62F' },
    'NE': { primary: '#002244', secondary: '#C60C30' },
    'NO': { primary: '#101820', secondary: '#D3BC8D' },
    'NYG': { primary: '#0B2265', secondary: '#A71930' },
    'NYJ': { primary: '#125740', secondary: '#000000' },
    'PHI': { primary: '#004C54', secondary: '#A5ACAF' },
    'PIT': { primary: '#101820', secondary: '#FFB612' },
    'SF': { primary: '#AA0000', secondary: '#B3995D' },
    'SEA': { primary: '#002244', secondary: '#69BE28' },
    'TB': { primary: '#D50A0A', secondary: '#FF7900' },
    'TEN': { primary: '#0C2340', secondary: '#4B92DB' },
    'WAS': { primary: '#5A1414', secondary: '#FFB612' }
  }
  
  return colors[teamCode?.toUpperCase()] || { primary: '#6B7280', secondary: '#9CA3AF' }
}

// Player tier system
export const getPlayerTier = (position: string, adp: number): { tier: number; tierName: string; color: string } => {
  const tierBreakpoints: Record<string, number[]> = {
    'QB': [12, 24, 36],      // Tier 1: 1-12, Tier 2: 13-24, etc.
    'RB': [18, 36, 54],      // More RBs in higher tiers
    'WR': [24, 48, 72],      // More WRs in higher tiers  
    'TE': [8, 16, 24],       // Fewer quality TEs
    'K': [8, 16, 24],        // Kickers are similar
    'DEF': [8, 16, 24]       // Defenses are similar
  }
  
  const breakpoints = tierBreakpoints[position] || [12, 24, 36]
  
  let tier: number
  if (adp <= breakpoints[0]) tier = 1
  else if (adp <= breakpoints[1]) tier = 2
  else if (adp <= breakpoints[2]) tier = 3
  else if (adp <= breakpoints[2] + 20) tier = 4
  else tier = 5

  const tierNames = ['Elite', 'High-End', 'Mid-Tier', 'Depth', 'Waiver']
  const tierColors = ['text-purple-400', 'text-blue-400', 'text-green-400', 'text-yellow-400', 'text-gray-400']
  return {
    tier,
    tierName: tierNames[tier - 1] || 'Waiver',
    color: tierColors[tier - 1] || 'text-gray-400'
  }
}

export const getTierColor = (tier: number): string => {
  const colors = {
    1: 'bg-green-100 text-green-800 border-green-200',      // Elite
    2: 'bg-blue-100 text-blue-800 border-blue-200',        // Great
    3: 'bg-yellow-100 text-yellow-800 border-yellow-200',  // Good
    4: 'bg-orange-100 text-orange-800 border-orange-200',  // Decent
    5: 'bg-gray-100 text-gray-800 border-gray-200'         // Deep
  }
  return (colors as any)[tier] || colors[5]
}

export const getTierLabel = (tier: number): string => {
  const labels = {
    1: 'Elite',
    2: 'Great', 
    3: 'Good',
    4: 'Decent',
    5: 'Deep'
  }
  return (labels as any)[tier] || 'Deep'
}

// Player projections (mock data - in production, fetch from fantasy API)
export const getPlayerProjections = (playerId: string, position: string) => {
  // Mock projections based on position
  const baseProjections = {
    QB: {
      passingYards: Math.floor(Math.random() * 1000) + 3500,
      passingTDs: Math.floor(Math.random() * 10) + 25,
      interceptions: Math.floor(Math.random() * 5) + 8,
      rushingYards: Math.floor(Math.random() * 300) + 200,
      rushingTDs: Math.floor(Math.random() * 5) + 3,
      fantasyPoints: Math.floor(Math.random() * 100) + 300
    },
    RB: {
      rushingYards: Math.floor(Math.random() * 500) + 800,
      rushingTDs: Math.floor(Math.random() * 8) + 6,
      receptions: Math.floor(Math.random() * 30) + 30,
      receivingYards: Math.floor(Math.random() * 200) + 200,
      receivingTDs: Math.floor(Math.random() * 3) + 2,
      fantasyPoints: Math.floor(Math.random() * 80) + 180
    },
    WR: {
      receptions: Math.floor(Math.random() * 40) + 60,
      receivingYards: Math.floor(Math.random() * 400) + 800,
      receivingTDs: Math.floor(Math.random() * 6) + 6,
      rushingYards: Math.floor(Math.random() * 50) + 10,
      rushingTDs: Math.floor(Math.random() * 2),
      fantasyPoints: Math.floor(Math.random() * 80) + 160
    },
    TE: {
      receptions: Math.floor(Math.random() * 30) + 40,
      receivingYards: Math.floor(Math.random() * 300) + 500,
      receivingTDs: Math.floor(Math.random() * 5) + 4,
      fantasyPoints: Math.floor(Math.random() * 60) + 120
    },
    K: {
      fieldGoals: Math.floor(Math.random() * 10) + 25,
      extraPoints: Math.floor(Math.random() * 15) + 35,
      fantasyPoints: Math.floor(Math.random() * 30) + 120
    },
    DEF: {
      sacks: Math.floor(Math.random() * 20) + 30,
      interceptions: Math.floor(Math.random() * 8) + 12,
      fumbleRecoveries: Math.floor(Math.random() * 6) + 8,
      defensiveTDs: Math.floor(Math.random() * 3) + 2,
      fantasyPoints: Math.floor(Math.random() * 40) + 140
    }
  }

  return (baseProjections as any)[position] || (baseProjections as any).RB
}

// Red zone stats (mock data)
export const getRedZoneStats = (playerId: string, position: string) => {
  const baseStats = {
    QB: {
      redZoneAttempts: Math.floor(Math.random() * 30) + 40,
      redZoneTDs: Math.floor(Math.random() * 15) + 20,
      redZoneEfficiency: (Math.random() * 0.3 + 0.5).toFixed(1) // 50-80%
    },
    RB: {
      redZoneCarries: Math.floor(Math.random() * 20) + 25,
      redZoneTDs: Math.floor(Math.random() * 8) + 8,
      redZoneEfficiency: (Math.random() * 0.4 + 0.4).toFixed(1) // 40-80%
    },
    WR: {
      redZoneTargets: Math.floor(Math.random() * 15) + 15,
      redZoneTDs: Math.floor(Math.random() * 6) + 4,
      redZoneEfficiency: (Math.random() * 0.3 + 0.25).toFixed(1) // 25-55%
    },
    TE: {
      redZoneTargets: Math.floor(Math.random() * 12) + 10,
      redZoneTDs: Math.floor(Math.random() * 5) + 3,
      redZoneEfficiency: (Math.random() * 0.3 + 0.3).toFixed(1) // 30-60%
    }
  }

  return (baseStats as any)[position] || null
}

// Strength of schedule (mock data)
export const getStrengthOfSchedule = (playerId: string, position: string) => {
  const difficulty = Math.random()
  
  if (difficulty < 0.33) {
    return { rating: 'Easy', color: 'text-green-400', value: Math.floor(Math.random() * 5) + 1 }
  } else if (difficulty < 0.67) {
    return { rating: 'Medium', color: 'text-yellow-400', value: Math.floor(Math.random() * 10) + 11 }
  } else {
    return { rating: 'Hard', color: 'text-red-400', value: Math.floor(Math.random() * 12) + 21 }
  }
}

// Target share (for pass catchers)
export const getTargetShare = (playerId: string, position: string) => {
  if (!['WR', 'TE', 'RB'].includes(position)) return null
  
  const baseShare = position === 'WR' ? 0.15 : position === 'TE' ? 0.12 : 0.08
  const variance = Math.random() * 0.1 - 0.05 // ±5%
  const share = Math.max(0.05, Math.min(0.35, baseShare + variance))
  
  return {
    percentage: (share * 100).toFixed(1),
    rank: Math.floor(Math.random() * 50) + 1
  }
}

// Bye week analysis
export const getByeWeekInfo = (team: string) => {
  // Mock bye weeks - in production, fetch from API
  const byeWeeks: { [key: string]: number } = {
    'ARI': 11, 'ATL': 12, 'BAL': 14, 'BUF': 12, 'CAR': 7, 'CHI': 7,
    'CIN': 12, 'CLE': 10, 'DAL': 7, 'DEN': 14, 'DET': 5, 'GB': 10,
    'HOU': 14, 'IND': 14, 'JAX': 12, 'KC': 6, 'LV': 10, 'LAC': 5,
    'LAR': 6, 'MIA': 6, 'MIN': 6, 'NE': 14, 'NO': 12, 'NYG': 11,
    'NYJ': 12, 'PHI': 5, 'PIT': 9, 'SF': 9, 'SEA': 10, 'TB': 11,
    'TEN': 5, 'WAS': 14
  }
  
  const week = (byeWeeks as any)[team] || 0
  const isEarly = week <= 7
  const isLate = week >= 12
  
  return {
    week,
    status: week === 0 ? 'Unknown' : `Week ${week}`,
    impact: isEarly ? 'Early (Good)' : isLate ? 'Late (Bad)' : 'Mid (OK)',
    color: isEarly ? 'text-green-400' : isLate ? 'text-red-400' : 'text-yellow-400'
  }
}

export const analyzeBye = (team: string) => {
  const byeWeeks: { [key: string]: number } = {
    'ARI': 11, 'ATL': 12, 'BAL': 14, 'BUF': 12, 'CAR': 7, 'CHI': 7,
    'CIN': 12, 'CLE': 10, 'DAL': 7, 'DEN': 14, 'DET': 5, 'GB': 10,
    'HOU': 14, 'IND': 14, 'JAX': 12, 'KC': 6, 'LV': 10, 'LAC': 5,
    'LAR': 6, 'MIA': 6, 'MIN': 6, 'NE': 14, 'NO': 12, 'NYG': 11,
    'NYJ': 12, 'PHI': 5, 'PIT': 9, 'SF': 9, 'SEA': 10, 'TB': 11,
    'TEN': 5, 'WAS': 14
  }

  const teamCode = team?.trim().toUpperCase()
  return (byeWeeks as any)[teamCode] || 0
}

// Simple bye week getter function
export const getByeWeek = (team: string): number => {
  return analyzeBye(team)
}

// Check for bye week conflicts in lineup
export const getByeWeekConflicts = (players: { team: string }[]): Record<number, string[]> => {
  const conflicts: Record<number, string[]> = {}
  
  players.forEach(player => {
    const byeWeek = getByeWeek(player.team)
    if (byeWeek > 0) {
      if (!conflicts[byeWeek]) conflicts[byeWeek] = []
      conflicts[byeWeek].push(player.team)
    }
  })
  
  // Only return weeks with multiple teams
  return Object.fromEntries(
    Object.entries(conflicts).filter(([_, teams]) => teams.length > 1)
  )
}

// Position grade analysis for draft
export const getPositionGrade = (position: string, count: number): { grade: string; color: string; description: string } => {
  const requirements: Record<string, { min: number; ideal: number; max: number }> = {
    'QB': { min: 1, ideal: 2, max: 3 },
    'RB': { min: 2, ideal: 4, max: 6 },
    'WR': { min: 2, ideal: 5, max: 7 },
    'TE': { min: 1, ideal: 2, max: 3 },
    'K': { min: 1, ideal: 1, max: 2 },
    'DEF': { min: 1, ideal: 1, max: 2 }
  }
  
  const req = (requirements as any)[position] || { min: 1, ideal: 2, max: 3 }
  
  if (count < req.min) {
    return { grade: 'F', color: 'text-red-500', description: 'Severely lacking' }
  } else if (count < req.ideal) {
    return { grade: 'C', color: 'text-yellow-500', description: 'Below ideal' }
  } else if (count <= req.max) {
    return { grade: 'A', color: 'text-green-500', description: 'Well balanced' }
  } else {
    return { grade: 'B', color: 'text-blue-500', description: 'Over-drafted' }
  }
}
