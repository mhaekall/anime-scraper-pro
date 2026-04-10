import asyncio
import httpx

async def check():
    slugs = [
        "tensei-shitara-slime-datta-ken",
        "tensei-shitara-slime-datta-ken-2nd-season",
        "tensei-shitara-slime-datta-ken-season-2-part-2",
        "tensei-shitara-slime-datta-ken-season-3",
        "youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e",
        "classroom-of-the-elite",
        "classroom-of-the-elite-season-2",
        "classroom-of-the-elite-season-3",
        "mushoku-tensei-isekai-ittara-honki-dasu",
        "mushoku-tensei-isekai-ittara-honki-dasu-part-2",
        "mushoku-tensei-ii-isekai-ittara-honki-dasu",
        "mushoku-tensei-ii-isekai-ittara-honki-dasu-part-2"
    ]
    async with httpx.AsyncClient(verify=False, follow_redirects=True) as c:
        for s in slugs:
            url = f"https://v2.samehadaku.how/anime/{s}/"
            r = await c.get(url, headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code == 200 and "anime" in r.text:
                print(f"✅ VALID: {s}")
            else:
                print(f"❌ INVALID: {s} (Status: {r.status_code})")

if __name__ == "__main__":
    asyncio.run(check())
