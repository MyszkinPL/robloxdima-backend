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
