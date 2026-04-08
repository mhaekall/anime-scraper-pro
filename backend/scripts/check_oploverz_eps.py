import asyncio
from providers.oploverz import OploverzProvider

async def main():
    p = OploverzProvider()
    res = await p.get_anime_detail("https://o.oploverz.ltd/series/one-piece/")
    print("Episodes from Oploverz:")
    print(res['episodes'][:5])
    await p.close()

if __name__ == "__main__":
    asyncio.run(main())