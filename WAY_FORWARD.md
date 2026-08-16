# Steam Tracker UI & Architecture Overhaul: WAY FORWARD

The current app relies on Streamlit to render the UI, which can feel clunky and limits our ability to create a truly premium, dynamic, and clean dark-themed frontend. Furthermore, Streamlit's rerun execution model causes awkward UX flows (like the "Add Game" issue).

To fix this and provide a **proper frontend**, we will move away from Streamlit and adopt a more robust architecture.

## Proposed Changes

### 1. Backend API (FastAPI)
- Convert the current Streamlit app (`app.py`) into a lightweight **FastAPI** application.
- Expose a single endpoint (e.g., `/api/search`) that utilizes the existing `backend.steam.search_game` logic to search for games.
- All game storage will still happen locally in the browser's IndexedDB, keeping the backend completely stateless.

### 2. Proper Frontend (HTML/JS/CSS or Vite/React)
- Create a completely new, polished frontend using vanilla HTML/JS/CSS (or a Vite React app). 
- **Dark Theme UI**: Design a stunning, responsive, dark-themed UI with glassmorphism, dynamic hover effects, and a proper CSS design system.
- **IndexedDB**: Interact with IndexedDB directly in JavaScript on the frontend using standard Web APIs. This eliminates the need for the hacky Streamlit custom component (`components/indexeddb`).
- **Add Game Flow**: Implement a smooth modal/dialog for searching and adding games without page reloads.

## Next Steps
Upon resuming, we need to decide on the frontend framework (Vanilla JS vs Vite/React) and begin the transition by setting up the FastAPI backend and initializing the new frontend project.
