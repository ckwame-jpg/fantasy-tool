from fastapi import APIRouter, Query, HTTPException
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import httpx
import time
import json
import os
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
from uuid import uuid4

router = APIRouter()
_players_cache: Dict[str, Dict[str, Any]] = {}

# In-memory draft picks store: { draft_id: { "picks": [Pick, ...], "updated": timestamp } }
_draft_picks_store: dict[str, dict[str, Any]] = {}

# -----------------------------
# Teams & Favorites (file-persisted)
# -----------------------------
_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data")
_TEAMS_FILE = os.path.join(_DATA_DIR, "teams.json")

def _load_teams() -> dict[str, Any]:
    try:
        if os.path.exists(_TEAMS_FILE):
            with open(_TEAMS_FILE, "r") as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to load teams file: {e}")
    return {"list": [], "active_id": None}

def _save_teams(store: dict[str, Any]):
    try:
        os.makedirs(_DATA_DIR, exist_ok=True)
        with open(_TEAMS_FILE, "w") as f:
            json.dump(store, f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to save teams file: {e}")

_teams_store: dict[str, Any] = _load_teams()

_favorites_store: dict[str, Any] = {
    "player_ids": []
}

class Team(BaseModel):
    id: str
    name: str
    picks: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

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
    _save_teams(_teams_store)
    return new_team

@router.put("/teams/{team_id}")
def update_team(team_id: str, payload: TeamCreate):
    for i, t in enumerate(_teams_store["list"]):
        if t["id"] == team_id:
            _teams_store["list"][i] = {"id": team_id, "name": payload.name, "picks": payload.picks}
            _save_teams(_teams_store)
            return {"ok": True, "team": _teams_store["list"][i]}
    raise HTTPException(status_code=404, detail="team not found")

@router.delete("/teams/{team_id}")
def delete_team(team_id: str):
    for i, t in enumerate(_teams_store["list"]):
        if t["id"] == team_id:
            _teams_store["list"].pop(i)
            if _teams_store.get("active_id") == team_id:
                _teams_store["active_id"] = _teams_store["list"][0]["id"] if _teams_store["list"] else None
            _save_teams(_teams_store)
            return {"ok": True}
    raise HTTPException(status_code=404, detail="team not found")

@router.post("/teams/active")
def set_active_team_by_id(team_id: str = Query(...)):
    for t in _teams_store["list"]:
        if t["id"] == team_id:
            _teams_store["active_id"] = team_id
            _save_teams(_teams_store)
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
    scoring: str = Query("ppr"),  # "ppr", "half_ppr", "standard"
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

    # Per-season+scoring cache
    current_time = time.time()
    cache_key = f"{season}:{scoring}"
    cache_bucket = _players_cache.get(cache_key, {})
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

    # 2) If Sleeper ADP endpoint produced nothing, use search_rank from player data
    #    search_rank is Sleeper's current player ranking and stays up to date
    if not adp_dict:
        logger.info("Using Sleeper search_rank as ADP (Sleeper ADP endpoint unavailable)")

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
        is_rookie = player_data.get("years_exp", -1) == 0
        # Include rookies even without a team (pre-NFL-draft prospects)
        if on_team_only and not team_code and not is_rookie:
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

        rec_multiplier = {"ppr": 1.0, "half_ppr": 0.5, "standard": 0.0}.get(scoring, 1.0)
        fantasyPoints = round(
            passTD * 4
            + passYds / 25
            - interceptions * 2
            + rushTD * 6
            + rushYds / 10
            + recTD * 6
            + recYds / 10
            + receptions * rec_multiplier,
            1,
        )
        full_name = f"{player_data.get('first_name', '')} {player_data.get('last_name', '')}".strip()
        # Prefer Sleeper ADP by id, then search_rank as fallback
        adp_value = adp_dict.get(str(player_id))
        if adp_value is None:
            sr = player_data.get("search_rank")
            if sr is not None and isinstance(sr, (int, float)):
                adp_value = float(sr)

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
            # Bio/metadata from Sleeper
            "age": player_data.get("age"),
            "height": player_data.get("height"),
            "weight": player_data.get("weight"),
            "college": player_data.get("college"),
            "years_exp": player_data.get("years_exp"),
            "number": player_data.get("number"),
            "injury_status": player_data.get("injury_status"),
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
    _players_cache[cache_key] = {"data": players, "timestamp": current_time}

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

    # Fallback: use search_rank from Sleeper player data as ADP proxy
    if not adp_entries:
        players_data = _safe_get_json("https://api.sleeper.app/v1/players/nfl") or {}
        valid_positions = {"QB", "RB", "WR", "TE", "K", "DEF"}
        for player_id, p in players_data.items():
            sr = p.get("search_rank")
            pos = p.get("position")
            if sr is not None and isinstance(sr, (int, float)) and pos in valid_positions:
                team = (p.get("team") or "").strip()
                name = f"{p.get('first_name', '')} {p.get('last_name', '')}".strip()
                if name:
                    adp_entries.append({
                        "player_id": str(player_id),
                        "adp": float(sr),
                        "position": pos,
                        "team": team,
                        "name": name,
                    })
        adp_entries.sort(key=lambda x: x["adp"])
        if adp_entries:
            logger.info(f"Using Sleeper search_rank as ADP fallback ({len(adp_entries)} players)")

    return adp_entries


# -------------------------------------------
# Sleeper League / Roster Proxy Endpoints
# -------------------------------------------

@router.get("/sleeper/user/{username}")
def sleeper_user(username: str):
    """Look up a Sleeper user by username."""
    data = _safe_get_json(f"https://api.sleeper.app/v1/user/{username}")
    if data is None:
        raise HTTPException(status_code=404, detail="Sleeper user not found")
    return data


@router.get("/sleeper/user/{user_id}/leagues/{season}")
def sleeper_user_leagues(user_id: str, season: int):
    """Get all NFL leagues for a Sleeper user in a given season."""
    data = _safe_get_json(f"https://api.sleeper.app/v1/user/{user_id}/leagues/nfl/{season}")
    if data is None:
        return []
    return data


@router.get("/sleeper/league/{league_id}")
def sleeper_league(league_id: str):
    """Get Sleeper league settings and metadata."""
    data = _safe_get_json(f"https://api.sleeper.app/v1/league/{league_id}")
    if data is None:
        raise HTTPException(status_code=404, detail="Sleeper league not found")
    return data


@router.get("/sleeper/league/{league_id}/rosters")
def sleeper_league_rosters(league_id: str):
    """Get all rosters in a Sleeper league."""
    data = _safe_get_json(f"https://api.sleeper.app/v1/league/{league_id}/rosters")
    if data is None:
        return []
    return data


@router.get("/sleeper/league/{league_id}/users")
def sleeper_league_users(league_id: str):
    """Get all users/members in a Sleeper league."""
    data = _safe_get_json(f"https://api.sleeper.app/v1/league/{league_id}/users")
    if data is None:
        return []
    return data


@router.get("/sleeper/league/{league_id}/drafts")
def sleeper_league_drafts(league_id: str):
    """Get all drafts for a Sleeper league."""
    data = _safe_get_json(f"https://api.sleeper.app/v1/league/{league_id}/drafts")
    if data is None:
        return []
    return data


@router.get("/sleeper/draft/{draft_id}/picks")
def sleeper_draft_picks(draft_id: str):
    """Get all picks made in a Sleeper draft."""
    data = _safe_get_json(f"https://api.sleeper.app/v1/draft/{draft_id}/picks")
    if data is None:
        return []
    return data


# -------------------------------------------
# ESPN Fantasy Proxy Endpoint
# -------------------------------------------

@router.get("/espn/league/{league_id}")
def espn_league(league_id: str, season: int = Query(default=2025), view: str = Query(default="mRoster,mTeam")):
    """Proxy ESPN fantasy league data (public leagues only)."""
    views = "&".join(f"view={v.strip()}" for v in view.split(","))
    url = f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{season}/segments/0/leagues/{league_id}?{views}"
    data = _safe_get_json(url)
    if data is None:
        raise HTTPException(status_code=404, detail="ESPN league not found or is private")
    return data


# -------------------------------------------
# Sleeper Trending Data
# -------------------------------------------

@router.get("/sleeper/trending/add")
def sleeper_trending_add(lookback_hours: int = Query(default=24), limit: int = Query(default=50)):
    """Get trending add players from Sleeper."""
    url = f"https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours={lookback_hours}&limit={limit}"
    data = _safe_get_json(url)
    if data is None:
        return []
    return data


@router.get("/sleeper/trending/drop")
def sleeper_trending_drop(lookback_hours: int = Query(default=24), limit: int = Query(default=50)):
    """Get trending drop players from Sleeper."""
    url = f"https://api.sleeper.app/v1/players/nfl/trending/drop?lookback_hours={lookback_hours}&limit={limit}"
    data = _safe_get_json(url)
    if data is None:
        return []
    return data