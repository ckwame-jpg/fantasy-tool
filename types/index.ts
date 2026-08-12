export interface Player {
  id: string;
  name: string;
  team: string;
  position: string;
  rank?: number;
  age?: number;
  height?: string;
  weight?: string;
  college?: string;
  years_exp?: number;
  number?: number;
  injury_status?: string | null;
}