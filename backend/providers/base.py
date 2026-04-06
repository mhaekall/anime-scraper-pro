import httpx
from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseProvider(ABC):
    """
    Common base class for anime providers.
    All providers should inherit from this to enforce a consistent API contract.
    """
    
    @abstractmethod
    def __init__(self):
        self.client: httpx.AsyncClient = None

    @abstractmethod
    async def get_episode_sources(self, episode_url: str) -> Dict[str, Any]:
        """
        Extract video sources from an episode URL.
        Must return a dict containing at least a 'sources' key with a list of sources.
        """
        pass

    # Optional methods that can be overridden
    async def get_anime_detail(self, series_url: str) -> Dict[str, Any]:
        """
        Extract details about an anime series (title, synopsis, episodes, etc.)
        """
        pass

    async def search(self, query: str) -> List[Dict[str, Any]]:
        """
        Search for anime by title.
        """
        pass
