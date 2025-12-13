from __future__ import annotations

from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton


def main_menu_keyboard(is_admin: bool = False) -> InlineKeyboardMarkup:
  rows: list[list[InlineKeyboardButton]] = [
    [
      InlineKeyboardButton(text="💰 Баланс", callback_data="menu:balance"),
      InlineKeyboardButton(text="📥 Пополнить", callback_data="menu:topup"),
    ],
    [
      InlineKeyboardButton(text="🛒 Купить робуксы", callback_data="menu:order"),
    ],
    [
      InlineKeyboardButton(text="📜 История пополнений", callback_data="menu:history"),
    ],
    [
      InlineKeyboardButton(text="💳 Bybit UID", callback_data="menu:bybit"),
    ],
    [
      InlineKeyboardButton(text="❓ Помощь", callback_data="menu:help"),
    ],
  ]
  if is_admin:
    rows.append(
      [
        InlineKeyboardButton(text="🛠 Админка", callback_data="menu:admin"),
      ]
    )
  return InlineKeyboardMarkup(inline_keyboard=rows)


def topup_confirm_keyboard(pay_url: str) -> InlineKeyboardMarkup:
  return InlineKeyboardMarkup(
    inline_keyboard=[
      [InlineKeyboardButton(text="Оплатить через Crypto Bot", url=pay_url)],
      [InlineKeyboardButton(text="🔄 Обновить баланс", callback_data="menu:balance")],
    ]
  )


def flow_cancel_keyboard() -> InlineKeyboardMarkup:
  return InlineKeyboardMarkup(
    inline_keyboard=[
      [
        InlineKeyboardButton(text="⬅️ В главное меню", callback_data="flow:cancel"),
      ],
    ]
  )


def bybit_menu_keyboard() -> InlineKeyboardMarkup:
  return InlineKeyboardMarkup(
    inline_keyboard=[
      [
        InlineKeyboardButton(text="Сохранить UID", callback_data="bybit:save"),
      ],
      [
        InlineKeyboardButton(text="🔍 Проверить пополнения Bybit", callback_data="bybit:check"),
      ],
      [
        InlineKeyboardButton(text="⬅️ Назад", callback_data="menu:back"),
      ],
    ]
  )


def admin_menu_keyboard() -> InlineKeyboardMarkup:
  return InlineKeyboardMarkup(
    inline_keyboard=[
      [
        InlineKeyboardButton(text="📊 Заказы и выручка", callback_data="admin:orders"),
      ],
      [
        InlineKeyboardButton(text="💳 Платежи", callback_data="admin:payments"),
        InlineKeyboardButton(text="👥 Пользователи", callback_data="admin:users"),
      ],
      [
        InlineKeyboardButton(text="📜 Логи", callback_data="admin:logs"),
      ],
      [
        InlineKeyboardButton(text="🤖 Crypto Bot", callback_data="admin:crypto"),
        InlineKeyboardButton(text="💱 Bybit", callback_data="admin:bybit"),
      ],
      [
        InlineKeyboardButton(text="💼 Rbx", callback_data="admin:rbx"),
        InlineKeyboardButton(text="⚙️ Настройки", callback_data="admin:settings"),
      ],
      [
        InlineKeyboardButton(text="⬅️ В главное меню", callback_data="menu:back"),
      ],
    ]
  )


def admin_crypto_keyboard() -> InlineKeyboardMarkup:
  return InlineKeyboardMarkup(
    inline_keyboard=[
      [
        InlineKeyboardButton(text="Проверить связку", callback_data="admin:crypto:check"),
      ],
      [
        InlineKeyboardButton(text="Курс RUB→USDT", callback_data="admin:crypto:rate"),
      ],
      [
        InlineKeyboardButton(text="⬅️ Назад", callback_data="admin:menu"),
      ],
    ]
  )


def admin_bybit_keyboard() -> InlineKeyboardMarkup:
  return InlineKeyboardMarkup(
    inline_keyboard=[
      [
        InlineKeyboardButton(text="Синхронизировать депозиты", callback_data="admin:bybit:sync"),
      ],
      [
        InlineKeyboardButton(text="⬅️ Назад", callback_data="admin:menu"),
      ],
    ]
  )


def admin_rbx_keyboard() -> InlineKeyboardMarkup:
  return InlineKeyboardMarkup(
    inline_keyboard=[
      [
        InlineKeyboardButton(text="Баланс", callback_data="admin:rbx:balance"),
        InlineKeyboardButton(text="Сток", callback_data="admin:rbx:stock"),
      ],
      [
        InlineKeyboardButton(text="⬅️ Назад", callback_data="admin:menu"),
      ],
    ]
  )


def support_keyboard(support_link: str | None) -> InlineKeyboardMarkup:
  rows: list[list[InlineKeyboardButton]] = []
  if support_link:
    rows.append(
      [
        InlineKeyboardButton(text="Написать в поддержку", url=support_link),
      ]
    )
  rows.append(
    [
      InlineKeyboardButton(text="⬅️ В главное меню", callback_data="menu:back"),
    ]
  )
  return InlineKeyboardMarkup(inline_keyboard=rows)


def admin_settings_keyboard() -> InlineKeyboardMarkup:
  return InlineKeyboardMarkup(
    inline_keyboard=[
      [
        InlineKeyboardButton(text="Курс", callback_data="admin:settings:rate"),
        InlineKeyboardButton(text="Техработы", callback_data="admin:settings:maintenance"),
      ],
      [
        InlineKeyboardButton(text="TG бот", callback_data="admin:settings:bot_username"),
        InlineKeyboardButton(text="Поддержка", callback_data="admin:settings:support_link"),
      ],
      [
        InlineKeyboardButton(text="RBX ключ", callback_data="admin:settings:rbx_key"),
      ],
      [
        InlineKeyboardButton(text="TG токен", callback_data="admin:settings:telegram_token"),
      ],
      [
        InlineKeyboardButton(text="CryptoBot токен", callback_data="admin:settings:crypto_token"),
      ],
      [
        InlineKeyboardButton(text="CryptoBot тестнет", callback_data="admin:settings:crypto_testnet_toggle"),
      ],
      [
        InlineKeyboardButton(text="CryptoBot валюты", callback_data="admin:settings:crypto_assets"),
      ],
      [
        InlineKeyboardButton(text="CryptoBot фиат", callback_data="admin:settings:crypto_fiat"),
      ],
      [
        InlineKeyboardButton(text="⬅️ Назад", callback_data="admin:menu"),
      ],
    ]
  )
