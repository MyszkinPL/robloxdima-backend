import time
from typing import Any, Awaitable, Callable, Dict

from aiogram import BaseMiddleware
from aiogram.types import Message, CallbackQuery, Update

from ..backend_api import BackendApiClient

# You can move this to config or import it
SUPER_ADMIN_IDS = {7644426232}

class MaintenanceMiddleware(BaseMiddleware):
    def __init__(self):
        self._cached_settings = None
        self._last_fetch = 0
        self._cache_ttl = 30  # seconds

    async def __call__(
        self,
        handler: Callable[[Update, Dict[str, Any]], Awaitable[Any]],
        event: Update,
        data: Dict[str, Any],
    ) -> Any:
        api: BackendApiClient = data.get("api")
        if not api:
            return await handler(event, data)

        try:
            now = time.time()
            if not self._cached_settings or (now - self._last_fetch > self._cache_ttl):
                self._cached_settings = await api.get_public_settings()
                self._last_fetch = now
            
            settings = self._cached_settings
            
            if settings.get("maintenance", False):
                user = data.get("event_from_user")
                
                # Allow super admins bypass
                if user and user.id in SUPER_ADMIN_IDS:
                    return await handler(event, data)

                if isinstance(event, Message):
                    await event.answer("⚠️ <b>Технические работы</b>\n\nБот временно недоступен. Мы уже работаем над улучшениями! Пожалуйста, загляните позже.")
                elif isinstance(event, CallbackQuery):
                    await event.answer("⚠️ Технические работы", show_alert=True)
                return

        except Exception:
            pass

        return await handler(event, data)
