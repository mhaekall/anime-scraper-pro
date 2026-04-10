import re
from bs4 import BeautifulSoup

def analyze():
    with open("test_kuronime_ep.html", "r") as f:
        html = f.read()
    soup = BeautifulSoup(html, "lxml")
    
    # Check all scripts
    for script in soup.find_all("script"):
        if script.string:
            match = re.search(r'([A-Za-z0-9+/=]{100,})', script.string)
            if match:
                print("Found long base64 string in script:", match.group(1)[:50], "...")

    # Check for any elements with specific attributes
    for el in soup.find_all(True):
        for attr, value in el.attrs.items():
            if isinstance(value, str) and len(value) > 100 and value.endswith('='):
                print(f"Element {el.name} has long base64-like attribute {attr}: {value[:50]}...")

    # Look for anything like data-video, data-id, etc.
    for el in soup.find_all(attrs={"data-video": True}):
        print("data-video:", el["data-video"])

if __name__ == "__main__":
    analyze()
