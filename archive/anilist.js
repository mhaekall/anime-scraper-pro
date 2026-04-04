const axios = require('axios');

// In-memory cache to prevent hitting AniList rate limits for the same anime
const anilistCache = new Map();

const GET_ANIME_DETAILS = `
  query ($search: String) {
    Media(search: $search, type: ANIME) {
      id
      title {
        romaji
        english
      }
      coverImage {
        extraLarge
        large
        color
      }
      bannerImage
      averageScore
    }
  }
`;

/**
 * Fetches HD cover image and accurate title from AniList based on a search query.
 * @param {string} title - The scraped title from Oploverz.
 * @returns {Promise<Object|null>} An object containing hdImage and cleanTitle, or null if not found.
 */
async function fetchAniListInfo(title) {
  // Clean up the title further for better searching
  const searchQuery = title.replace(/\b(episode|ep|sub indo|batch)\b/gi, '').trim();
  
  if (anilistCache.has(searchQuery)) {
    return anilistCache.get(searchQuery);
  }

  try {
    const response = await axios.post('https://graphql.anilist.co', {
      query: GET_ANIME_DETAILS,
      variables: { search: searchQuery }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });

    const media = response.data?.data?.Media;
    
    if (media) {
      const result = {
        cleanTitle: media.title.english || media.title.romaji,
        hdImage: media.coverImage.extraLarge || media.coverImage.large,
        banner: media.bannerImage,
        score: media.averageScore
      };
      
      anilistCache.set(searchQuery, result);
      return result;
    }
    
    // If not found, cache null to avoid repeating failed searches
    anilistCache.set(searchQuery, null);
    return null;
  } catch (error) {
    console.error(`[AniList] Error fetching data for "${searchQuery}":`, error.message);
    return null;
  }
}

module.exports = {
  fetchAniListInfo
};
