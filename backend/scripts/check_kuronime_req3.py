import re
from bs4 import BeautifulSoup

def extract_context():
    with open("test_kuronime_ep.html", "r") as f:
        html = f.read()
    
    soup = BeautifulSoup(html, "lxml")
    for script in soup.find_all("script"):
        if script.string and "dXl1RHBY" in script.string:
            print(script.string.strip())

if __name__ == "__main__":
    extract_context()