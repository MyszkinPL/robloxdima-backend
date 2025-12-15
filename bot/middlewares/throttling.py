from __future__ import annotations

import time
from typing import Any, Awaitable, Callable, Dict

from aiogram import BaseMiddleware
from aiogram.types import Message, TelegramObject
from cachetools import TTLCache

class ThrottlingMiddleware(BaseMiddleware):
    def __init__(self, limit: float = 0.5):
        self.limit = limit
        # Issue 6a Fix: Use TTLCache to prevent memory leak
        # maxsize=10000, ttl=2.0 (slightly more than limit to be safe)
        self.users = TTLCache(maxsize=10000, ttl=2.0)

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        if isinstance(event, Message) and event.from_user:
            user_id = event.from_user.id
            current_time = time.time()
            
            # TTLCache automatically removes expired entries
            # If user_id is in cache, it means they sent a message recently
            if user_id in self.users:
                # We can update the timestamp or just return if strict rate limit
                # If we want to strictly block < limit, we check time difference?
                # TTLCache logic: key exists -> throttled? 
                # Or we can just use the cache to store last time.
                
                last_time = self.users.get(user_id, 0)
                if current_time - last_time < self.limit:
                    return

            self.users[user_id] = current_time
            
        return await handler(event, data)
