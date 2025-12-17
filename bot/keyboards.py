from __future__ import annotations

from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo


def simple_menu_keyboard(support_url: str, webapp_url: str) -> InlineKeyboardMarkup:
  return InlineKeyboardMarkup(
    inline_keyboard=[
      [
        InlineKeyboardButton(text="💬 Написать в поддержку", url=support_url),
      ],
      [
        InlineKeyboardButton(text="📢 Подписаться на канал", url="https://t.me/RBTradee"),
      ],
      [
        InlineKeyboardButton(text="📱 Открыть Mini App", web_app=WebAppInfo(url=webapp_url)),
      ],
    ]
  )
