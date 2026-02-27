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
  return colors[tier as keyof typeof colors] || colors[5]
}

export const getTierLabel = (tier: number): string => {
  const labels = {
    1: 'Elite',
    2: 'Great', 
    3: 'Good',
    4: 'Decent',
    5: 'Deep'
  }
  return labels[tier as keyof typeof labels] || 'Deep'
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

  return baseStats[position as keyof typeof baseStats] || null
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
  
  const week = byeWeeks[team] || 0
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
  return byeWeeks[teamCode?.toUpperCase()] || 0
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
  
  const req = requirements[position] || { min: 1, ideal: 2, max: 3 }
  
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

// 2025 NFL Schedule — 18 weeks, team → list of opponents (@ = away, BYE = bye week)
export const NFL_SCHEDULE_2025: Record<string, string[]> = {
  'ARI': ['@NO','CAR','@SF','SEA','TEN','@IND','GB','BYE','@DAL','@SEA','SF','JAX','@TB','LAR','@HOU','ATL','@CIN','@LAR'],
  'ATL': ['TB','@MIN','@CAR','WSH','BYE','BUF','@SF','MIA','@NE','@IND','CAR','@NO','@NYJ','SEA','@TB','@ARI','LAR','NO'],
  'BAL': ['@BUF','CLE','DET','@KC','HOU','LAR','BYE','CHI','@MIA','@MIN','@CLE','NYJ','CIN','PIT','@CIN','NE','@GB','@PIT'],
  'BUF': ['BAL','@NYJ','MIA','NO','NE','@ATL','BYE','@CAR','KC','@MIA','TB','@HOU','@PIT','CIN','@NE','@CLE','PHI','NYJ'],
  'CAR': ['@JAX','@ARI','ATL','@NE','MIA','DAL','@NYJ','BUF','@GB','NO','@ATL','@SF','LAR','BYE','@NO','TB','SEA','@TB'],
  'CHI': ['MIN','@DET','DAL','@LV','BYE','@WSH','NO','@BAL','@CIN','NYG','@MIN','PIT','@PHI','@GB','CLE','GB','@SF','DET'],
  'CIN': ['@CLE','JAX','@MIN','@DEN','DET','@GB','PIT','NYJ','CHI','BYE','@PIT','NE','@BAL','@BUF','BAL','@MIA','ARI','CLE'],
  'CLE': ['CIN','@BAL','GB','@DET','MIN','@PIT','MIA','@NE','BYE','@NYJ','BAL','@LV','SF','TEN','@CHI','BUF','PIT','@CIN'],
  'DAL': ['@PHI','NYG','@CHI','GB','@NYJ','@CAR','WSH','@DEN','ARI','BYE','@LV','PHI','KC','@DET','MIN','LAC','@WSH','@NYG'],
  'DEN': ['TEN','@IND','@LAC','CIN','@PHI','@NYJ','NYG','DAL','@HOU','LV','KC','BYE','@WSH','@LV','GB','JAX','@KC','LAC'],
  'DET': ['@GB','CHI','@BAL','CLE','@CIN','@KC','TB','BYE','MIN','@WSH','@PHI','NYG','GB','DAL','@LAR','PIT','@MIN','@CHI'],
  'GB':  ['DET','WSH','@CLE','@DAL','BYE','CIN','@ARI','@PIT','CAR','PHI','@NYG','MIN','@DET','CHI','@DEN','@CHI','BAL','@MIN'],
  'HOU': ['@LAR','TB','@JAX','TEN','@BAL','BYE','@SEA','SF','DEN','JAX','@TEN','BUF','@IND','@KC','ARI','LV','@LAC','IND'],
  'IND': ['MIA','DEN','@TEN','@LAR','LV','ARI','@LAC','TEN','@PIT','ATL','BYE','@KC','HOU','@JAX','@SEA','SF','JAX','@HOU'],
  'JAX': ['CAR','@CIN','HOU','@SF','KC','SEA','LAR','BYE','@LV','@HOU','LAC','@ARI','@TEN','IND','NYJ','@DEN','@IND','TEN'],
  'KC':  ['@LAC','PHI','@NYG','BAL','@JAX','DET','LV','WSH','@BUF','BYE','@DEN','IND','@DAL','HOU','LAC','@TEN','DEN','@LV'],
  'LV':  ['@NE','LAC','@WSH','CHI','@IND','TEN','@KC','BYE','JAX','@DEN','DAL','CLE','@LAC','DEN','@PHI','@HOU','NYG','KC'],
  'LAR': ['HOU','@TEN','@PHI','IND','SF','@BAL','@JAX','BYE','NO','@SF','SEA','TB','@CAR','@ARI','DET','@SEA','@ATL','ARI'],
  'LAC': ['KC','@LV','DEN','@NYG','WSH','@MIA','IND','MIN','@TEN','PIT','@JAX','BYE','LV','PHI','@KC','@DAL','HOU','@DEN'],
  'MIA': ['@IND','NE','@BUF','NYJ','@CAR','LAC','@CLE','@ATL','BAL','BUF','WSH','BYE','NO','@NYJ','@PIT','CIN','TB','@NE'],
  'MIN': ['@CHI','ATL','CIN','@PIT','@CLE','BYE','PHI','@LAC','@DET','BAL','CHI','@GB','@SEA','WSH','@DAL','@NYG','DET','GB'],
  'NE':  ['LV','@MIA','PIT','CAR','@BUF','@NO','@TEN','CLE','ATL','@TB','NYJ','@CIN','NYG','BYE','BUF','@BAL','@NYJ','MIA'],
  'NO':  ['ARI','SF','@SEA','@BUF','NYG','NE','@CHI','TB','@LAR','@CAR','BYE','ATL','@MIA','@TB','CAR','NYJ','@TEN','@ATL'],
  'NYG': ['@WSH','@DAL','KC','LAC','@NO','PHI','@DEN','@PHI','SF','@CHI','GB','@DET','@NE','BYE','WSH','MIN','@LV','DAL'],
  'NYJ': ['PIT','BUF','@TB','@MIA','DAL','DEN','CAR','@CIN','BYE','CLE','@NE','@BAL','ATL','MIA','@JAX','@NO','NE','@BUF'],
  'PHI': ['DAL','@KC','LAR','@TB','DEN','@NYG','@MIN','NYG','BYE','@GB','DET','@DAL','CHI','@LAC','LV','@WSH','@BUF','WSH'],
  'PIT': ['@NYJ','SEA','@NE','MIN','BYE','CLE','@CIN','GB','IND','@LAC','CIN','@CHI','BUF','@BAL','MIA','@DET','@CLE','BAL'],
  'SF':  ['@SEA','@NO','ARI','JAX','@LAR','@TB','ATL','@HOU','@NYG','LAR','@ARI','CAR','@CLE','BYE','TEN','@IND','CHI','SEA'],
  'SEA': ['SF','@PIT','NO','@ARI','TB','@JAX','HOU','BYE','@WSH','ARI','@LAR','@TEN','MIN','@ATL','IND','LAR','@CAR','@SF'],
  'TB':  ['@ATL','@HOU','NYJ','PHI','@SEA','SF','@DET','@NO','BYE','NE','@BUF','@LAR','ARI','NO','ATL','@CAR','@MIA','CAR'],
  'TEN': ['@DEN','LAR','IND','@HOU','@ARI','@LV','NE','@IND','LAC','BYE','HOU','SEA','JAX','@CLE','@SF','KC','NO','@JAX'],
  'WAS': ['NYG','@GB','LV','@ATL','@LAC','CHI','@DAL','@KC','SEA','DET','@MIA','BYE','DEN','@MIN','@NYG','PHI','DAL','@PHI'],
}

// Get opponent for a team in a given week (1-indexed)
export const getOpponent = (team: string, week: number): string | null => {
  const schedule = NFL_SCHEDULE_2025[team?.toUpperCase()]
  if (!schedule || week < 1 || week > schedule.length) return null
  const opp = schedule[week - 1]
  if (opp === 'BYE') return null
  return opp.replace('@', '')
}

// Check if a team is on bye a given week
export const isOnBye = (team: string, week: number): boolean => {
  return getOpponent(team, week) === null
}

// Compute defense multipliers from DEF player data
// Higher DEF fantasy points = better defense = harder to score against
// Returns multipliers where > 1.0 = weak defense (easier matchup), < 1.0 = strong defense (harder matchup)
export const computeDefenseMultipliers = (allPlayers: any[]): Record<string, number> => {
  const defPlayers = allPlayers.filter(p => p.position === 'DEF' && p.fantasyPoints > 0)
  if (defPlayers.length === 0) return {}

  // DEF fantasy points: higher = better defense
  // We want to INVERT this for offensive matchup multiplier
  // Playing against a good defense (high DEF pts) = lower multiplier
  const avgDefPts = defPlayers.reduce((sum, p) => sum + p.fantasyPoints, 0) / defPlayers.length

  const multipliers: Record<string, number> = {}
  for (const def of defPlayers) {
    const team = def.team?.toUpperCase()
    if (!team) continue
    // Invert: if DEF scores high, their opponents score less
    // multiplier = avgDefPts / teamDefPts
    // Good defense (high pts) → multiplier < 1 (harder for opponents)
    // Bad defense (low pts) → multiplier > 1 (easier for opponents)
    const raw = avgDefPts / def.fantasyPoints
    // Clamp between 0.7 and 1.3 to avoid extreme swings
    multipliers[team] = Math.max(0.7, Math.min(1.3, raw))
  }

  return multipliers
}

// Get matchup multiplier for a player's opponent in a given week
export const getMatchupMultiplier = (
  team: string,
  week: number,
  defenseMultipliers: Record<string, number>
): number => {
  const opponent = getOpponent(team, week)
  if (!opponent) return 0 // bye week
  return defenseMultipliers[opponent] || 1.0
}