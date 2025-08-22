

import requests
from bs4 import BeautifulSoup

def scrape_espn_draft_picks(league_id: str) -> list[dict]:
    """
    Scrapes the ESPN fantasy draft board and returns a list of drafted players.
    Each player is represented as a dictionary with name, pick number, and team.
    """
    url = f"https://fantasy.espn.com/football/league/draftrecap?leagueId={league_id}"
    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch data: {response.status_code}")

    soup = BeautifulSoup(response.text, "html.parser")

    # Placeholder logic: you'll need to customize this based on the actual HTML structure
    players = []
    for row in soup.select(".draftedPlayerRow"):
        name = row.select_one(".playerName").text.strip()
        pick = row.select_one(".pickNumber").text.strip()
        team = row.select_one(".teamName").text.strip()

        players.append({
            "name": name,
            "pick": pick,
            "team": team
        })

    return players


# Allow this module to be called directly (for scraper_runner.py)
def run():
    league_id = "your_league_id_here"  # Replace with dynamic input as needed
    try:
        picks = scrape_espn_draft_picks(league_id)
        for pick in picks:
            print(pick)
    except Exception as e:
        print(f"Error during ESPN scraping: {e}")