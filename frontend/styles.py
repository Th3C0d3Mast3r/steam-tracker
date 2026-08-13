import streamlit as st


def load_css():

    st.markdown(
        """
        <style>

        @import url(
            'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
        );


        * {
            font-family:Inter,sans-serif;
        }


        .stApp {
            background:#101112;
            color:#eeeeee;
        }


        header[data-testid="stHeader"] {
            background:transparent;
        }


        .block-container {
            max-width:1250px;
            padding-top:0.5rem;
            padding-bottom:2rem;
        }


        #MainMenu {
            visibility:hidden;
        }


        footer {
            visibility:hidden;
        }


        [data-testid="stDecoration"] {
            display:none;
        }


        .navbar {
            height:58px;
            display:flex;
            align-items:center;
            justify-content:space-between;
            border-bottom:1px solid #252729;
            margin-bottom:35px;
        }


        .brand {
            font-size:17px;
            font-weight:700;
            letter-spacing:-0.4px;
            color:#e9e9e9;
        }


        .nav-center {
            position:absolute;
            left:50%;
            transform:translateX(-50%);
            font-size:11px;
            font-weight:600;
            color:#dddddd;
            text-decoration:underline;
            text-underline-offset:3px;
        }


        .nav-icon {
            width:25px;
            height:25px;
            border-radius:50%;
            border:1px solid #272a2c;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:12px;
            color:#777;
        }


        .hero {
            text-align:center;
            margin-top:15px;
            margin-bottom:30px;
        }


        .hero h1 {
            margin:0;
            font-size:29px;
            font-weight:700;
            letter-spacing:-1.1px;
            color:#e5e5e5;
        }


        .hero p {
            margin-top:5px;
            font-size:11px;
            color:#c7c7c7;
        }


        .add-wrapper {
            text-align:center;
            margin-bottom:35px;
        }


        .add-game {
            display:inline-flex;
            align-items:center;
            gap:7px;
            padding:9px 17px;
            border:1px solid #292c2e;
            border-radius:22px;
            background:#17191a;
            color:#d8d8d8;
            font-size:11px;
            font-weight:600;
        }


        .add-icon {
            color:#00d97b;
            font-size:14px;
        }


        .section-title {
            font-size:17px;
            font-weight:600;
            margin-bottom:14px;
            color:#eeeeee;
            letter-spacing:-0.4px;
        }


        .game-card {
            background:#191b1c;
            border:1px solid #252729;
            border-radius:5px;
            overflow:hidden;
        }


        .game-image-container {
            position:relative;
            width:100%;
            height:105px;
            overflow:hidden;
            background:#0d0e0f;
        }


        .game-image {
            width:100%;
            height:100%;
            object-fit:cover;
            display:block;
        }


        .discount {
            position:absolute;
            top:7px;
            right:6px;
            background:#00a95c;
            color:#06120d;
            padding:4px 6px;
            border-radius:3px;
            font-size:9px;
            font-weight:700;
        }


        .game-info {
            padding:10px 9px 11px 9px;
        }


        .game-name {
            color:#e5e5e5;
            font-size:11px;
            font-weight:600;
            margin-bottom:7px;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
        }


        .price-row {
            display:flex;
            align-items:center;
            justify-content:space-between;
        }


        .current-price {
            color:#f0f0f0;
            font-size:11px;
            font-weight:600;
        }


        .target-price {
            color:#55585a;
            font-size:9px;
        }


        .status {
            margin-top:8px;
            font-size:8px;
            font-weight:700;
            letter-spacing:0.2px;
        }


        .status-below {
            color:#00d77a;
        }


        .status-near {
            color:#e8b52d;
        }


        .status-above {
            color:#d35a5a;
        }


        .empty-state {
            text-align:center;
            padding:60px;
            color:#666;
            border:1px solid #202223;
            border-radius:6px;
        }

        </style>
        """,
        unsafe_allow_html=True
    )