from fastapi import APIRouter, Query, HTTPException
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import httpx
import time
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
from uuid import uuid4

router = APIRouter()
_players_cache: Dict[int, Dict[str, Any]] = {}

# In-memory draft picks store: { draft_id: { "picks": [Pick, ...], "updated": timestamp } }
_draft_picks_store: dict[str, dict[str, Any]] = {}

# -----------------------------
# In-memory Teams & Favorites
# -----------------------------
_teams_store: dict[str, Any] = {
    "list": [
        {"id": "team-1", "name": "My League 1"},
        {"id": "team-2", "name": "Dynasty Squad"},
    ],
    "active_id": "team-1",
}

_favorites_store: dict[str, Any] = {
    "player_ids": []
}

class Team(BaseModel):
    id: str
    name: str

class TeamCreate(BaseModel):
    name: str
    picks: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

@router.get("/teams", response_model=List[Team])
def list_teams():
    return _teams_store["list"]

@router.get("/teams/active", response_model=Optional[Team])
def get_active_team():
    active = _teams_store.get("active_id")
    for t in _teams_store["list"]:
        if t["id"] == active:
            return t
    return None

@router.post("/teams", response_model=Team)
def create_team(payload: TeamCreate):
    new_team = {"id": str(uuid4()), "name": payload.name, "picks": payload.picks}
    _teams_store["list"].append(new_team)
    if not _teams_store.get("active_id"):
        _teams_store["active_id"] = new_team["id"]
    return new_team

@router.put("/teams/{team_id}")
def update_team(team_id: str, payload: TeamCreate):
    for i, t in enumerate(_teams_store["list"]):
        if t["id"] == team_id:
            _teams_store["list"][i] = {"id": team_id, "name": payload.name, "picks": payload.picks}
            return {"ok": True, "team": _teams_store["list"][i]}
    raise HTTPException(status_code=404, detail="team not found")

@router.post("/teams/active")
def set_active_team_by_id(team_id: str = Query(...)):
    for t in _teams_store["list"]:
        if t["id"] == team_id:
            _teams_store["active_id"] = team_id
            return {"ok": True}
    raise HTTPException(status_code=404, detail="team not found")

# Favorites endpoints (simple, global store)
class FavoritesPayload(BaseModel):
    player_ids: List[str] = Field(default_factory=list)

@router.get("/favorites")
def get_favorites():
    return {"player_ids": _favorites_store.get("player_ids", [])}

@router.put("/favorites")
def put_favorites(payload: FavoritesPayload):
    _favorites_store["player_ids"] = payload.player_ids
    return {"ok": True, "player_ids": _favorites_store["player_ids"]}

class Pick(BaseModel):
    id: str = Field(..., description="Unique id for this pick (uuid on the client is fine)")
    player_id: str
    player_name: str
    position: str
    team: str
    round: int
    overall: int
    slot: Optional[str] = Field(default=None, description="QB/RB/WR/TE/FLEX/BN etc")
    timestamp: float

def _safe_get_json(url: str, timeout: float = 30.0):
    try:
        r = httpx.get(url, timeout=timeout)
        if r.status_code == 200:
            return r.json()
        logger.info(f"GET {url} -> {r.status_code}")
        return None
    except Exception as e:
        logger.info(f"GET {url} failed: {e}")
        return None


# Minimal built-in fallback dataset to ensure API remains usable offline
_DEMO_PLAYERS = [
    {"id": "1", "first_name": "Ja'Marr", "last_name": "Chase", "team": "CIN", "position": "WR", "active": True},
    {"id": "2", "first_name": "Bijan", "last_name": "Robinson", "team": "ATL", "position": "RB", "active": True},
    {"id": "3", "first_name": "Saquon", "last_name": "Barkley", "team": "PHI", "position": "RB", "active": True},
    {"id": "4", "first_name": "Justin", "last_name": "Jefferson", "team": "MIN", "position": "WR", "active": True},
]


