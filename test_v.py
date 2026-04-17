import asyncio
import os
import sys

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'apps', 'api'))
from apps.api.services.providers import otakudesu_provider, doronime_provider

async def main():
    print("Fetching otakudesu...")
    det = await otakudesu_provider.get_anime_detail("https://otakudesu.cloud/anime/tensei-shitara-slime-datta-ken-sub-indo/")
    print(det)
            
    print("\nFetching doronime...")
    det2 = await doronime_provider.get_anime_detail("https://doronime.id/anime/tensei-shitara-slime-datta-ken/")
    print(det2)

if __name__ == "__main__":
    asyncio.run(main())
