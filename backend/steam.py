import requests
from backend.parser import parse_search_results

SEARCH_URL="https://store.steampowered.com/search/"

HEADERS={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"}

def search_game(name, country="in", language="english", limit=10):
    params={
        "term":name,
        "cc":country,
        "l":language
    }

    response=requests.get(
        SEARCH_URL,
        params=params,
        headers=HEADERS,
        timeout=20
    )

    response.raise_for_status()

    return parse_search_results(response.text, limit)