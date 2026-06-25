# BigQuery Release Hub 🚀

A modern web application built using Python Flask, vanilla HTML, JavaScript, and CSS that fetches Google Cloud's BigQuery Release notes and enables users to easily select and share specific updates to Twitter/X.

## Features

- 🔄 **Real-time Feed Syncing**: Fetches the official GCP BigQuery release notes XML feed in real time.
- ⚡ **Optimized Caching**: Features a 5-minute in-memory cache to ensure super-fast page loads and avoid feed rate limits.
- 🎛️ **Type Filtering**: Instantly filter updates by classification, including:
  - `Features` (New features and capabilities)
  - `Changes` (Modifications to existing functionality)
  - `Deprecations` (Deprecated APIs, features, or workflows)
  - `Bug Fixes` (Corrected issues)
- 🔍 **Interactive Keyword Search**: Instant text search across dates, release titles, and content.
- 🐦 **Direct X (Twitter) Sharing**: Select any specific sub-update, customize the pre-formatted draft tweet inside a custom modal, monitor the character limits with a sleek progress ring, and publish directly to Twitter/X.
- 🌓 **Sleek Dual-Theme**: Gorgeous dark-mode by default, with a fluid toggle to light mode.
- 📱 **Fully Responsive**: Crafted with modern, fluid, mobile-friendly CSS.

## Getting Started

### Prerequisites

- Python 3.8 or higher

### Installation

1. Clone or download this project.
2. Initialize and activate the virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Running the Application

Start the Flask development server:
```bash
# Windows
.venv\Scripts\python app.py

# macOS / Linux
python app.py
```

The application will be available at: **`http://127.0.0.1:5000`**

## Project Structure

- [app.py](file:///C:/Users/nayana/agy-cli-projects/bq-release-notes/app.py): The Flask backend that fetches/parses the RSS feed, parses HTML sub-updates, and handles in-memory caching.
- [templates/index.html](file:///C:/Users/nayana/agy-cli-projects/bq-release-notes/templates/index.html): The core HTML structure, layouts, modal windows, and CDNs for icons.
- [static/css/styles.css](file:///C:/Users/nayana/agy-cli-projects/bq-release-notes/static/css/styles.css): The custom theme engine (light/dark colors, cards, layout, modals, transitions, animations).
- [static/js/app.js](file:///C:/Users/nayana/agy-cli-projects/bq-release-notes/static/js/app.js): Handles API interactions, client-side filtering, state, theme changes, and the Twitter modal composer.
