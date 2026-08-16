import os
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.steam import search_game, get_game_details

app = FastAPI(
    title="Steam Tracker API",
    description="Backend API for Steam Price Tracker",
    version="1.0.0"
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "Steam Tracker API"}

@app.get("/api/search")
def api_search_game(
    q: str = Query(..., min_length=1, description="Search query string"),
    country: str = Query("in", description="Country code (e.g. in, us)"),
    limit: int = Query(10, ge=1, le=50, description="Max search results")
):
    try:
        results = search_game(name=q, country=country, limit=limit)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch search results from Steam: {str(e)}")

@app.get("/api/game/{appid}")
def api_get_game_details(
    appid: int,
    country: str = Query("in", description="Country code")
):
    try:
        game = get_game_details(appid=appid, country=country)
        if not game:
            raise HTTPException(status_code=404, detail="Game not found or failed to fetch details")
        return game
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch game details: {str(e)}")

# Mount static files directory
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def read_root():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Steam Tracker API is running. Frontend static/index.html not found."}