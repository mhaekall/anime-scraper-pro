import sys
import re

with open('/data/data/com.termux/files/home/workspace/anime-scraper-pro/backend/main.py', 'r') as f:
    code = f.read()

# 1. Update GET_ANIME_DETAILS to use Page to get multiple results
old_gql = '''GET_ANIME_DETAILS = """
  query ($search: String) {
    Media(search: $search, type: ANIME) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        extraLarge
        large
        color
      }
      bannerImage
      averageScore
      popularity
      trending
      episodes
      status
      season
      seasonYear
      description(asHtml: false)
      genres
      studios {
        nodes {
          name
          isAnimationStudio
        }
      }
      recommendations {
        nodes {
          mediaRecommendation {
            id
            title { romaji english }
            coverImage { large }
          }
        }
      }
      nextAiringEpisode {
        episode
        timeUntilAiring
      }
    }
  }
"""'''

new_gql = '''GET_ANIME_DETAILS = """
  query ($search: String) {
    Page(page: 1, perPage: 5) {
      media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          extraLarge
          large
          color
        }
        bannerImage
        averageScore
        popularity
        trending
        episodes
        status
        season
        seasonYear
        description(asHtml: false)
        genres
        studios {
          nodes {
            name
            isAnimationStudio
          }
        }
        recommendations {
          nodes {
            mediaRecommendation {
              id
              title { romaji english }
              coverImage { large }
            }
          }
        }
        nextAiringEpisode {
          episode
          timeUntilAiring
        }
      }
    }
  }
"""'''

code = code.replace(old_gql, new_gql)

# 2. Update fetch_anilist_info logic
old_fetch = '''async def fetch_anilist_info(title: str):
    search_query = re.sub(r'\\b(episode|ep|sub indo|batch)\\b', '', title, flags=re.IGNORECASE).strip()
    
    if search_query in anilist_cache:
        return anilist_cache[search_query]

    async with anilist_sem:
        try:
            response = await client.post('https://graphql.anilist.co', json={
                'query': GET_ANIME_DETAILS,
                'variables': {'search': search_query}
            })
            
            data = response.json()
            if not data or 'data' not in data:
                anilist_cache[search_query] = None
                return None
                
            media = data.get('data', {}).get('Media')
            
            if media:
                # Extract studios
                studios = []
                if media.get('studios') and media['studios'].get('nodes'):
                    studios = [s['name'] for s in media['studios']['nodes'] if s.get('isAnimationStudio')]
                
                # Extract recommendations
                recs = []
                if media.get('recommendations') and media['recommendations'].get('nodes'):
                    for r in media['recommendations']['nodes']:
                        rec_media = r.get('mediaRecommendation')
                        if rec_media:
                            recs.append({
                                'id': rec_media.get('id'),
                                'title': rec_media.get('title', {}).get('english') or rec_media.get('title', {}).get('romaji'),
                                'cover': rec_media.get('coverImage', {}).get('large')
                            })

                result = {
                    'cleanTitle': media['title']['english'] or media['title']['romaji'],
                    'nativeTitle': media['title'].get('native'),
                    'hdImage': media['coverImage']['extraLarge'] or media['coverImage']['large'],
                    'color': media['coverImage'].get('color'),
                    'banner': media['bannerImage'],
                    'score': media['averageScore'],
                    'popularity': media.get('popularity', 0),
                    'trending': media.get('trending', 0),
                    'description': media.get('description'),
                    'genres': media.get('genres', []),
                    'episodes': media.get('episodes'),
                    'status': media.get('status'),
                    'season': media.get('season'),
                    'seasonYear': media.get('seasonYear'),
                    'studios': studios,
                    'recommendations': recs,
                    'nextAiringEpisode': media.get('nextAiringEpisode')
                }
                anilist_cache[search_query] = result
                return result
                
            anilist_cache[search_query] = None
            return None
        except Exception as e:
            print(f"[AniList] Error fetching data for '{search_query}': {str(e)}")
            return None'''

