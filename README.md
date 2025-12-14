# 🎵 LLM-Enhanced Multimodal Music Discovery

An HCI research platform exploring **voice, text, and slider-based interaction** for mood-based music discovery, enhanced using **Groq AI (Llama 3.3 70B Versatile)**.

This project is designed to support **rigorous Human–Computer Interaction (HCI) evaluation**, combining modern AI techniques with standardized usability metrics.

---

🚀 Project Overview

Goal  
To study how different interaction modalities affect user efficiency, usability, and cognitive load in AI-enhanced music discovery.

Interaction Modalities:
- 🎤 **Voice Interface** – Natural language queries
- ⌨️ **Text Interface** – Keyword-based search
- 🎚️ **Slider Interface** – Direct control of audio features

AI Enhancement:
Groq AI LLM is used to understand user intent, enhance search queries, and recommend trending music aligned with user mood and context.

---

## 🧠 System Architecture

- Frontend Layer: Voice UI, Text UI, Slider UI
  Backend Layer:
  - LLM-based query enhancement (Llama 3.3 70B)
  - Spotify Web API integration
  - Track deduplication and curation
- **Data Layer:**
  - SQLite database for logs, metrics, and feedback

This unified pipeline enables **fair comparison across modalities** for HCI research.

---

 ✨ Key Features

- LLM-enhanced mood and intent understanding
- Hybrid recommendation strategy (curated + live search)
- Smart deduplication to remove covers and duplicates
- Artist diversity control
- Consistent 10-track result set per query
- Research-ready logging and evaluation infrastructure

---

 📊 Key Results

- **28% improvement in search relevance** after LLM integration
- **Consistent 10 unique tracks** returned for every query
- **Voice interface** enabled fastest discovery but had higher error rates
- **Slider interface** achieved highest usability scores (SUS)

---

 🔬 HCI Research Infrastructure

The system supports standard usability and UX evaluation methods:

- **SUS (System Usability Scale)**
- **NASA-TLX (Cognitive Load)**
- **UEQ (User Experience Questionnaire)**

### Database Tables (10 Total)
- Track feedback
- Interaction events
- Task completions
- Error logs
- Comparative searches
- SUS, NASA-TLX, UEQ surveys
- Session tracking
- Accessibility preferences

---

## 🛠️ Tech Stack

### Frontend
- React
- Tailwind CSS
- Web Speech API
- Axios

### Backend
- Node.js
- Express
- SQLite
- Spotify Web API

### AI / LLM
- **Provider:** Groq
- **Model:** Llama 3.3 70B Versatile

---

## 📁 Project Structure

```plaintext
HCIproject/
├── backend/
│   ├── services/
│   │   ├── llmMusicEnhancer.js
│   │   ├── trackDeduplicator.js
│   │   └── curatedTracksService.js
│   ├── data/
│   │   └── curatedTracks.json
│   ├── routes/
│   └── database/
├── frontend/
├── README.md
