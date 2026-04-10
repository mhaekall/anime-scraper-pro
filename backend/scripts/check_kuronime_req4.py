import re

def test_extract():
    with open("test_kuronime_ep.html", "r") as f:
        html = f.read()
        
    matches = re.findall(r'var\s+[a-zA-Z0-9_]+\s*=\s*["\']([^"\']{100,})["\']', html)
    for m in matches:
        print("Found payload length:", len(m))
        print("Payload prefix:", m[:20])

if __name__ == "__main__":
    test_extract()