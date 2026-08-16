import re
from bs4 import BeautifulSoup
from backend.models import Game

def parse_price(price_element):
    if not price_element:
        return None

    price=price_element.get("data-price-final")

    if not price:
        return None
    return int(price)/100   # convert paise to Rupees / cents to units

def parse_original_price(item, price, discount):
    orig_elem = item.select_one(".discount_original_price")
    if orig_elem:
        text = orig_elem.get_text(strip=True)
        # extract digits and optional decimal point
        digits = re.sub(r"[^\d.]", "", text)
        if digits:
            try:
                return float(digits)
            except ValueError:
                pass
    if discount > 0 and price is not None and (100 - discount) > 0:
        return round(price * 100 / (100 - discount), 2)
    return price

def parse_game(item):
    appid=item.get("data-ds-appid")
    if not appid:
        return None

    title=item.select_one(".title")
    if not title:
        return None

    price_element=item.select_one("[data-price-final]")
    price=parse_price(price_element)
    discount=0

    if price_element:
        discount=int(price_element.get("data-discount", 0))

    original_price = parse_original_price(item, price, discount)
    link=item.get("href", "")

    image_element=item.select_one(".search_capsule img")
    image=""

    if image_element:
        image=image_element.get("src", "")

    released_elem = item.select_one(".search_released")
    release_date = released_elem.get_text(strip=True) if released_elem else None

    review_elem = item.select_one(".search_review_summary")
    review_summary = None
    if review_elem:
        tooltip = review_elem.get("data-tooltip-html", "")
        if tooltip:
            # Clean HTML break tags for plain text summary (e.g., "Overwhelmingly Positive (96%)")
            clean_text = tooltip.replace("<br>", " | ").replace("<br/>", " | ")
            soup_tmp = BeautifulSoup(clean_text, "html.parser")
            review_summary = soup_tmp.get_text(strip=True)

    return Game(
        appid=int(appid),
        name=title.get_text(strip=True),
        url=link,
        image=image,
        price=price,
        original_price=original_price,
        discount=discount,
        currency="INR",
        release_date=release_date,
        review_summary=review_summary
    )

def parse_search_results(html, limit=10):
    soup=BeautifulSoup(
        html,
        "html.parser"
    )

    results=[]

    items=soup.select(
        "a.search_result_row"
    )

    for item in items:
        if len(results)>=limit:
            break

        game=parse_game(item)

        if game:
            results.append(game)

    return results