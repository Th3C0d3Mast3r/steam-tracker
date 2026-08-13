import os

import streamlit.components.v1 as components

_COMPONENT_PATH=os.path.join(os.path.dirname(os.path.dirname(__file__)), "components", "indexeddb")

_indexdb=components.declare_component("indexdb", path=_COMPONENT_PATH)

def get_games():
    return _indexdb(action="get_games", default=[])

def save_games(game):
    return _indexdb(action="save_games", game=game, default=None)

def delete_game(appid):
    return _indexdb(action="delete_game", appid=appid, default=None)

def save_price(appid, price):
    return _indexdb(action="save_price", appid=appid, price=price, default=None)

def get_price_history(appid):
    return _indexdb(action="get_price_history", appid=appid, default=[])