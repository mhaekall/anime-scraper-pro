import urllib.request
import json
for i in range(5):
    try:
        req = urllib.request.Request("http://127.0.0.1:3000/api/home")
        with urllib.request.urlopen(req) as response:
            print("OK", response.status)
    except urllib.error.HTTPError as e:
        print("ERROR", e.code, e.read().decode())
    except Exception as e:
        print("FAILED", e)
