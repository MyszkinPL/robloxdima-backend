from __future__ import annotations

from dataclasses import dataclass
import os


@dataclass
class BotConfig:
  backend_base_url: str
  database_url: str


def load_config() -> BotConfig:
  backend_base_url = os.getenv("BACKEND_BASE_URL") or "http://localhost:3001"
  backend_base_url = backend_base_url.rstrip("/")

  database_url = os.getenv("DATABASE_URL")
  if not database_url:
    raise RuntimeError("DATABASE_URL is not set")

  return BotConfig(
    backend_base_url=backend_base_url,
    database_url=database_url,
  )

