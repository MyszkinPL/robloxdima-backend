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
    data = res.json()
    return data.get("user", {})

  async def get_referrals(self, telegram_id: int) -> Dict[str, Any]:
    res = await self._client.get(
      "/api/bot/referrals",
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def transfer_referral_balance(self, telegram_id: int) -> Dict[str, Any]:
    res = await self._client.post(
      "/api/bot/referrals/transfer",
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def get_wallet_history(self, telegram_id: int) -> Dict[str, Any]:
    res = await self._client.get(
      "/api/wallet/history",
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def get_my_orders(self, telegram_id: int) -> list[Dict[str, Any]]:
    res = await self._client.get(
      "/api/orders/my",
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    data = res.json()
    return data.get("orders", [])

  async def sync_orders(self) -> list[Dict[str, Any]]:
    res = await self._client.post(
      "/api/bot/sync-orders",
      headers={"x-bot-token": self._bot_token},
    )
    res.raise_for_status()
    data = res.json()
    return data.get("updates", [])



  async def create_topup(self, telegram_id: int, amount: float, method: str = "cryptobot", sub_method: Optional[str] = None) -> Dict[str, Any]:
    json_data = {"amount": amount, "method": method}
    if sub_method:
        json_data["subMethod"] = sub_method

    res = await self._client.post(
      "/api/wallet/topup",
      json=json_data,
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()



  async def get_my_orders(self, telegram_id: int) -> Dict[str, Any]:
    res = await self._client.get(
      "/api/orders/my",
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def cancel_order(self, telegram_id: int, order_id: str) -> Dict[str, Any]:
    res = await self._client.post(
      f"/api/orders/{order_id}/cancel",
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def resend_order(self, telegram_id: int, order_id: str) -> Dict[str, Any]:
    res = await self._client.post(
      "/api/rbx/orders/resend",
      json={"orderId": order_id},
      headers=self._headers_for_user(telegram_id),
    )
    if res.status_code != 200:
       try:
           error_data = res.json()
           error_msg = error_data.get("error", res.text)
       except:
           error_msg = res.text
       raise Exception(error_msg)
    return res.json()



  async def create_manual_payment(
    self, 
    telegram_id: int, 
    amount: float, 
    method: str = "manual",
    provider_data: Optional[Dict[str, Any]] = None
  ) -> Dict[str, Any]:
    payload = {
      "amount": amount,
      "method": method,
      "providerData": provider_data
    }
    res = await self._client.post(
      "/api/wallet/manual",
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
    order_type: str = "gamepass",
  ) -> Dict[str, Any]:
    payload = {
      "username": username,
      "amount": amount,
      "placeId": place_id,
      "type": order_type,
    }
    
    url = "/api/orders"
    if order_type == "vip_server":
        url = "/api/orders/vip-server"

    res = await self._client.post(
      url,
      json=payload,
      headers=self._headers_for_user(telegram_id),
    )
    res.raise_for_status()
    return res.json()

  async def get_stock_summary(self) -> Dict[str, Any]:
    res = await self._client.get(
      "/api/rbx/stock/summary",
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

  async def add_user_balance(self, telegram_id: int, amount: float, source: str, payment_id: str | None = None, provider_data: Dict[str, Any] | None = None) -> Dict[str, Any]:
    payload = {
      "userId": telegram_id,
      "amount": amount,
      "source": source,
      "paymentId": payment_id,
      "providerData": provider_data
    }
    res = await self._client.post(
      "/api/bot/balance/add",
      json=payload,
      headers={"x-bot-token": self._bot_token},
    )
    res.raise_for_status()
    return res.json()
