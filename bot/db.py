from __future__ import annotations

import asyncpg


async def create_pool(database_url: str) -> asyncpg.Pool:
  return await asyncpg.create_pool(dsn=database_url)


async def get_bot_token(pool: asyncpg.Pool) -> str:
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      'SELECT "telegramBotToken" FROM "settings" WHERE id = 1',
    )
  if not row or not row["telegramBotToken"]:
    raise RuntimeError("telegramBotToken is not configured in settings table")
  return str(row["telegramBotToken"])

