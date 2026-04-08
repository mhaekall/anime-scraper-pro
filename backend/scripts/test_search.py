import asyncio
from providers.oploverz import OploverzProvider

async def main():
    p = OploverzProvider()
    res = await p.search("One Piece")
    print(res)

if __name__ == "__main__":
    asyncio.run(main())
