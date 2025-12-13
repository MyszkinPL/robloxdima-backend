from __future__ import annotations

from aiogram import Router, F
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message, CallbackQuery

from .backend_api import BackendApiClient
from .keyboards import (
  main_menu_keyboard,
  admin_menu_keyboard,
  admin_crypto_keyboard,
  admin_bybit_keyboard,
  admin_rbx_keyboard,
)


router = Router()


async def _ensure_user(message: Message, api: BackendApiClient) -> None:
  tg_user = message.from_user
  if not tg_user:
    return
  try:
    await api.sync_user(
      telegram_id=tg_user.id,
      username=tg_user.username,
      first_name=tg_user.first_name or "User",
      photo_url=None,
    )
  except Exception:
    return


class AdminStates(StatesGroup):
  waiting_dummy = State()


async def _is_admin(api: BackendApiClient, telegram_id: int) -> bool:
  try:
    me = await api.get_me(telegram_id)
  except Exception:
    return False
  return me.get("role") == "admin"


@router.message(F.text == "/start")
async def handle_start(message: Message, api: BackendApiClient) -> None:
  await _ensure_user(message, api)
  is_admin = False
  if message.from_user:
    is_admin = await _is_admin(api, message.from_user.id)
  await message.answer(
    "Привет! Это бот магазина робуксов.\nВыберите действие в меню ниже.",
    reply_markup=main_menu_keyboard(is_admin=is_admin),
  )


