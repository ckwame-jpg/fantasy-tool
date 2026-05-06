import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from app.api import routes
import socketio
from fastapi.responses import JSONResponse
from scraper.scraper_runner import run_scraper
# Create Socket.IO server
sio = socketio.AsyncServer(cors_allowed_origins="*", async_mode="asgi")
fastapi_app = FastAPI()

origins_env = os.environ.get("CORS_ORIGINS", "").strip()
regex_env = os.environ.get("CORS_ORIGIN_REGEX", "").strip()
default_local = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
]
extra = [o for o in (x.strip() for x in origins_env.split(",")) if o]
allow_origins = list({*default_local, *extra})  # unique
# Accept any localhost port for dev + the configured Vercel pattern in prod.
allow_origin_regex = regex_env or r"^(https://[a-z0-9-]+\.vercel\.app|http://(localhost|127\.0\.0\.1):\d+)$"

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=allow_origin_regex,
)

fastapi_app.include_router(routes.router)

@fastapi_app.get("/")
def root():
    return {"message": "W Fantasy Backend is running"}


# @fastapi_app.get("/scrape/sleeper")
# async def scrape_sleeper_route():
#     from backend.scraper.sleeper import scrape_sleeper
#     output = scrape_sleeper()
#     return JSONResponse(content={"output": output})

# # ESPN Scraper Route
# @fastapi_app.get("/scrape/espn")
# async def scrape_espn_route():
#     from backend.scraper.espn import scrape_espn
#     output = scrape_espn()
#     return JSONResponse(content={"output": output})

# # NFL Scraper Route
# @fastapi_app.get("/scrape/nfl")
# async def scrape_nfl_route():
#     from backend.scraper.nfl import scrape_nfl
#     output = scrape_nfl()
#     return JSONResponse(content={"output": output})

# Socket.IO events
@sio.event
async def connect(sid, *args, **kwargs):
    print("Client connected:", sid)

@sio.event
async def join_draft(sid, *args, **kwargs):
    data = args[0] if args else {}
    draft_id = data.get("draft_id")
    await sio.enter_room(sid, draft_id)
    print(f"Client {sid} joined draft {draft_id}")

@sio.event
async def draft_pick(sid, *args, **kwargs):
    data = args[0] if args else {}
    draft_id = data.get("draft_id")
    player = data.get("player")
    await sio.emit("player_drafted", player, room=draft_id)

@sio.event
async def remove_pick(sid, *args, **kwargs):
    data = args[0] if args else {}
    draft_id = data.get("draft_id")
    player_id = data.get("player_id")
    await sio.emit("player_removed", player_id, room=draft_id)

# Wrap FastAPI app in Socket.IO ASGI app
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="/socket.io")