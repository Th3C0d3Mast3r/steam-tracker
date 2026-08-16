import requests
from backend.parser import parse_search_results
from backend.models import Game

SEARCH_URL = "https://store.steampowered.com/search/"
APPDETAILS_URL = "https://store.steampowered.com/api/appdetails"

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"}

def search_game(name, country="in", language="english", limit=10):
    params = {
        "term": name,
        "cc": country,
        "l": language
    }

    response = requests.get(
        SEARCH_URL,
        params=params,
        headers=HEADERS,
        timeout=20
    )

    response.raise_for_status()

    return parse_search_results(response.text, limit)

def get_game_details(appid: int, country="in"):
    params = {
        "appids": appid,
        "cc": country
    }

    response = requests.get(
        APPDETAILS_URL,
        params=params,
        headers=HEADERS,
        timeout=20
    )

    if response.status_code != 200:
        return None

    data = response.json()
    str_appid = str(appid)
    if not data or str_appid not in data or not data[str_appid].get("success"):
        return None

    app_data = data[str_appid]["data"]
    name = app_data.get("name", f"App {appid}")
    url = f"https://store.steampowered.com/app/{appid}/"
    image = app_data.get("header_image") or f"https://cdn.akamai.steamstatic.com/steam/apps/{appid}/header.jpg"
    
    price_overview = app_data.get("price_overview")
    price = None
    original_price = None
    discount = 0
    currency = "INR"

    if price_overview:
        price = price_overview.get("final", 0) / 100
        original_price = price_overview.get("initial", 0) / 100
        discount = price_overview.get("discount_percent", 0)
        currency = price_overview.get("currency", "INR")
    elif app_data.get("is_free"):
        price = 0.0
        original_price = 0.0
        discount = 0

    release_date_data = app_data.get("release_date", {})
    release_date = release_date_data.get("date") if release_date_data else None

    return Game(
        appid=appid,
        name=name,
        url=url,
        image=image,
        price=price,
        original_price=original_price,
        discount=discount,
        currency=currency,
        release_date=release_date,
        review_summary=None
    )