new_fetch = '''def roman_to_int(s):
    rom_val = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000}
    int_val = 0
    for i in range(len(s)):
        if i > 0 and rom_val[s[i]] > rom_val[s[i - 1]]:
            int_val += rom_val[s[i]] - 2 * rom_val[s[i - 1]]
        else:
            int_val += rom_val[s[i]]
    return int_val

async def fetch_anilist_info(title: str):
    # 1. Basic Sanitization
    search_query = re.sub(r'\\b(episode|ep|sub indo|batch)\\b', '', title, flags=re.IGNORECASE).strip()
    
    # 2. Season Extraction
    season_match = re.search(r'\\b(?:S|Season|Part)\\s*(\\d+|[IVX]+)\\b', search_query, re.IGNORECASE)
    target_season = None
    if season_match:
        val = season_match.group(1).upper()
        if val.isdigit():
            target_season = int(val)
        else:
            target_season = roman_to_int(val)
            
    # Remove Season info for better base search
    base_query = re.sub(r'\\b(?:S|Season|Part)\\s*(\\d+|[IVX]+)\\b', '', search_query, flags=re.IGNORECASE).strip()
    # Also clean up punctuation like ":" or "-" left behind
    base_query = re.sub(r'[^a-zA-Z0-9 ]', ' ', base_query).strip()
    base_query = re.sub(r'\\s+', ' ', base_query)
    
    cache_key = f"{base_query}_S{target_season}" if target_season else base_query
    
    if cache_key in anilist_cache:
        return anilist_cache[cache_key]

    async with anilist_sem:
        try:
            # We search using the raw search_query first, if it fails we will use base_query
            response = await client.post('https://graphql.anilist.co', json={
                'query': GET_ANIME_DETAILS,
                'variables': {'search': search_query}
            })
            
            data = response.json()
            media_list = data.get('data', {}).get('Page', {}).get('media', [])
            
            if not media_list and target_season:
                # Fallback to base_query
                response = await client.post('https://graphql.anilist.co', json={
                    'query': GET_ANIME_DETAILS,
                    'variables': {'search': base_query}
                })
                data = response.json()
                media_list = data.get('data', {}).get('Page', {}).get('media', [])

            if not media_list:
                anilist_cache[cache_key] = None
                return None
                
            # Smart Matching: If target_season exists, try to find a media title that contains that season
            media = media_list[0] # Default to best match
            
            if target_season:
                for m in media_list:
                    titles = [m['title'].get('romaji') or '', m['title'].get('english') or '']
                    combined_title = " ".join(titles).lower()
                    # Check if title contains the season number (e.g. season 4, 4th season, IV)
                    if re.search(fr'\\b(?:season\\s*{target_season}|{target_season}th\\s*season|part\\s*{target_season})\\b', combined_title) or \\
                       re.search(fr'\\b(season|part)\\s+{target_season}\\b', combined_title):
                        media = m
                        break
            
            # Extract studios
            studios = []
            if media.get('studios') and media['studios'].get('nodes'):
                studios = [s['name'] for s in media['studios']['nodes'] if s.get('isAnimationStudio')]
            
            # Extract recommendations
            recs = []
            if media.get('recommendations') and media['recommendations'].get('nodes'):
                for r in media['recommendations']['nodes']:
                    rec_media = r.get('mediaRecommendation')
                    if rec_media:
                        recs.append({
                            'id': rec_media.get('id'),
                            'title': rec_media.get('title', {}).get('english') or rec_media.get('title', {}).get('romaji'),
                            'cover': rec_media.get('coverImage', {}).get('large')
                        })

            result = {
                'anilistId': media['id'],
                'cleanTitle': media['title']['english'] or media['title']['romaji'],
                'nativeTitle': media['title'].get('native'),
                'hdImage': media['coverImage']['extraLarge'] or media['coverImage']['large'],
                'color': media['coverImage'].get('color'),
                'banner': media['bannerImage'],
                'score': media['averageScore'],
                'popularity': media.get('popularity', 0),
                'trending': media.get('trending', 0),
                'description': media.get('description'),
                'genres': media.get('genres', []),
                'episodes': media.get('episodes'),
                'status': media.get('status'),
                'season': media.get('season'),
                'seasonYear': media.get('seasonYear'),
                'studios': studios,
                'recommendations': recs,
                'nextAiringEpisode': media.get('nextAiringEpisode')
            }
            anilist_cache[cache_key] = result
            return result
                
        except Exception as e:
            print(f"[AniList] Error fetching data for '{search_query}': {str(e)}")
            return None'''

code = code.replace(old_fetch, new_fetch)

# 3. Update get_episodes to use floats
old_get_ep = '''            for ep_num in matches:
                if ep_num not in seen:
                    seen.add(ep_num)
                    full_url = f"{url.rstrip('/')}/episode/{ep_num}"
                    episodes.append({'title': f'Episode {ep_num}', 'url': full_url})'''

new_get_ep = '''            for ep_num in matches:
                if ep_num not in seen:
                    seen.add(ep_num)
                    full_url = f"{url.rstrip('/')}/episode/{ep_num}"
                    try:
                        parsed_num = float(ep_num)
                    except ValueError:
                        parsed_num = 0.0
                    episodes.append({
                        'title': f'Episode {ep_num}', 
                        'url': full_url,
                        'number': parsed_num
                    })
            
            # Sort episodes descending (latest first)
            episodes.sort(key=lambda x: x['number'], reverse=True)'''

code = code.replace(old_get_ep, new_get_ep)

with open('/data/data/com.termux/files/home/workspace/anime-scraper-pro/backend/main.py', 'w') as f:
    f.write(code)
