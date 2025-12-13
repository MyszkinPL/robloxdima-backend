from typing import Callable, Dict, Any, Awaitable
from aiogram import BaseMiddleware
from aiogram.types import Message, CallbackQuery
import asyncpg

class BanMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[Message, Dict[str, Any]], Awaitable[Any]],
        event: Message | CallbackQuery,
        data: Dict[str, Any],
    ) -> Any:
        pool: asyncpg.Pool = data.get("pool")
        if not pool:
            return await handler(event, data)
        
        user_id = event.from_user.id if event.from_user else None
        if not user_id:
            return await handler(event, data)

        try:
            async with pool.acquire() as conn:
                is_banned = await conn.fetchval(
                    'SELECT "isBanned" FROM users WHERE id = $1',
                    str(user_id)
                )
            
            if is_banned:
                # User is banned, ignore the event
                return
        except Exception as e:
            # If error (e.g. user not found), proceed
            pass
            
        return await handler(event, data)