@router.get("/players")
def get_players(
    position: str = Query("ALL"),
    # `season` is the draft season (e.g., 2025). We'll pull last year's stats (2024) but current season ADP (2025).
    season: int = Query(datetime.now().year),
    on_team_only: bool = Query(True),
):
    # Small helpers to read nested fields and coalesce values
    def _get_path(obj: dict, path: str):
        if not isinstance(obj, dict) or not path:
            return None
        cur = obj
        for k in path.split("."):
            if isinstance(cur, dict) and k in cur:
                cur = cur[k]
            else:
                return None
        return cur

    def _coalesce(*vals):
        for v in vals:
            if v is not None:
                return v
        return None

    def _to_int(v: Any, default: int = 0) -> int:
        try:
            if v is None:
                return default
            if isinstance(v, bool):
                return int(v)
            if isinstance(v, (int, float)):
                return int(v)
            s = str(v).strip()
            if s == "" or s.lower() == "na" or s == "-":
                return default
            return int(float(s))
        except Exception:
            return default

    def _to_opt_int(v: Any):
        try:
            if v is None:
                return None
            if isinstance(v, bool):
                return int(v)
            if isinstance(v, (int, float)):
                return int(v)
            s = str(v).strip()
            if s == "" or s.lower() == "na" or s == "-":
                return None
            return int(float(s))
        except Exception:
            return None

    # Compute seasons for different data sources
    adp_year = season
    stats_year = season - 1  # show last year's production on the draftboard

    # Per-season cache (keyed by draft season)
    current_time = time.time()
    cache_bucket = _players_cache.get(season, {})
    if "data" in cache_bucket and current_time - cache_bucket.get("timestamp", 0) < 300:
        cached_players = cache_bucket["data"]
        if position == "ALL":
            return cached_players
        return [p for p in cached_players if p["position"] == position]

    # Sleeper endpoints
    url_players = "https://api.sleeper.app/v1/players/nfl"
    url_stats = f"https://api.sleeper.app/v1/stats/nfl/regular/{stats_year}"
    url_adp = f"https://api.sleeper.app/v1/adp/nfl/{adp_year}?type=ppr"

    # Fetch base player info (tolerant)
    logger.info(f"Fetching player data from {url_players}")
    data_players = _safe_get_json(url_players)
    if not isinstance(data_players, dict):
        # Convert demo list to Sleeper-like dict shape
        data_players = {p["id"]: p for p in _DEMO_PLAYERS}
        logger.info("Using built-in demo players: remote player feed unavailable")

    # Fetch season stats (last year) tolerant
    logger.info(f"Fetching stats from {url_stats} for year {stats_year}")
    data_stats = _safe_get_json(url_stats) or {}

    # Fetch ADP for current draft season (Sleeper first, then FFC fallback)
    adp_dict: dict[str, float] = {}
    ffc_name_to_adp: dict[str, float] = {}

    # 1) Try Sleeper ADP by player_id
    try:
        logger.info(f"Fetching ADP from {url_adp} for draft year {adp_year}")
        data_adp = _safe_get_json(url_adp)
        if isinstance(data_adp, list):
            for row in data_adp:
                pid = row.get("player_id")
                adp_val = row.get("adp")
                if pid is not None and isinstance(adp_val, (int, float)):
                    adp_dict[str(pid)] = round(float(adp_val), 1)
    except Exception:
        logger.info("Sleeper ADP unavailable; will try FFC fallback")

    # 2) If Sleeper produced nothing, try FantasyFootballCalculator by name
    if not adp_dict:
        try:
            ffc_url = f"https://fantasyfootballcalculator.com/api/v1/adp/ppr?teams=12&year={adp_year}"
            logger.info(f"Fetching FFC ADP from {ffc_url}")
            raw = _safe_get_json(ffc_url)
            if raw is not None:
                players_ffc = raw.get("players", raw) if isinstance(raw, dict) else raw
                if isinstance(players_ffc, list):
                    for p in players_ffc:
                        if isinstance(p, dict):
                            name = p.get("name")
                            adp_val = p.get("adp")
                            if name and isinstance(adp_val, (int, float)):
                                ffc_name_to_adp[name.lower()] = round(float(adp_val), 1)
            else:
                logger.info("FFC ADP request failed")
        except Exception as e:
            logger.info(f"FFC ADP fetch failed: {e}")

    # Stats can be dict keyed by player_id or a list of rows with `player_id`
    if isinstance(data_stats, dict):
        stats_dict = {str(player_id): stat for player_id, stat in data_stats.items()}
    else:
        stats_dict = {
            str(stat.get("player_id")): stat
            for stat in data_stats
            if isinstance(stat, dict) and stat.get("player_id") is not None
        }

    valid_positions = ["QB", "RB", "WR", "TE", "K", "DEF"]
    players: list[dict] = []

    for player_id, player_data in data_players.items():
        team_code = (player_data.get("team") or "").strip()
        if on_team_only and not team_code:
            continue
        # Skip explicitly inactive/retired entries when on_team_only is True
        if on_team_only and player_data.get("active") is False:
            continue

        pos = player_data.get("position")
        if pos not in valid_positions:
            continue

        stat = stats_dict.get(str(player_id), {}) or {}

        # Coerce numeric fields to sane types (ints) and default zeros
        passYds = int(stat.get("pass_yd", 0) or 0)
        passTD = int(stat.get("pass_td", 0) or 0)
        rushYds = int(stat.get("rush_yd", 0) or 0)
        rushTD = int(stat.get("rush_td", 0) or 0)
        recYds = int(stat.get("rec_yd", 0) or 0)
        recTD = int(stat.get("rec_td", 0) or 0)
        receptions = int(stat.get("rec", 0) or 0)
        # receiving targets from one of: rec_tgt, targets, or nested paths
        targets_val = _to_opt_int(
            _coalesce(
                stat.get("rec_tgt"),
                stat.get("targets"),
                _get_path(stat, "receiving.targets"),
            )
        )
        fumbles = int(stat.get("fum", 0) or 0)
        interceptions = int(stat.get("int", 0) or 0)
        sacks = int(stat.get("sack", 0) or 0)

        # New: attempts & completions (use multiple possible keys for safety)
        rushAtt = int(
            stat.get("rush_att", 0)
            or stat.get("rushing_att", 0)
            or stat.get("rush_attempts", 0)
            or 0
        )

        # passing attempts from one of: pass_att, att, attempts, or nested paths
        pass_att = _to_opt_int(
            _coalesce(
                stat.get("pass_att"),
                stat.get("att"),
                stat.get("attempts"),
                _get_path(stat, "passing.att"),
                _get_path(stat, "passing.attempts"),
                _get_path(stat, "pass.att"),
            )
        )

        # passing completions from one of: pass_cmp, cmp, completions, or nested paths
        pass_cmp = _to_opt_int(
            _coalesce(
                stat.get("pass_cmp"),
                stat.get("cmp"),
                stat.get("completions"),
                _get_path(stat, "passing.cmp"),
                _get_path(stat, "passing.completions"),
                _get_path(stat, "pass.cmp"),
            )
        )

        fantasyPoints = round(
            passTD * 4
            + passYds / 25
            - interceptions * 2
            + rushTD * 6
            + rushYds / 10
            + recTD * 6
            + recYds / 10
            + receptions * 1,
            1,
        )
        full_name = f"{player_data.get('first_name', '')} {player_data.get('last_name', '')}".strip()
        # Prefer Sleeper ADP by id, otherwise try FFC name match
        adp_value = adp_dict.get(str(player_id))
        if adp_value is None and ffc_name_to_adp:
            adp_value = ffc_name_to_adp.get(full_name.lower())

        player: dict[str, Any] = {
            "id": str(player_id),
            "name": full_name,
            "team": team_code,
            "position": pos,
            "rank": 0,
            "fantasyPoints": fantasyPoints,
            "rushYds": rushYds,
            "rushTD": rushTD,
            "rushAtt": rushAtt,
            "recYds": recYds,
            "recTD": recTD,
            "passYds": passYds,
            "passTD": passTD,
            "receptions": receptions,
            "fumbles": fumbles,
            "interceptions": interceptions,
            "sacks": sacks,
            "adp": adp_value if isinstance(adp_value, (int, float)) else None,
        }

        # Conditionally include requested flat keys only when valid numbers
        if pass_att is not None:
            player["pass_att"] = pass_att
            # Optional camelCase for compatibility
            player["passAtt"] = pass_att
        if pass_cmp is not None:
            player["pass_cmp"] = pass_cmp
            player["passCmp"] = pass_cmp
        if targets_val is not None:
            player["targets"] = targets_val
        players.append(player)

    # Save per-season cache (key by desired draft season)
    _players_cache[season] = {"data": players, "timestamp": current_time}

    logger.info(f"Returning {len(players)} players for position {position}")
    if position == "ALL":
        return players
    return [p for p in players if p["position"] == position]

