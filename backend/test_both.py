import asyncio
from providers.oploverz import OploverzProvider

async def main():
    p = OploverzProvider()
    print("--- EPISODE 1 ---")
    ep1 = await p.get_episode_sources("https://o.oploverz.ltd/series/one-piece/episode/1")
    print(ep1['sources'][:2])
    
    print("--- EPISODE 1156 ---")
    ep1156 = await p.get_episode_sources("https://o.oploverz.ltd/series/one-piece/episode/1156")
    print(ep1156['sources'][:2])
    
    await p.close()

if __name__ == "__main__":
    asyncio.run(main())