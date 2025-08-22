import sys
import requests
from bs4 import BeautifulSoup
from typing import List, Dict

def scrape_nfl_draft_picks(url: str) -> List[Dict[str, str]]:
    """
    Scrapes draft pick data from an NFL.com draft board URL.
    """
    try:
        response = requests.get(url)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Request failed: {e}")
        return []

    soup = BeautifulSoup(response.text, 'html.parser')

    picks = []
    # This is a placeholder selector — adjust based on NFL.com's actual HTML structure
    for player_row in soup.select(".nfl-c-draft-pick"):
        name_tag = player_row.select_one(".nfl-c-draft-pick__name")
        team_tag = player_row.select_one(".nfl-c-draft-pick__team")
        pick_number_tag = player_row.select_one(".nfl-c-draft-pick__number")

        if name_tag and team_tag and pick_number_tag:
            picks.append({
                "name": name_tag.get_text(strip=True),
                "team": team_tag.get_text(strip=True),
                "pick_number": pick_number_tag.get_text(strip=True)
            })

    return picks

def run():
    # You can replace this URL with a real one later
    dummy_url = "https://example.com/nfl-draft"
    data = scrape_nfl_draft_picks(dummy_url)
    return data

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python nfl.py <NFL_DRAFT_URL>")
        sys.exit(1)

    draft_url = sys.argv[1]
    picks = scrape_nfl_draft_picks(draft_url)
    for pick in picks:
        print(pick)