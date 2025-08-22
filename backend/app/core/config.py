import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "FantasyTool"
    API_VERSION: str = "v1"
    DB_URL: str = os.getenv("DATABASE_URL", "sqlite:///./test.db")

    # ESPN OAuth credentials
    ESPN_CLIENT_ID: str = os.getenv("ESPN_CLIENT_ID")
    ESPN_CLIENT_SECRET: str = os.getenv("ESPN_CLIENT_SECRET")
    ESPN_REDIRECT_URI: str = os.getenv("ESPN_REDIRECT_URI")

    # NFL Auth (e.g. cookie string)
    NFL_COOKIE: str = os.getenv("NFL_COOKIE")

    # Optional: sleeper API key or other configs
    SLEEPER_API_KEY: str = os.getenv("SLEEPER_API_KEY")

settings = Settings()
