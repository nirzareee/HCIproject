# Code Structure Guide
 Project Directory Structure

HCIPROJECT/
├── backend/                    # Node.js Express backend
│   ├── config/
│   │   └── database.js        # SQLite database connection
│   ├── data/
│   │   └── curatedTracks.json # Popular artist tracks database
│   ├── database/
│   │   ├── extended_schema.sql # HCI research tables
│   │   ├── logger.js          # Database logging functions
│   │   └── study_data.db      # SQLite database file
│   ├── routes/
│   │   ├── logging.js         # Research data logging endpoints
│   │   ├── search.js          # Text/slider search endpoints
│   │   └── voice.js           # Voice search endpoints
│   ├── services/
│   │   ├── curatedTracksService.js  # Curated tracks management
│   │   ├── llmMusicEnhancer.js      # Groq AI LLM integration
│   │   ├── nlpProcessor.js          # NLP mood detection
│   │   ├── spotifyAPI.js            # Spotify API wrapper
│   │   └── trackDeduplicator.js     # Duplicate filtering
│   ├── .env                   # Environment variables (API keys)
│   ├── package.json           # Backend dependencies
│   └── server.js              # Express server entry point
│
├── frontend/                   # React frontend
│   ├── public/
│   │   ├── index.html         # HTML template
│   │   └── favicon.ico        # App icon
│   ├── src/
│   │   ├── components/
│   │   │   ├── AccessibilityMenu.jsx  # Accessibility settings
│   │   │   ├── MusicPlayer.jsx        # Track player & results
│   │   │   ├── SliderInterface.jsx    # Audio feature sliders
│   │   │   ├── TextSearch.jsx         # Text search input
│   │   │   └── VoiceInterface.jsx     # Voice recognition UI
│   │   ├── context/
│   │   │   └── ThemeContext.js        # Dark/light theme
│   │   ├── App.js             # Main app component
│   │   ├── index.js           # React entry point
│   │   └── index.css          # Global styles
│   ├── package.json           # Frontend dependencies
│   └── tailwind.config.js     # Tailwind CSS config
│
├── Documentation Files
│   ├── README.md              # Main project README

---
 Detailed File Explanations

 Backend Core Files

#### `backend/server.js` (Entry Point)
**Purpose:** Express server initialization and routing setup

```javascript
// What it does:
1. Loads environment variables (.env)
2. Sets up Express middleware (CORS, JSON parsing)
3. Registers route handlers
4. Starts server on port 5001
5. Handles graceful shutdown

**Dependencies:**
- Express.js
- CORS
- dotenv
- Route modules

---

Backend Routes

#### `backend/routes/search.js`
**Purpose:** Handles text and slider-based searches

**Endpoints:**
```javascript
POST /api/search/text
  Body: { query: "happy music", participantId: "P001" }
  Returns: Array of 10 tracks

POST /api/search/sliders
  Body: { energy: 0.8, valence: 0.7, danceability: 0.9, tempo: 120 }
  Returns: Array of 10 tracks
```

Flow
1. Receive search request
2. Use LLM to enhance query (llmMusicEnhancer)
3. Fetch curated tracks (curatedTracksService)
4. Search Spotify API (spotifyAPI)
5. Combine results (3 curated + search)
6. Re-rank with LLM
7. Deduplicate (trackDeduplicator)
8. Return 10 unique tracks

Key Dependencies
- `llmMusicEnhancer.js` - Query enhancement
- `curatedTracksService.js` - Popular tracks
- `spotifyAPI.js` - Spotify integration
- `trackDeduplicator.js` - Filtering

---

#### `backend/routes/voice.js`
**Purpose:** Handles voice search requests

Endpoints:
```javascript
POST /api/voice/search
  Body: { transcription: "I want happy Taylor Swift music" }
  Returns: Array of 10 tracks
```

Flow:
1. Receive voice transcription from frontend
2. Use LLM to understand intent
3. Extract mood, artists, keywords
4. Fetch curated + search results
5. Mix and deduplicate
6. Return 10 tracks

Differences from search.js:
- Focuses on natural language understanding
- More reliant on LLM for query interpretation
- Same mixing strategy (3 curated + search)

Data Flow Architecture

 Complete Search Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Voice     │  │     Text     │  │   Sliders    │      │
│  │  Interface   │  │    Search    │  │  Interface   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                     POST /api/search                         │
│                     POST /api/voice                          │
└────────────────────────────┼─────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Express)                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Routes (voice.js / search.js)                │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     ↓                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      1. LLM Enhancement (llmMusicEnhancer.js)        │  │
│  │         - Analyze query                              │  │
│  │         - Extract mood, artists, keywords            │  │
│  │         - Use Groq AI Llama 3.3 70B                  │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     ↓                                       │
│         ┌───────────┴────────────┐                         │
│         ↓                        ↓                         │
│  ┌──────────────┐         ┌──────────────┐                │
│  │   Curated    │         │   Spotify    │                │
│  │   Tracks     │         │   Search     │                │
│  │  (3 max)     │         │     API      │                │
│  └──────┬───────┘         └──────┬───────┘                │
│         │                        │                         │
│         └───────────┬────────────┘                         │
│                     ↓                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      2. Combine Results                              │  │
│  │         - Mix curated + search                       │  │
│  │         - Re-rank with LLM                           │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     ↓                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      3. Filter & Deduplicate                         │  │
│  │         - Remove covers (trackDeduplicator)          │  │
│  │         - Ensure diversity (max 3 per artist)        │  │
│  │         - Remove duplicates                          │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     ↓                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      4. Return 10 Unique Tracks                      │  │
│  └──────────────────┬───────────────────────────────────┘  │
└────────────────────────┼─────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                 FRONTEND (React)                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         MusicPlayer.jsx                              │  │
│  │         - Display track cards                        │  │
│  │         - Play 30-second previews                    │  │
│  │         - Show album artwork                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

