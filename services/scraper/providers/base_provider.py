from abc import ABC, abstractmethod
from typing import Dict, Any, List
from providers.base_parser import AnimeDetail, EpisodeSource

class BaseProvider(ABC):
    """
    Common base class for anime providers in the backend.
    Enforces a consistent API contract across all scrapers.
    """
    
    @abstractmethod
    async def get_anime_detail(self, series_url: str) -> AnimeDetail:
        """
        Extract details about an anime series (title, synopsis, episodes, etc.)
        """
        pass

    @abstractmethod
    async def get_episode_sources(self, episode_url: str) -> list[EpisodeSource]:
        """
        Extract video sources from an episode URL.
        """
        pass

    async def search(self, query: str) -> List[Dict[str, Any]]:
        """
        Search for anime by title on the provider site.
        Default implementation returns empty list if not supported.
        """
        return []
