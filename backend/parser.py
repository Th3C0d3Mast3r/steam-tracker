from bs4 import BeautifulSoup
from backend.models import Game

def parse_price(price_element):
    if not price_element:
        return None

    price=price_element.get("data-price-final")

    if not price:
        return None
    return int(price)/100   # since I get the price in paise, I convert to Rupees by dividing by 100


def parse_game(item):
    appid=item.get("data-ds-appid")
    if not appid: return None

    title=item.select_one(".title")
    if not title: return None

    price_element=item.select_one("[data-price-final]")
    price=parse_price(price_element)    # this calls the above function that is there
    discount=0

    if price_element:
        discount=int(price_element.get("data-discount", 0))

    link=item.get("href")

    image_element=item.select_one(".search_capsule img")
    image=""

    if image_element:
        image=image_element.get("src", "")

    return Game(
        appid=int(appid),
        name=title.get_text(strip=True),
        url=link,
        image=image,
        price=price,
        original_price=None,
        discount=discount,
        currency="INR"
    )

def parse_search_results(html,limit=10):

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