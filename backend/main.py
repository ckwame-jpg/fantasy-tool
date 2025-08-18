from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from app.api import routes
import socketio

# Create Socket.IO server
sio = socketio.AsyncServer(cors_allowed_origins="*", async_mode="asgi")
fastapi_app = FastAPI()

origins_env = os.environ.get("CORS_ORIGINS", "").strip()
default_local = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]
extra = [o for o in (x.strip() for x in origins_env.split(",")) if o]
allow_origins = list({*default_local, *extra})  # unique

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

fastapi_app.include_router(routes.router)

@fastapi_app.get("/")
def root():
    return {"message": "Fantasy Toolio Backend is running"}

# Socket.IO events
@sio.event
async def connect(sid, *args, **kwargs):
    print("Client connected:", sid)

@sio.event
async def join_draft(sid, *args, **kwargs):
    data = args[0] if args else {}
    draft_id = data.get("draft_id")
    sio.enter_room(sid, draft_id)
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