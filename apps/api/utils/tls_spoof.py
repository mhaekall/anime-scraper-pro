from curl_cffi.requests import AsyncSession
from typing import Optional
import os

class TLSSpoofTransport:
    """
    Gunakan curl_cffi untuk impersonasi Chrome TLS fingerprint.
    Jauh lebih susah dideteksi daripada httpx biasa.
    """
    
    _session: Optional[AsyncSession] = None
    
    @classmethod
    async def get_session(cls) -> AsyncSession:
        if cls._session is None:
            cls._session = AsyncSession(
                impersonate="chrome124",
                timeout=25,
                verify=False, # Ignore verification similar to universal extractor if needed, or True
            )
        return cls._session
    
    @classmethod
    async def get(cls, url: str, **kwargs) -> str:
        session = await cls.get_session()
        resp = await session.get(url, **kwargs)
        resp.raise_for_status()
        return resp.text
    
    @classmethod
    async def post(cls, url: str, **kwargs) -> dict:
        session = await cls.get_session()
        resp = await session.post(url, **kwargs)
        resp.raise_for_status()
        return resp.json()
