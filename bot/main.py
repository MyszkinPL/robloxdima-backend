from __future__ import annotations

import asyncio
from typing import Callable, Awaitable

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.types import Update

from .config import load_config
from .db import create_pool, get_bot_token
from .backend_api import BackendApiClient
from .middlewares import ThrottlingMiddleware, BanMiddleware
from . import handlers_start, handlers_wallet, handlers_orders, handlers_calculator, handlers_referrals
from .scheduler import start_scheduler


async def main() -> None:
    config = load_config()

    pool = await create_pool(config.database_url)
    bot_token = await get_bot_token(pool)

    bot = Bot(
        token=bot_token,
        default=DefaultBotProperties(parse_mode="HTML"),
    )

    api_client = BackendApiClient(
        base_url=config.backend_base_url,
        bot_token=bot_token,
    )

    dp = Dispatcher()
    dp.update.middleware(BanMiddleware())
    dp.message.middleware(ThrottlingMiddleware())

    dp.include_router(handlers_start.router)
    dp.include_router(handlers_wallet.router)
    dp.include_router(handlers_orders.router)
    dp.include_router(handlers_calculator.router)
    dp.include_router(handlers_referrals.router)

    async def api_middleware(
        handler: Callable[[Update, dict], Awaitable[None]],
        event: Update,
        data: dict,
    ) -> None:
        data["api"] = api_client
        await handler(event, data)

    dp.update.middleware(api_middleware)

    # Start background scheduler
    asyncio.create_task(start_scheduler(bot, api_client))

    try:
        await dp.start_polling(bot, pool=pool)
    finally:
        await api_client.close()
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
