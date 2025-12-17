from __future__ import annotations

from dataclasses import dataclass
import os


@dataclass
class BotConfig:
  backend_base_url: str
  database_url: str
  webapp_url: str


def load_config() -> BotConfig:
  backend_base_url = os.getenv("BOT_BACKEND_BASE_URL")
  if not backend_base_url:
    backend_base_url = "http://127.0.0.1:3001"
  backend_base_url = backend_base_url.rstrip("/")

  database_url = os.getenv("DATABASE_URL")
  if not database_url:
    raise RuntimeError("DATABASE_URL is not set")
    
  webapp_url = os.getenv("WEBAPP_URL", "https://rbtrade.org") # Default placeholder

  return BotConfig(
    backend_base_url=backend_base_url,
    database_url=database_url,
    webapp_url=webapp_url,
  )
