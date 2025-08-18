import { API_BASE_URL } from "@/constants";

export async function fetcher<JSON = any>(input: RequestInfo, init?: RequestInit): Promise<JSON> {
  const res = await fetch(input, init);
  if (!res.ok) {
    // Surface a helpful error instead of a generic message
    try {
      const data = await res.clone().json();
      const detail = (data && (data.detail || data.message)) ?? JSON.stringify(data);
      throw new Error(`HTTP ${res.status}: ${detail}`);
    } catch {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }
  }
  return res.json();
}

// ---------------- Draft picks helpers (long‑term API) ----------------
export type Pick = {
  id: string;
  player_id: string;
  player_name: string;
  position: string;
  team: string;
  round: number;
  overall: number;
  slot?: string | null;
  timestamp: number; // seconds since epoch
};

const expectJSON = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    try {
      const data = await res.clone().json();
      const detail = (data && (data.detail || data.message)) ?? JSON.stringify(data);
      throw new Error(`HTTP ${res.status}: ${detail}`);
    } catch {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }
  }
  return res.json() as Promise<T>;
};

export function getPicks(draftId: string): Promise<Pick[]> {
  return fetch(`${API_BASE_URL}/drafts/${encodeURIComponent(draftId)}/picks`, {
    cache: "no-store",
  }).then((r) => expectJSON<Pick[]>(r));
}

export function savePicks(draftId: string, picks: Pick[]): Promise<Pick[]> {
  return fetch(`${API_BASE_URL}/drafts/${encodeURIComponent(draftId)}/picks`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(picks),
  }).then((r) => expectJSON<Pick[]>(r));
}

export function clearPicks(draftId: string): Promise<{ ok: boolean }> {
  return fetch(`${API_BASE_URL}/drafts/${encodeURIComponent(draftId)}/picks`, {
    method: "DELETE",
  }).then((r) => expectJSON<{ ok: boolean }>(r));
}

// ---------------- ADP helpers ----------------
export type AdpEntry = {
  player_id: string;
  adp: number;
  position: string;
  team: string;
  name: string;
};

export function getAdp(season: number = new Date().getFullYear()): Promise<AdpEntry[]> {
  return fetch(`${API_BASE_URL}/adp/${season}`, {
    cache: "no-store",
  }).then((r) => expectJSON<AdpEntry[]>(r));
}