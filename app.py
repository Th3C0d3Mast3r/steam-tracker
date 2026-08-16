import streamlit as st

from storage.indexeddb import get_games
from frontend.dashboard import render_dashboard
from frontend.styles import load_css


st.set_page_config(
    page_title="Steam Tracker",
    page_icon="◉",
    layout="wide",
    initial_sidebar_state="collapsed"
)

load_css()

games=get_games()


render_dashboard(games)