@router.get("/drafts/{draft_id}/picks", response_model=List[Pick])
def get_picks(draft_id: str):
    """
    Return the current list of picks for a given draftboard.
    """
    bucket = _draft_picks_store.get(draft_id, {"picks": []})
    return bucket["picks"]

@router.put("/drafts/{draft_id}/picks", response_model=List[Pick])
def upsert_picks(draft_id: str, picks: List[Pick]):
    """
    Replace the full list of picks for this draftboard.
    This is idempotent and keeps the contract simple for the client.
    """
    _draft_picks_store[draft_id] = {
        "picks": picks,
        "updated": time.time(),
    }
    return picks

@router.delete("/drafts/{draft_id}/picks", response_model=dict)
def clear_picks(draft_id: str):
    """
    Clear all picks for the draftboard.
    """
    _draft_picks_store[draft_id] = {"picks": [], "updated": time.time()}
    return {"ok": True}

@router.get("/adp/{season}")
def get_adp(season: int):
    """
    Get ADP data for a specific season.
    Returns ADP data from Sleeper API or FFC as fallback.
    """
    # Try Sleeper ADP first (tolerant)
    url_adp = f"https://api.sleeper.app/v1/adp/nfl/{season}?type=ppr"
    adp_entries: list[dict] = []

    data_adp = _safe_get_json(url_adp)
    if isinstance(data_adp, list) and data_adp:
        # Map IDs to names via players feed
        players_data = _safe_get_json("https://api.sleeper.app/v1/players/nfl") or {}
        for row in data_adp:
            player_id = row.get("player_id")
            adp_val = row.get("adp")
            if player_id and isinstance(adp_val, (int, float)):
                player_info = players_data.get(str(player_id), {})
                name = f"{player_info.get('first_name', '')} {player_info.get('last_name', '')}".strip()
                if name:
                    adp_entries.append({
                        "player_id": str(player_id),
                        "adp": round(float(adp_val), 1),
                        "position": player_info.get("position", ""),
                        "team": player_info.get("team", ""),
                        "name": name,
                    })

    # Fallback to FFC when needed
    if not adp_entries:
        ffc_url = f"https://fantasyfootballcalculator.com/api/v1/adp/ppr?teams=12&year={season}"
        raw = _safe_get_json(ffc_url)
        if raw is not None:
            players_ffc = raw.get("players", raw) if isinstance(raw, dict) else raw
            if isinstance(players_ffc, list):
                for p in players_ffc:
                    if isinstance(p, dict):
                        name = p.get("name")
                        adp_val = p.get("adp")
                        position = p.get("position", "")
                        team = p.get("team", "")
                        if name and isinstance(adp_val, (int, float)):
                            adp_entries.append({
                                "player_id": "",
                                "adp": round(float(adp_val), 1),
                                "position": position,
                                "team": team,
                                "name": name,
                            })

    # Final safety: small demo mapping if all upstreams fail
    if not adp_entries:
        adp_entries = [
            {"player_id": "1", "adp": 1.5, "position": "WR", "team": "CIN", "name": "Ja'Marr Chase"},
            {"player_id": "2", "adp": 2.2, "position": "RB", "team": "ATL", "name": "Bijan Robinson"},
            {"player_id": "3", "adp": 2.5, "position": "RB", "team": "PHI", "name": "Saquon Barkley"},
        ]

    return adp_entries