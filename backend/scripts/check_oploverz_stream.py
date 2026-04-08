import asyncio
from providers.oploverz import OploverzProvider

async def main():
    p = OploverzProvider()
    res = await p.get_episode_sources("https://o.oploverz.ltd/series/one-piece/episode/1156")
    print("Sources from Oploverz Ep 1156:")
    print(res)
    await p.close()

if __name__ == "__main__":
    asyncio.run(main())
