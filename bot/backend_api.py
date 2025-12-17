from __future__ import annotations

from typing import Any, Dict, Optional

import httpx


class BackendApiClient:
  def __init__(self, base_url: str, bot_token: str) -> None:
    self._base_url = base_url.rstrip("/")
    self._bot_token = bot_token
    self._client = httpx.AsyncClient(base_url=self._base_url, timeout=10.0)

  async def close(self) -> None:
    await self._client.aclose()

  def _headers_for_user(self, telegram_id: int) -> Dict[str, str]:
    return {
      "x-bot-token": self._bot_token,
      "x-telegram-id": str(telegram_id),
    }

  async def sync_user(
    self,
    telegram_id: int,
    username: Optional[str],
    first_name: str,
    photo_url: Optional[str],
    referrer_id: Optional[str] = None,
  ) -> Dict[str, Any]:
    payload = {
      "id": str(telegram_id),
      "username": username,
      "firstName": first_name,
      "photoUrl": photo_url,
      "referrerId": referrer_id,
    }
    res = await self._client.post(
      "/api/bot/user-sync",
      json=payload,
      headers={"x-bot-token": self._bot_token},
    )
    res.raise_for_status()
    data = res.json()
    return data.get("user", {})

  async def get_me(self, telegram_id: int) -> Dict[str, Any]:
    res = await self._client.get(
      "/api/me",
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def get_public_settings(self) -> Dict[str, Any]:
    res = await self._client.get("/api/settings/public")
    res.raise_for_status()
    return res.json()
