import asyncio
import httpx
import re

async def test_kraken():
    url = "https://krakenfiles.com/view/1BcKd6aV3R/file.html"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    print(f"Testing Krakenfiles: {url}")
    async with httpx.AsyncClient(verify=False, follow_redirects=True) as client:
        res = await client.get(url, headers=headers)
        
        # Token
        match = re.search(r'var\s+token\s*=\s*["\']([^"\']+)["\']', res.text)
        if match:
            token = match.group(1)
            print("Kraken token:", token)
            
            # File hash / post url
            form_match = re.search(r'url:\s*["\'](//krakenfiles.com/download/[^"\']+)["\']', res.text)
            if form_match:
                dl_url = "https:" + form_match.group(1)
                print("DL URL:", dl_url)
                
                res2 = await client.post(dl_url, data={"token": token}, headers=headers)
                print("Kraken DL response status:", res2.status_code)
                try:
                    data = res2.json()
                    print("JSON:", data)
                    if data.get('status') == 'ok' and data.get('url'):
                        print("FOUND DIRECT LINK:", data['url'])
                except:
                    print("Text:", res2.text[:200])

if __name__ == "__main__":
    asyncio.run(test_kraken())
