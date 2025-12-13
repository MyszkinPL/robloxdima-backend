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
  ) -> Dict[str, Any]:
    payload = {
      "id": str(telegram_id),
      "username": username,
      "firstName": first_name,
      "photoUrl": photo_url,
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
    data = res.json()
    return data.get("user", {})

  async def get_wallet_history(self, telegram_id: int) -> Dict[str, Any]:
    res = await self._client.get(
      "/api/wallet/history",
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def create_topup(self, telegram_id: int, amount: float) -> Dict[str, Any]:
    payload = {"amount": amount}
    res = await self._client.post(
      "/api/wallet/topup",
      json=payload,
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def create_order(
    self,
    telegram_id: int,
    username: str,
    amount: int,
    place_id: str,
  ) -> Dict[str, Any]:
    payload = {
      "username": username,
      "amount": amount,
      "placeId": place_id,
    }
    res = await self._client.post(
      "/api/orders",
      json=payload,
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def set_bybit_uid(self, telegram_id: int, bybit_uid: str | None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {"bybitUid": bybit_uid}
    res = await self._client.patch(
      "/api/me/bybit-uid",
      json=payload,
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def bybit_quick_check(self, telegram_id: int) -> Dict[str, Any]:
    res = await self._client.post(
      "/api/wallet/bybit/check",
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def admin_get_orders_summary(self, telegram_id: int) -> Dict[str, Any]:
    res = await self._client.get(
      "/api/admin/orders",
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def admin_get_payments(self, telegram_id: int) -> Dict[str, Any]:
    res = await self._client.get(
      "/api/admin/payments",
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def admin_get_users(self, telegram_id: int, search: str | None = None) -> Dict[str, Any]:
    params: Dict[str, Any] = {}
    if search is not None:
      value = search.strip()
      if value:
        params["search"] = value
    res = await self._client.get(
      "/api/admin/users",
      headers=self._headers_for_user(telegram_id),
      params=params or None,
    )
    res.raise_for_status()
    return res.json()

  async def admin_get_logs(self, telegram_id: int) -> Dict[str, Any]:
    res = await self._client.get(
      "/api/admin/logs",
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def admin_crypto_bot_check(self, telegram_id: int) -> Dict[str, Any]:
    res = await self._client.get(
      "/api/admin/crypto-bot/check",
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def admin_crypto_bot_rate(self, telegram_id: int) -> Dict[str, Any]:
    res = await self._client.get(
      "/api/admin/crypto-bot/rate",
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def admin_bybit_sync(
    self,
    telegram_id: int,
    start_time: Optional[int] = None,
    end_time: Optional[int] = None,
  ) -> Dict[str, Any]:
    payload: Dict[str, Any] = {}
    if start_time is not None:
      payload["startTime"] = start_time
    if end_time is not None:
      payload["endTime"] = end_time
    res = await self._client.post(
      "/api/admin/bybit/sync",
      json=payload,
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def admin_rbx_balance(self, telegram_id: int) -> Dict[str, Any]:
    res = await self._client.get(
      "/api/admin/rbx/balance",
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def admin_rbx_stock(self, telegram_id: int) -> Dict[str, Any]:
    res = await self._client.get(
      "/api/admin/rbx/stock/detailed",
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def admin_rbx_order_info(self, telegram_id: int, order_id: str) -> Dict[str, Any]:
    payload = {"orderId": order_id}
    res = await self._client.post(
      "/api/admin/rbx/orders/info",
      json=payload,
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def admin_rbx_order_resend(
    self,
    telegram_id: int,
    order_id: str,
    place_id: int,
  ) -> Dict[str, Any]:
    payload = {
      "orderId": order_id,
      "placeId": place_id,
    }
    res = await self._client.post(
      "/api/admin/rbx/orders/resend",
      json=payload,
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def admin_rbx_order_vip_server(
    self,
    telegram_id: int,
    order_id: str,
    roblox_username: str,
    amount: int,
    place_id: int,
  ) -> Dict[str, Any]:
    payload = {
      "orderId": order_id,
      "robloxUsername": roblox_username,
      "amount": amount,
      "placeId": place_id,
    }
    res = await self._client.post(
      "/api/admin/rbx/orders/vip-server",
      json=payload,
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def get_public_settings(self) -> Dict[str, Any]:
    res = await self._client.get(
      "/api/settings/public",
    )
    res.raise_for_status()
    return res.json()

  async def admin_get_settings(self, telegram_id: int) -> Dict[str, Any]:
    res = await self._client.get(
      "/api/admin/settings",
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def admin_update_settings(self, telegram_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    res = await self._client.patch(
      "/api/admin/settings",
      json=payload,
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()
