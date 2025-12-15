from typing import Callable, Dict, Any, Awaitable
from aiogram import BaseMiddleware
from aiogram.types import Message, CallbackQuery
import asyncpg
from cachetools import TTLCache

class BanMiddleware(BaseMiddleware):
    def __init__(self):
        # Issue 6b Fix: Cache ban status to reduce DB load
        # Store up to 10000 users for 60 seconds
        # Cache stores: user_id -> is_banned (bool)
        self.cache = TTLCache(maxsize=10000, ttl=60.0)

    async def __call__(
        self,
        handler: Callable[[Message, Dict[str, Any]], Awaitable[Any]],
        event: Message | CallbackQuery | Any,
        data: Dict[str, Any],
    ) -> Any:
        pool: asyncpg.Pool = data.get("pool")
        if not pool:
            return await handler(event, data)
        
        user = data.get("event_from_user")
        if not user:
            # Fallback for Update events if event_from_user is not yet populated
            if hasattr(event, "message") and event.message:
                user = event.message.from_user
            elif hasattr(event, "callback_query") and event.callback_query:
                user = event.callback_query.from_user
            elif hasattr(event, "inline_query") and event.inline_query:
                user = event.inline_query.from_user
            elif hasattr(event, "from_user"):
                user = event.from_user
            
        user_id = user.id if user else None

        if not user_id:
            return await handler(event, data)

        try:
            # Check cache first
            is_banned = self.cache.get(user_id)
            
            if is_banned is None:
                # Cache miss, check DB
                async with pool.acquire() as conn:
                    is_banned = await conn.fetchval(
                        'SELECT "isBanned" FROM "User" WHERE id = $1', # Ensure correct table name ("User" in Prisma usually)
                        str(user_id)
                    )
                # Cache the result (False if None/False, True if True)
                is_banned = bool(is_banned)
                self.cache[user_id] = is_banned
            
            if is_banned:
                # User is banned, ignore the event
                # ...
                return
        except Exception as e:
            # If error (e.g. user not found), proceed
            pass
            
        return await handler(event, data)
