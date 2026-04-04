# AnimeTube Premium Pro

A high-performance Anime Scraper and Streaming UI with a premium "YouTube Blue" aesthetic. This project uses a hybrid architecture with a Python Flask backend for precise scraping and a Vanilla JS frontend for a smooth, responsive user experience.

## 🚀 Features
- **YouTube Premium UI:** Dark mode with Google Blue accents, Material Symbols, and responsive layout.
- **Live Preview Thumbnails:** Real-time extraction of official posters directly from the source.
- **Auto-Play High Res:** Automatically selects and plays the highest resolution available (1080p/720p) instantly upon clicking an episode.
- **Advanced Scraping:** Deep-dives into SvelteKit JSON payloads to extract hidden streaming links that standard scrapers miss.
- **Unified Catalog:** Full A-Z library and real-time search functionality.
- **Hybrid Architecture:** Python (Flask + BeautifulSoup4 + Httpx) provides a robust backend that bypasses common SSL/CORS limitations in mobile environments.

## 🛠️ Tech Stack
- **Backend:** Python 3, Flask, BeautifulSoup4, Httpx (Synchronous Mode).
- **Frontend:** HTML5, CSS3, Vanilla JavaScript.
- **Icons & Fonts:** Material Symbols Outlined, Roboto.

## 📖 Manual Setup (Termux)
If you need to run the project manually after a restart:

1. **Start the Backend:**
   ```bash
   cd ~/anime-scraper && python api.py
   ```
2. **Start the Frontend:**
   (In a new session)
   ```bash
   cd ~/anime-scraper && python -m http.server 8080
   ```
3. **Open Browser:**
   Go to `http://localhost:8080`

## ⚖️ License
MIT - For educational purposes only.
