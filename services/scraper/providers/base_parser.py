from abc import ABC, abstractmethod
from typing import TypedDict

class EpisodeItem(TypedDict):
    number: float
    title: str
    url: str
    thumbnail: str | None

class AnimeDetail(TypedDict):
    episodes: list[EpisodeItem]
    poster: str | None
    synopsis: str

class EpisodeSource(TypedDict):
    provider: str
    quality: str
    url: str
    type: str

class BaseParser(ABC):
    """Pure DOM logic — zero HTTP calls."""

    @abstractmethod
    def parse_episode_list(self, html: str, base_url: str) -> AnimeDetail:
        ...

    @abstractmethod
    def parse_episode_sources(self, html: str) -> list[EpisodeSource]:
        ...