@router.callback_query(F.data == "menu:back")
async def handle_back(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  is_admin = await _is_admin(api, callback.from_user.id)
  await callback.message.edit_text(
    "Главное меню",
    reply_markup=main_menu_keyboard(is_admin=is_admin),
  )
  await callback.answer()


@router.message(F.text == "/admin")
async def handle_admin_command(message: Message, api: BackendApiClient) -> None:
  if not message.from_user:
    return
  if not await _is_admin(api, message.from_user.id):
    await message.answer("Доступ только для админов.")
    return
  try:
    summary = await api.admin_get_orders_summary(message.from_user.id)
  except Exception:
    await message.answer("Ошибка подключения к API. Попробуйте позже.")
    return
  summary_text = summary.get("summary") or {}
  orders_count = summary_text.get("ordersCount", 0)
  clients_count = summary_text.get("clientsCount", 0)
  sales_this_month = summary_text.get("salesThisMonth", 0)
  text = (
    "Админ-панель\n\n"
    f"Заказов всего: {orders_count}\n"
    f"Клиентов всего: {clients_count}\n"
    f"Заказов в этом месяце: {sales_this_month}\n\n"
    "Выберите раздел:"
  )
  await message.answer(text, reply_markup=admin_menu_keyboard())


@router.callback_query(F.data == "menu:admin")
async def handle_admin_menu(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  try:
    summary = await api.admin_get_orders_summary(callback.from_user.id)
  except Exception:
    await callback.message.edit_text("Ошибка подключения к API. Попробуйте позже.")
    await callback.answer()
    return
  summary_text = summary.get("summary") or {}
  orders_count = summary_text.get("ordersCount", 0)
  clients_count = summary_text.get("clientsCount", 0)
  sales_this_month = summary_text.get("salesThisMonth", 0)
  text = (
    "Админ-панель\n\n"
    f"Заказов всего: {orders_count}\n"
    f"Клиентов всего: {clients_count}\n"
    f"Заказов в этом месяце: {sales_this_month}\n\n"
    "Выберите раздел:"
  )
  await callback.message.edit_text(text, reply_markup=admin_menu_keyboard())
  await callback.answer()


@router.callback_query(F.data == "admin:menu")
async def handle_admin_menu_back(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  try:
    summary = await api.admin_get_orders_summary(callback.from_user.id)
  except Exception:
    await callback.message.edit_text("Ошибка подключения к API. Попробуйте позже.")
    await callback.answer()
    return
  summary_text = summary.get("summary") or {}
  orders_count = summary_text.get("ordersCount", 0)
  clients_count = summary_text.get("clientsCount", 0)
  sales_this_month = summary_text.get("salesThisMonth", 0)
  text = (
    "Админ-панель\n\n"
    f"Заказов всего: {orders_count}\n"
    f"Клиентов всего: {clients_count}\n"
    f"Заказов в этом месяце: {sales_this_month}\n\n"
    "Выберите раздел:"
  )
  await callback.message.edit_text(text, reply_markup=admin_menu_keyboard())
  await callback.answer()


@router.callback_query(F.data == "admin:orders")
async def handle_admin_orders(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  try:
    data = await api.admin_get_orders_summary(callback.from_user.id)
  except Exception:
    await callback.message.edit_text("Ошибка подключения к API. Попробуйте позже.")
    await callback.answer()
    return
  orders = data.get("orders") or []
  summary = data.get("summary") or {}
  lines = [
    "Статистика заказов:",
    f"Всего заказов: {summary.get('ordersCount', 0)}",
    f"Уникальных клиентов: {summary.get('clientsCount', 0)}",
    f"Заказов в этом месяце: {summary.get('salesThisMonth', 0)}",
    "",
    "Последние заказы:",
  ]
  for order in orders[-5:][::-1]:
    lines.append(
      f"{order.get('id')} — {order.get('username')} — {order.get('amount')}₽ — {order.get('status')}",
    )
  text = "\n".join(lines)
  await callback.message.edit_text(text, reply_markup=admin_menu_keyboard())
  await callback.answer()


@router.callback_query(F.data == "admin:payments")
async def handle_admin_payments(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  try:
    data = await api.admin_get_payments(callback.from_user.id)
  except Exception:
    await callback.message.edit_text("Ошибка подключения к API. Попробуйте позже.")
    await callback.answer()
    return
  payments = data.get("payments") or []
  if not payments:
    text = "Платежи не найдены."
  else:
    lines = ["Последние платежи:"]
    for p in payments[-10:][::-1]:
      lines.append(
        f"{p.get('id')} — {p.get('amount')} {p.get('currency')} — {p.get('status')} — {p.get('method')}",
      )
    text = "\n".join(lines)
  await callback.message.edit_text(text, reply_markup=admin_menu_keyboard())
  await callback.answer()


@router.callback_query(F.data == "admin:users")
async def handle_admin_users(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  try:
    data = await api.admin_get_users(callback.from_user.id)
  except Exception:
    await callback.message.edit_text("Ошибка подключения к API. Попробуйте позже.")
    await callback.answer()
    return
  users = data.get("users") or []
  if not users:
    text = "Пользователи не найдены."
  else:
    lines = ["Первые пользователи:"]
    for u in users[:10]:
      lines.append(
        f"{u.get('id')} — {u.get('username')} — {u.get('role')} — {u.get('status')} — баланс {u.get('balance')}₽",
      )
    text = "\n".join(lines)
  await callback.message.edit_text(text, reply_markup=admin_menu_keyboard())
  await callback.answer()


@router.callback_query(F.data == "admin:logs")
async def handle_admin_logs(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  try:
    data = await api.admin_get_logs(callback.from_user.id)
  except Exception:
    await callback.message.edit_text("Ошибка подключения к API. Попробуйте позже.")
    await callback.answer()
    return
  logs = data.get("logs") or []
  summary = data.get("summary") or {}
  lines = [
    "Логи:",
    f"Всего записей: {summary.get('total', 0)}",
    f"Возвратов: {summary.get('refundCount', 0)}",
    f"Банов/разбанов: {summary.get('banCount', 0)}",
    "",
    "Последние события:",
  ]
  for log in logs[-10:][::-1]:
    lines.append(
      f"{log.get('createdAt')} — {log.get('userId')} — {log.get('action')}",
    )
  text = "\n".join(lines)
  await callback.message.edit_text(text, reply_markup=admin_menu_keyboard())
  await callback.answer()


@router.callback_query(F.data == "admin:crypto")
async def handle_admin_crypto(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  await callback.message.edit_text("Настройки Crypto Bot:", reply_markup=admin_crypto_keyboard())
  await callback.answer()


@router.callback_query(F.data == "admin:crypto:check")
async def handle_admin_crypto_check(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  try:
    data = await api.admin_crypto_bot_check(callback.from_user.id)
  except Exception:
    await callback.message.edit_text("Ошибка подключения к API. Попробуйте позже.")
    await callback.answer()
    return
  if not data.get("success"):
    text = f"Ошибка: {data.get('error')}"
  else:
    me = data.get("me") or {}
    currencies = data.get("currencies") or []
    lines = [
      "Crypto Bot подключен.",
      f"Имя: {me.get('name')}",
      f"Валюта по умолчанию: {me.get('currency_type')}",
      "",
      "Доступные валюты:",
    ]
    for c in currencies:
      lines.append(f"{c.get('ticker')} — min {c.get('min_amount')} {c.get('is_blocked') and '(заблокирована)' or ''}")
    text = "\n".join(lines)
  await callback.message.edit_text(text, reply_markup=admin_crypto_keyboard())
  await callback.answer()


@router.callback_query(F.data == "admin:crypto:rate")
async def handle_admin_crypto_rate(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  try:
    data = await api.admin_crypto_bot_rate(callback.from_user.id)
  except Exception:
    await callback.message.edit_text("Ошибка подключения к API. Попробуйте позже.")
    await callback.answer()
    return
  if not data.get("success"):
    text = f"Ошибка: {data.get('error')}"
  else:
    rate = data.get("rate")
    text = f"Актуальный курс RUB→USDT: {rate}"
  await callback.message.edit_text(text, reply_markup=admin_crypto_keyboard())
  await callback.answer()


@router.callback_query(F.data == "admin:bybit")
async def handle_admin_bybit(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  await callback.message.edit_text("Bybit депозиты:", reply_markup=admin_bybit_keyboard())
  await callback.answer()


@router.callback_query(F.data == "admin:bybit:sync")
async def handle_admin_bybit_sync(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  try:
    data = await api.admin_bybit_sync(callback.from_user.id)
  except Exception:
    await callback.message.edit_text("Ошибка подключения к API. Попробуйте позже.")
    await callback.answer()
    return
  if not data.get("success"):
    text = f"Ошибка: {data.get('error')}"
  else:
    processed = data.get("processed") or 0
    text = f"Синхронизировано пополнений Bybit: {processed}"
  await callback.message.edit_text(text, reply_markup=admin_bybit_keyboard())
  await callback.answer()


@router.callback_query(F.data == "admin:rbx")
async def handle_admin_rbx(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  await callback.message.edit_text("Rbx управление:", reply_markup=admin_rbx_keyboard())
  await callback.answer()


@router.callback_query(F.data == "admin:rbx:balance")
async def handle_admin_rbx_balance(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  try:
    data = await api.admin_rbx_balance(callback.from_user.id)
  except Exception:
    await callback.message.edit_text("Ошибка подключения к API. Попробуйте позже.")
    await callback.answer()
    return
  if not data.get("success"):
    text = f"Ошибка: {data.get('error')}"
  else:
    balance = data.get("balance")
    text = f"Текущий баланс RbxCrate: {balance} R$"
  await callback.message.edit_text(text, reply_markup=admin_rbx_keyboard())
  await callback.answer()


@router.callback_query(F.data == "admin:rbx:stock")
async def handle_admin_rbx_stock(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  try:
    data = await api.admin_rbx_stock(callback.from_user.id)
  except Exception:
    await callback.message.edit_text("Ошибка подключения к API. Попробуйте позже.")
    await callback.answer()
    return
  if not data.get("success"):
    text = f"Ошибка: {data.get('error')}"
  else:
    stock = data.get("stock") or []
    lines = ["Сток по товарам:"]
    for item in stock[:10]:
      lines.append(
        f"{item.get('name')} — доступно {item.get('available')} — продано {item.get('sold')}",
      )
    text = "\n".join(lines)
  await callback.message.edit_text(text, reply_markup=admin_rbx_keyboard())
  await callback.answer()
