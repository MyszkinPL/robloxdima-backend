from __future__ import annotations

from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton


def main_menu_keyboard(is_admin: bool = False) -> InlineKeyboardMarkup:
  rows: list[list[InlineKeyboardButton]] = [
    [
      InlineKeyboardButton(text="👤 Профиль", callback_data="menu:balance"),
      InlineKeyboardButton(text="📥 Пополнить", callback_data="menu:topup"),
    ],
    [
      InlineKeyboardButton(text="🛒 Купить робуксы", callback_data="menu:order"),
    ],
    [
      InlineKeyboardButton(text="📦 Мои заказы", callback_data="menu:orders_history"),
      InlineKeyboardButton(text="📜 История пополнений", callback_data="menu:history"),
    ],
    [
      InlineKeyboardButton(text="🧮 Калькулятор", callback_data="menu:calculator"),
      InlineKeyboardButton(text="📊 Курс и наличие", callback_data="menu:stock_info"),
    ],
    [
      InlineKeyboardButton(text="👥 Рефералы", callback_data="menu:referrals"),
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


def profile_keyboard() -> InlineKeyboardMarkup:
  return InlineKeyboardMarkup(
    inline_keyboard=[
      [
        InlineKeyboardButton(text="📥 Пополнить баланс", callback_data="menu:topup"),
      ],
      [
        InlineKeyboardButton(text="📦 История заказов", callback_data="menu:orders_history"),
        InlineKeyboardButton(text="📜 История пополнений", callback_data="menu:history"),
      ],
      [
        InlineKeyboardButton(text="⬅️ Назад", callback_data="menu:back"),
      ],
    ]
  )


def stock_keyboard() -> InlineKeyboardMarkup:
  return InlineKeyboardMarkup(
    inline_keyboard=[
      [
        InlineKeyboardButton(text="🔄 Обновить", callback_data="menu:stock_info"),
      ],
      [
        InlineKeyboardButton(text="🛒 Купить робуксы", callback_data="menu:order"),
      ],
      [
        InlineKeyboardButton(text="⬅️ Назад", callback_data="menu:back"),
      ],
    ]
  )


def order_type_keyboard() -> InlineKeyboardMarkup:
  return InlineKeyboardMarkup(
    inline_keyboard=[
      [
        InlineKeyboardButton(text="🎫 Gamepass (Трансфер)", callback_data="order:type:gamepass"),
      ],
      [
        InlineKeyboardButton(text="🖥 VIP Server", callback_data="order:type:vip_server"),
      ],
      [
        InlineKeyboardButton(text="⬅️ Отмена", callback_data="flow:cancel"),
      ],
    ]
  )


def order_amount_keyboard() -> InlineKeyboardMarkup:
  """Клавиатура с выбором суммы заказа"""
  return InlineKeyboardMarkup(
    inline_keyboard=[
      [
        InlineKeyboardButton(text="100 R$", callback_data="order:amount:100"),
        InlineKeyboardButton(text="200 R$", callback_data="order:amount:200"),
        InlineKeyboardButton(text="400 R$", callback_data="order:amount:400"),
      ],
      [
        InlineKeyboardButton(text="500 R$", callback_data="order:amount:500"),
        InlineKeyboardButton(text="800 R$", callback_data="order:amount:800"),
        InlineKeyboardButton(text="1000 R$", callback_data="order:amount:1000"),
      ],
      [
        InlineKeyboardButton(text="1500 R$", callback_data="order:amount:1500"),
        InlineKeyboardButton(text="5000 R$", callback_data="order:amount:5000"),
      ],
      [
        InlineKeyboardButton(text="✍️ Своя сумма", callback_data="order:amount:custom"),
      ],
      [
        InlineKeyboardButton(text="⬅️ Отмена", callback_data="flow:cancel"),
      ],
    ]
  )


def topup_confirm_keyboard(pay_url: str) -> InlineKeyboardMarkup:
  return InlineKeyboardMarkup(
    inline_keyboard=[
      [InlineKeyboardButton(text="💸 Оплатить через Crypto Bot", url=pay_url)],
      [InlineKeyboardButton(text="⬅️ Отмена", callback_data="flow:cancel")],
    ]
  )


def order_details_keyboard(order_id: str, status: str, support_link: str | None = None) -> InlineKeyboardMarkup:
    rows = []
    
    # Actions based on status
    if status == "pending":
        rows.append([InlineKeyboardButton(text="❌ Отменить заказ", callback_data=f"order:cancel:{order_id}")])
        rows.append([InlineKeyboardButton(text="🔄 Отправить снова", callback_data=f"order:resend:{order_id}")])
    elif status == "processing":
        rows.append([InlineKeyboardButton(text="🔄 Отправить снова", callback_data=f"order:resend:{order_id}")])
    elif status == "completed":
        rows.append([InlineKeyboardButton(text="🔄 Повторить заказ", callback_data=f"order:repeat:{order_id}")])
    elif status == "failed":
        # Maybe retry? For now just support
        pass
        
    url = support_link if support_link else "https://t.me/robloxdima_support"
    rows.append([InlineKeyboardButton(text="🆘 Поддержка", url=url)])
    rows.append([InlineKeyboardButton(text="🔙 Назад к списку", callback_data="menu:orders_history")])
    
    return InlineKeyboardMarkup(inline_keyboard=rows)


def payment_method_keyboard(amount: float, settings: dict | None = None) -> InlineKeyboardMarkup:
  rows = []
  
  # Default to true if settings not loaded for some reason, or handle strictly?
  # Let's assume defaults: CryptoBot=True, Bybit=False (as requested)
  is_crypto_enabled = settings.get("isCryptoBotEnabled", True) if settings else True
  is_bybit_enabled = settings.get("isBybitEnabled", False) if settings else False

  if is_crypto_enabled:
    rows.append([InlineKeyboardButton(text="🤖 Crypto Bot (Авто)", callback_data=f"topup:method:cryptobot:{amount}")])
  
  if is_bybit_enabled:
    rows.append([InlineKeyboardButton(text="💱 Bybit Pay (Вручную)", callback_data=f"topup:method:bybit:{amount}")])

  rows.append([InlineKeyboardButton(text="⬅️ Отмена", callback_data="flow:cancel")])

  return InlineKeyboardMarkup(inline_keyboard=rows)


def flow_cancel_keyboard() -> InlineKeyboardMarkup:
  return InlineKeyboardMarkup(
    inline_keyboard=[
      [
        InlineKeyboardButton(text="⬅️ В главное меню", callback_data="flow:cancel"),
      ],
    ]
  )


def admin_flow_cancel_keyboard() -> InlineKeyboardMarkup:
  return InlineKeyboardMarkup(
    inline_keyboard=[
      [
        InlineKeyboardButton(text="⬅️ Назад", callback_data="admin:menu"),
      ],
    ]
  )


def admin_bybit_keyboard() -> InlineKeyboardMarkup:
  return InlineKeyboardMarkup(
    inline_keyboard=[
      [
        InlineKeyboardButton(text="💰 Проверить баланс", callback_data="admin:bybit:balance"),
      ],
      [
        InlineKeyboardButton(text="🔄 Синхронизация", callback_data="admin:bybit:sync"),
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
        InlineKeyboardButton(text="💰 Баланс аккаунта", callback_data="admin:rbx:balance"),
      ],
      [
        InlineKeyboardButton(text="📦 Наличие стока", callback_data="admin:rbx:stock"),
      ],
      [
        InlineKeyboardButton(text="⬅️ Назад", callback_data="admin:menu"),
      ],
    ]
  )


def admin_settings_keyboard() -> InlineKeyboardMarkup:
  return InlineKeyboardMarkup(
    inline_keyboard=[
      [
        InlineKeyboardButton(text="🔧 Техработы (вкл/выкл)", callback_data="admin:settings:maintenance"),
      ],
      [
        InlineKeyboardButton(text="💰 Изменить курс", callback_data="admin:settings:rate"),
      ],
      [
        InlineKeyboardButton(text="🤖 Bot Username", callback_data="admin:settings:bot_username"),
      ],
      [
        InlineKeyboardButton(text="🔑 RbxCrate Key", callback_data="admin:settings:rbx_key"),
      ],
      [
        InlineKeyboardButton(text="🆘 Ссылка поддержки", callback_data="admin:settings:support_link"),
      ],
      [
        InlineKeyboardButton(text="⬅️ Назад", callback_data="admin:menu"),
      ],
    ]
  )


def support_keyboard(support_link: str | None) -> InlineKeyboardMarkup:
  rows = []
  if support_link:
    rows.append(
      [
        InlineKeyboardButton(text="🆘 Написать в поддержку", url=support_link),
      ]
    )
  rows.append(
    [
      InlineKeyboardButton(text="⬅️ Назад", callback_data="menu:back"),
    ]
  )
  return InlineKeyboardMarkup(inline_keyboard=rows)


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
        InlineKeyboardButton(text="🔄 Проверить связку", callback_data="admin:crypto:check"),
      ],
      [
        InlineKeyboardButton(text="💱 Курс RUB→USDT", callback_data="admin:crypto:rate"),
      ],
      [
        InlineKeyboardButton(text="⬅️ Назад", callback_data="admin:menu"),
      ],
    ]
  )
