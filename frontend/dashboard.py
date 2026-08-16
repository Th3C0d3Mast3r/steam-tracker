import streamlit as st


def render_game_card(game):

    discount=""

    if game.get("discount",0)>0:

        discount=f"""
        <div class="discount">
            -{game["discount"]}%
        </div>
        """


    status="ABOVE RANGE"
    status_class="above"

    if game["price"]<=game["target_price"]:

        status="BELOW TARGET"
        status_class="below"

    elif game["price"]<=game["target_price"]*1.15:

        status="NEAR RANGE"
        status_class="near"


    image=game.get(
        "image",
        f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{game['appid']}/capsule_231x87.jpg"
    )


    card=f"""
    <div class="game-card">

        <div class="game-image-container">

            <img
                class="game-image"
                src="{image}"
            />

            {discount}

        </div>


        <div class="game-info">

            <div class="game-name">
                {game["name"]}
            </div>


            <div class="price-row">

                <span class="current-price">
                    {game["currency"]}{game["price"]}
                </span>

                <span class="target-price">
                    Target: {game["currency"]}{game["target_price"]}
                </span>

            </div>


            <div class="status status-{status_class}">
                ● {status}
            </div>

        </div>

    </div>
    """

    st.markdown(
        card,
        unsafe_allow_html=True
    )


def render_dashboard(games):

    st.markdown(
        """
        <div class="hero">

            <h1>Obsidian Tracker</h1>

            <p>
                Hello, Gamer. The market awaits.
            </p>

        </div>
        """,
        unsafe_allow_html=True
    )


    if "show_add_game" not in st.session_state:
        st.session_state.show_add_game = False
    
    if st.button("⊕ Add New Game"):
        st.session_state.show_add_game = not st.session_state.show_add_game
        
    if st.session_state.show_add_game:
        with st.container():
            search_query = st.text_input("Search for a game on Steam", key="search_query")
            if search_query:
                from backend.steam import search_game
                results = search_game(search_query)
                if results:
                    for r in results:
                        col1, col2 = st.columns([3, 1])
                        with col1:
                            st.write(f"**{r.name}** - {r.currency}{r.price}")
                        with col2:
                            if st.button("Add", key=f"add_{r.appid}"):
                                from storage.indexeddb import save_games
                                game_data = {
                                    "appid": r.appid,
                                    "name": r.name,
                                    "price": r.price,
                                    "currency": r.currency,
                                    "target_price": r.price,  # default to current price
                                    "discount": r.discount if hasattr(r, 'discount') else 0,
                                    "image": r.image if hasattr(r, 'image') else ""
                                }
                                save_games(game_data)
                                st.success("Added! Please refresh the page.")
                                st.rerun()


    st.markdown(
        """
        <div class="section-title">
            Your Targets
        </div>
        """,
        unsafe_allow_html=True
    )


    if not games:

        st.markdown(
            """
            <div class="empty-state">
                No games being tracked yet.
            </div>
            """,
            unsafe_allow_html=True
        )

        return


    cols=st.columns(
        min(len(games),4),
        gap="small"
    )


    for i,game in enumerate(games):

        with cols[i%4]:

            render_game_card(game)