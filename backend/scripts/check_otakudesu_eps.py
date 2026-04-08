import asyncio
import httpx
from providers.otakudesu import OtakudesuProvider

async def main():
    p = OtakudesuProvider()
    res = await p.get_anime_detail("https://otakudesu.cloud/anime/one-piece-sub-indo/")
    print("Episodes from Otakudesu:")
    print(res['episodes'][:5])
    print(res['episodes'][-5:])
    await p.close()

if __name__ == "__main__":
    asyncio.run(main())