import httpx
import urllib.parse

async def translate_en_to_id(text: str) -> str:
    if not text:
        return text
    
    url = "https://translate.googleapis.com/translate_a/single"
    params = {
        "client": "gtx",
        "sl": "en",
        "tl": "id",
        "dt": "t",
        "q": text
    }
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                # data[0] contains the translated segments
                translated = "".join([segment[0] for segment in data[0] if segment[0]])
                return translated
            return text
    except Exception as e:
        print(f"Translation failed: {e}")
        return text
