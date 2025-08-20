// Platform integrations for live draft tracking
export type Platform = 'sleeper' | 'espn' | 'nfl'

export interface DraftConnection {
  platform: Platform
  isConnected: boolean
  draftId?: string
  leagueId?: string
  error?: string
}

export interface DraftPick {
  pickNumber: number
  round: number
  playerId: string
  playerName: string
  position: string
  team: string
  timestamp: number
  draftSlot?: number
  rosterId?: string
}

export interface LiveDraftState {
  currentPick: number
  currentRound: number
  isActive: boolean
  picks: DraftPick[]
  lastUpdate: number
}

// Sleeper API integration
export class SleeperIntegration {
  private baseUrl = 'https://api.sleeper.app/v1'
  
  async connectToDraft(draftId: string): Promise<DraftConnection> {
    try {
      // Get draft info to verify it exists and is active
      const draftResponse = await fetch(`${this.baseUrl}/draft/${draftId}`)
      if (!draftResponse.ok) {
        throw new Error(`Draft not found: ${draftId}`)
      }
      
      const draft = await draftResponse.json()
      
      return {
        platform: 'sleeper',
        isConnected: true,
        draftId,
        leagueId: draft.league_id
      }
    } catch (error) {
      return {
        platform: 'sleeper',
        isConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  async getDraftPicks(draftId: string): Promise<DraftPick[]> {
    try {
      const response = await fetch(`${this.baseUrl}/draft/${draftId}/picks`)
      if (!response.ok) {
        throw new Error('Failed to fetch draft picks')
      }
      
      const picks = await response.json()
      
      return picks.map((pick: any) => ({
        pickNumber: pick.pick_no,
        round: pick.round,
        playerId: pick.player_id,
        playerName: `${pick.metadata?.first_name || ''} ${pick.metadata?.last_name || ''}`.trim(),
        position: pick.metadata?.position || '',
        team: pick.metadata?.team || '',
        timestamp: Date.now(), // Sleeper doesn't provide exact pick time
        draftSlot: pick.draft_slot,
        rosterId: pick.roster_id
      }))
    } catch (error) {
      console.error('Error fetching Sleeper picks:', error)
      return []
    }
  }
  
  async getDraftState(draftId: string): Promise<LiveDraftState | null> {
    try {
      const [draft, picks] = await Promise.all([
        fetch(`${this.baseUrl}/draft/${draftId}`).then(r => r.json()),
        this.getDraftPicks(draftId)
      ])
      
      const totalPicks = draft.settings?.rounds * draft.settings?.teams || 150
      const currentPick = picks.length + 1
      const currentRound = Math.floor((currentPick - 1) / (draft.settings?.teams || 10)) + 1
      
      return {
        currentPick,
        currentRound,
        isActive: draft.status === 'drafting',
        picks,
        lastUpdate: Date.now()
      }
    } catch (error) {
      console.error('Error fetching Sleeper draft state:', error)
      return null
    }
  }
}

// ESPN integration (enhanced with public league support)
export class ESPNIntegration {
  private baseUrl = 'https://fantasy.espn.com/apis/v3/games/ffl'
  
  async connectToDraft(leagueId: string, year: number = new Date().getFullYear()): Promise<DraftConnection> {
    try {
      // Try to access public league data first
      const response = await fetch(`${this.baseUrl}/seasons/${year}/segments/0/leagues/${leagueId}?view=mDraftDetail`)
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Private league - requires ESPN+ subscription and authentication')
        }
        throw new Error(`League not found: ${leagueId}`)
      }
      
      const leagueData = await response.json()
      
      return {
        platform: 'espn',
        isConnected: true,
        draftId: `${leagueId}_${year}`,
        leagueId
      }
    } catch (error) {
      return {
        platform: 'espn',
        isConnected: false,
        error: error instanceof Error ? error.message : 'Failed to connect to ESPN league'
      }
    }
  }
  
  async getDraftPicks(leagueId: string, year: number = new Date().getFullYear()): Promise<DraftPick[]> {
    try {
      const response = await fetch(`${this.baseUrl}/seasons/${year}/segments/0/leagues/${leagueId}?view=mDraftDetail`)
      if (!response.ok) {
        throw new Error('Failed to fetch ESPN draft data')
      }
      
      const data = await response.json()
      const draftDetail = data.draftDetail
      
      if (!draftDetail || !draftDetail.picks) {
        return []
      }
      
      return draftDetail.picks.map((pick: any, index: number) => ({
        pickNumber: index + 1,
        round: Math.ceil((index + 1) / (data.settings?.rosterSettings?.lineupSlotCounts?.length || 10)),
        playerId: pick.playerId?.toString() || '',
        playerName: this.getPlayerName(pick.playerId, data.players),
        position: this.getPlayerPosition(pick.playerId, data.players),
        team: this.getPlayerTeam(pick.playerId, data.players),
        timestamp: Date.now(),
        rosterId: pick.teamId?.toString()
      }))
    } catch (error) {
      console.error('Error fetching ESPN picks:', error)
      return []
    }
  }
  
  private getPlayerName(playerId: number, players: any[]): string {
    const player = players?.find(p => p.id === playerId)
    return player ? `${player.firstName || ''} ${player.lastName || ''}`.trim() : 'Unknown Player'
  }
  
  private getPlayerPosition(playerId: number, players: any[]): string {
    const player = players?.find(p => p.id === playerId)
    return player?.defaultPositionId ? this.mapESPNPosition(player.defaultPositionId) : ''
  }
  
  private getPlayerTeam(playerId: number, players: any[]): string {
    const player = players?.find(p => p.id === playerId)
    return player?.proTeamId ? this.mapESPNTeam(player.proTeamId) : ''
  }
  
  private mapESPNPosition(positionId: number): string {
    const positions: { [key: number]: string } = {
      1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'DEF'
    }
    return positions[positionId] || 'UNK'
  }
  
  private mapESPNTeam(teamId: number): string {
    const teams: { [key: number]: string } = {
      1: 'ATL', 2: 'BUF', 3: 'CHI', 4: 'CIN', 5: 'CLE', 6: 'DAL', 7: 'DEN', 8: 'DET',
      9: 'GB', 10: 'TEN', 11: 'IND', 12: 'KC', 13: 'LV', 14: 'LAR', 15: 'MIA', 16: 'MIN',
      17: 'NE', 18: 'NO', 19: 'NYG', 20: 'NYJ', 21: 'PHI', 22: 'ARI', 23: 'PIT', 24: 'LAC',
      25: 'SF', 26: 'SEA', 27: 'TB', 28: 'WAS', 29: 'CAR', 30: 'JAX', 33: 'BAL', 34: 'HOU'
    }
    return teams[teamId] || 'UNK'
  }
  
  async getDraftState(leagueId: string, year: number = new Date().getFullYear()): Promise<LiveDraftState | null> {
    try {
      const [leagueResponse, picks] = await Promise.all([
        fetch(`${this.baseUrl}/seasons/${year}/segments/0/leagues/${leagueId}?view=mDraftDetail`).then(r => r.json()),
        this.getDraftPicks(leagueId, year)
      ])
      
      const draftDetail = leagueResponse.draftDetail
      const settings = leagueResponse.settings
      
      const totalTeams = settings?.size || 10
      const totalRounds = settings?.rosterSettings?.lineupSlotCounts?.length || 15
      const totalPicks = totalTeams * totalRounds
      
      const currentPick = picks.length + 1
      const currentRound = Math.ceil(currentPick / totalTeams)
      
      return {
        currentPick,
        currentRound,
        isActive: draftDetail?.drafted === false,
        picks,
        lastUpdate: Date.now()
      }
    } catch (error) {
      console.error('Error fetching ESPN draft state:', error)
      return null
    }
  }
}

// NFL.com integration placeholder
export class NFLIntegration {
  async connectToDraft(leagueId: string): Promise<DraftConnection> {
    return {
      platform: 'nfl',
      isConnected: false,
      error: 'NFL.com integration coming soon'
    }
  }
  
  async getDraftPicks(leagueId: string): Promise<DraftPick[]> {
    return []
  }
}

// Main integration manager
export class DraftIntegrationManager {
  private sleeper = new SleeperIntegration()
  private espn = new ESPNIntegration()
  private nfl = new NFLIntegration()
  
  getIntegration(platform: Platform) {
    switch (platform) {
      case 'sleeper': return this.sleeper
      case 'espn': return this.espn
      case 'nfl': return this.nfl
      default: throw new Error(`Unknown platform: ${platform}`)
    }
  }
  
  async connectToDraft(platform: Platform, draftId: string, options?: any): Promise<DraftConnection> {
    const integration = this.getIntegration(platform)
    return integration.connectToDraft(draftId, options)
  }
  
  async syncDraftPicks(platform: Platform, draftId: string): Promise<DraftPick[]> {
    const integration = this.getIntegration(platform)
    return integration.getDraftPicks(draftId)
  }
}

export const draftIntegrationManager = new DraftIntegrationManager()
