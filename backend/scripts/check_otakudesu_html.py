import asyncio, httpx
from bs4 import BeautifulSoup

async def main():
    async with httpx.AsyncClient(verify=False) as c:
        url = "https://otakudesu.cloud/anime/one-piece-sub-indo/"
        r = await c.get(url)
        print("Status:", r.status_code)
        soup = BeautifulSoup(r.text, 'lxml')
        ep_list = soup.find('div', class_='episodelist')
        if ep_list:
            links = ep_list.find_all('a')
            print("Links found in episodelist:", len(links))
            for a in links[:5]:
                print(a.text, a['href'])
        else:
            print("No episodelist found.")
            print(r.text[:500])

asyncio.run(main())
