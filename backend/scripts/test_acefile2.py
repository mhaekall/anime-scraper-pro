import re
import urllib.parse

def unpack(p, a, c, k, e=None, d=None):
    def e(c):
        res = ''
        if c < a:
            res = ''
        else:
            res = e(int(c / a))
        c = c % a
        if c > 35:
            return res + chr(c + 29)
        else:
            return res + str(urllib.parse.unquote(urllib.parse.quote(str(c).encode()) if c < 10 else chr(c + 87)))

    while c > 0:
        c -= 1
        if k[c]:
            p = re.sub(r'\b' + e(c) + r'\b', k[c], p)
    return p

import httpx
import asyncio

async def test():
    url = "https://acefile.co/player/111377159"
    headers = {"User-Agent": "Mozilla/5.0"}
    async with httpx.AsyncClient(verify=False, follow_redirects=True) as client:
        res = await client.get(url, headers=headers)
        match = re.search(r"eval\(function\(p,a,c,k,e,d\).*?return p}\('(.*?)',\s*(\d+),\s*(\d+),\s*'(.*?)'\.split", res.text)
        if match:
            p = match.group(1)
            a = int(match.group(2))
            c = int(match.group(3))
            k = match.group(4).split('|')
            unpacked = unpack(p, a, c, k)
            with open("unpacked.js", "w") as f:
                f.write(unpacked)
            print("Unpacked JS saved to unpacked.js")

        else:
            print("No packed JS found")

asyncio.run(test())
