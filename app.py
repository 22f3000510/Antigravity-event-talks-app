import time
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Constants
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_EXPIRY_SECONDS = 300  # 5 minutes

# In-memory cache
cache = {
    "data": None,
    "last_fetched": 0
}

def parse_html_content(html_content):
    """
    Parses the release notes HTML content into individual update items.
    Each item has a type (from h3) and its corresponding html content.
    """
    if not html_content:
        return []
    
    soup = BeautifulSoup(html_content, "html.parser")
    items = []
    current_type = None
    current_html_parts = []
    
    # Iterate through all contents in order
    for child in soup.contents:
        if child.name == 'h3':
            # Save the previous item before starting a new one
            if current_type:
                html_str = "".join(current_html_parts).strip()
                # Extract text for tweet helper
                item_soup = BeautifulSoup(html_str, "html.parser")
                text_str = item_soup.get_text()
                items.append({
                    "type": current_type,
                    "html": html_str,
                    "text": text_str
                })
            
            current_type = child.get_text().strip()
            current_html_parts = []
        else:
            current_html_parts.append(str(child))
            
    # Add the last item
    if current_type:
        html_str = "".join(current_html_parts).strip()
        item_soup = BeautifulSoup(html_str, "html.parser")
        text_str = item_soup.get_text()
        items.append({
            "type": current_type,
            "html": html_str,
            "text": text_str
        })
        
    # Fallback if no <h3> tags were found
    if not items and html_content.strip():
        items.append({
            "type": "Update",
            "html": html_content.strip(),
            "text": soup.get_text()
        })
        
    return items

def generate_tweet_text(date, item_type, text_content, link):
    """
    Generates a default tweet text under 280 characters.
    """
    hashtag = "#BigQuery"
    # Basic structure: "BigQuery {type} ({date}): {content} {link} {hashtag}"
    prefix = f"BigQuery {item_type} ({date}): "
    suffix = f" {link} {hashtag}"
    
    # Calculate how much space is left for the content
    max_content_len = 280 - len(prefix) - len(suffix) - 3  # -3 for "..."
    
    # Clean up whitespace in text content
    clean_text = " ".join(text_content.split())
    
    if len(clean_text) > max_content_len:
        content_snippet = clean_text[:max_content_len].strip()
        # Find last space to not cut word in half
        last_space = content_snippet.rfind(' ')
        if last_space > max_content_len // 2:
            content_snippet = content_snippet[:last_space]
        content_snippet += "..."
    else:
        content_snippet = clean_text
        
    tweet = f"{prefix}{content_snippet}{suffix}"
    return tweet

def fetch_and_parse_feed(force_refresh=False):
    current_time = time.time()
    
    # Return cache if valid and not forced
    if not force_refresh and cache["data"] and (current_time - cache["last_fetched"] < CACHE_EXPIRY_SECONDS):
        return cache["data"], False
        
    try:
        # Fetch RSS XML feed
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        # Parse with feedparser
        feed = feedparser.parse(response.content)
        
        releases = []
        for index, entry in enumerate(feed.entries):
            date = entry.title
            link = entry.link
            entry_id = entry.id if hasattr(entry, 'id') else f"item-{index}"
            
            # Get the content or summary
            html_content = ""
            if hasattr(entry, 'content') and entry.content:
                html_content = entry.content[0].value
            elif hasattr(entry, 'summary'):
                html_content = entry.summary
                
            items = parse_html_content(html_content)
            
            # Enrich items with a default tweet text
            for item_idx, item in enumerate(items):
                item["id"] = f"{entry_id}-item-{item_idx}"
                item["tweet_text"] = generate_tweet_text(date, item["type"], item["text"], link)
                item["link"] = link
                item["date"] = date
                
            releases.append({
                "id": entry_id,
                "date": date,
                "link": link,
                "items": items
            })
            
        data = {
            "releases": releases,
            "feed_title": feed.feed.title if hasattr(feed.feed, 'title') else "BigQuery Release Notes",
            "feed_link": feed.feed.link if hasattr(feed.feed, 'link') else "https://cloud.google.com/bigquery/docs/release-notes",
            "fetched_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(current_time))
        }
        
        cache["data"] = data
        cache["last_fetched"] = current_time
        return data, True
        
    except Exception as e:
        # If fetch fails but cache exists, return stale cache as backup
        if cache["data"]:
            return cache["data"], False
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        data, did_refresh = fetch_and_parse_feed(force_refresh=force_refresh)
        return jsonify({
            "status": "success",
            "data": data,
            "cached": not did_refresh
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
