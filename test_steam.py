from backend.steam import search_game


results=search_game(
    "Red Dead Redemption 2"
)


for game in results:

    print(
        f"{game.appid} | "
        f"{game.name} | "
        f"{game.price} {game.currency}"
    )