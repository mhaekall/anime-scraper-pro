import asyncio, httpx
async def main():
    async with httpx.AsyncClient(verify=False) as c:
        r = await c.get('https://o.oploverz.ltd/series/one-piece/episode/1', follow_redirects=False)
        print("Status:", r.status_code)
        print("Location:", r.headers.get('location'))
        r = await c.get('https://o.oploverz.ltd/series/one-piece/episode/1', follow_redirects=True)
        print("Final URL:", r.url)
asyncio.run(main())
