import os

import streamlit.components.v1 as components

_COMPONENT_PATH=os.path.join(os.path.dirname(os.path.dirname(__file__)), "components", "indexeddb")

_indexeddb=components.declare_component("indexeddb", path=_COMPONENT_PATH)

def get_games():
    return _indexeddb(action="get_games", default=[])

def save_games(game):
    return _indexeddb(action="save_games", game=game, default=None)

def delete_game(appid):
    return _indexeddb(action="delete_game", appid=appid, default=None)

def save_price(appid, price):
    return _indexeddb(action="save_price", appid=appid, price=price, default=None)

def get_price_history(appid):
    return _indexeddb(action="get_price_history", appid=appid, default=[])