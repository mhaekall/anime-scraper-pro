import re

def extract_episode_number(title: str):
    if not title: return None
    m = re.search(r"(?:episode|eps?)[.\s]*(\d+(?:[.,]\d+)?)", title, re.IGNORECASE)
    if m: return float(m.group(1).replace(",", "."))
    return None

titles = ["Episode 1", "Eps 12", "OVA 1", "Season 2 Episode 5", "Episode 12.5", "1", "Ep.12"]
for t in titles:
    print(f"{t} -> {extract_episode_number(t)}")
