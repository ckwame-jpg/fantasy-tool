import sys
# from backend.scraper.espn import run as run_espn_scraper
# from backend.scraper.nfl import run as run_nfl_scraper
# from backend.scraper.sleeper import run as run_sleeper_scraper

def run_scraper(platform: str):
    if platform == "espn":
        print("ESPN scraper is currently disabled.")
    elif platform == "nfl":
        print("NFL scraper is currently disabled.")
    elif platform == "sleeper":
        print("Sleeper scraper is currently disabled.")
    else:
        print(f"Unknown platform: {platform}")
        sys.exit(1)