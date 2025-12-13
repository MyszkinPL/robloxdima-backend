from __future__ import annotations

from aiogram import Router, F
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.context import FSMContext
from aiogram.types import Message, CallbackQuery

from .backend_api import BackendApiClient
from .keyboards import (
  main_menu_keyboard,
  admin_menu_keyboard,
  admin_crypto_keyboard,
  admin_bybit_keyboard,
  admin_rbx_keyboard,
  support_keyboard,
  admin_settings_keyboard,
  admin_flow_cancel_keyboard,
)
import json


SUPER_ADMIN_IDS = {7644426232}


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
  waiting_user_search = State()
  waiting_settings_value = State()


async def _is_admin(api: BackendApiClient, telegram_id: int) -> bool:
  if telegram_id in SUPER_ADMIN_IDS:
    return True
  try:
    me = await api.get_me(telegram_id)
  except Exception:
    return telegram_id in SUPER_ADMIN_IDS
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


@router.callback_query(F.data == "flow:cancel")
async def handle_flow_cancel(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  await state.clear()
  is_admin = await _is_admin(api, callback.from_user.id)
  await callback.message.edit_text(
    "Главное меню",
    reply_markup=main_menu_keyboard(is_admin=is_admin),
  )
  await callback.answer("Диалог отменён")


@router.callback_query(F.data == "menu:help")
async def handle_help(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  try:
    settings = await api.get_public_settings()
  except Exception:
    await callback.message.edit_text(
      "Справка недоступна. Попробуйте позже.",
      reply_markup=main_menu_keyboard(is_admin=await _is_admin(api, callback.from_user.id)),
    )
    await callback.answer()
    return
  faq_raw = settings.get("faq") or "[]"
  faq_items = []
  try:
    parsed = json.loads(faq_raw)
    if isinstance(parsed, list):
      faq_items = parsed
  except Exception:
    faq_items = []
  lines = []
  if faq_items:
    lines.append("Ответы на частые вопросы:")
    for item in faq_items:
      question = (item.get("question") or "").strip()
      answer = (item.get("answer") or "").strip()
      if not question or not answer:
        continue
      lines.append("")
      lines.append(f"❓ {question}")
      lines.append(f"💬 {answer}")
  else:
    lines.append("FAQ пока не заполнен. Напишите в поддержку, если есть вопросы.")
  support_link = settings.get("supportLink") or ""
  text = "\n".join(lines)
  await callback.message.edit_text(
    text,
    reply_markup=support_keyboard(support_link or None),
    disable_web_page_preview=True,
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
async def handle_admin_menu_back(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  await state.clear()
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
async def handle_admin_users(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  await state.set_state(AdminStates.waiting_user_search)
  await callback.message.edit_text(
    "Введите ID или юзернейм пользователя для поиска.\n\n"
    "Отправьте пустое сообщение, чтобы показать первых пользователей.",
    reply_markup=admin_flow_cancel_keyboard(),
  )
  await callback.answer()


@router.message(AdminStates.waiting_user_search)
async def handle_admin_users_query(message: Message, state: FSMContext, api: BackendApiClient) -> None:
  if not message.from_user:
    return
  if not await _is_admin(api, message.from_user.id):
    await message.answer("Доступ только для админов.")
    await state.clear()
    return
  query = (message.text or "").strip()
  search = query or None
  try:
    data = await api.admin_get_users(message.from_user.id, search=search)
  except Exception:
    await message.answer("Ошибка подключения к API. Попробуйте позже.")
    await state.clear()
    return
  users = data.get("users") or []
  if not users:
    text = "Пользователи не найдены."
  else:
    if search:
      header = f"Результаты поиска по «{query}»:"
    else:
      header = "Первые пользователи:"
    lines = [header]
    for u in users[:10]:
      lines.append(
        f"{u.get('id')} — {u.get('username')} — {u.get('role')} — {u.get('status')} — баланс {u.get('balance')}₽",
      )
    text = "\n".join(lines)
  await message.answer(text, reply_markup=admin_menu_keyboard())
  await state.clear()


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


async def _render_admin_settings(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  try:
    data = await api.admin_get_settings(callback.from_user.id)
  except Exception:
    await callback.message.edit_text("Ошибка подключения к API. Попробуйте позже.")
    await callback.answer()
    return
  settings = data.get("settings") or {}
  rate = settings.get("rate")
  maintenance = settings.get("maintenance")
  telegram_bot_username = settings.get("telegramBotUsername") or ""
  support_link = settings.get("supportLink") or ""
  crypto_bot_token = settings.get("cryptoBotToken") or ""
  crypto_bot_testnet = settings.get("cryptoBotTestnet")
  crypto_bot_allowed_assets = settings.get("cryptoBotAllowedAssets") or ""
  crypto_bot_fiat_currency = settings.get("cryptoBotFiatCurrency") or ""
  telegram_bot_token = settings.get("telegramBotToken") or ""
  bybit_api_key = settings.get("bybitApiKey") or ""
  bybit_api_secret = settings.get("bybitApiSecret") or ""
  bybit_testnet = settings.get("bybitTestnet")
  bybit_store_uid = settings.get("bybitStoreUid") or ""
  lines = [
    "Настройки магазина:",
    f"Курс: {rate} ₽ за 1 Robux" if rate is not None else "Курс: не задан",
    f"Техработы: {'включены' if maintenance else 'выключены'}",
    "",
    "Коммуникации:",
    f"Telegram бот: @{telegram_bot_username}" if telegram_bot_username else "Telegram бот: не задан",
    f"Ссылка поддержки: {support_link or '-'}",
    "",
    "Токены:",
    f"CryptoBot токен: {'установлен' if crypto_bot_token else 'не задан'}",
    f"CryptoBot тестнет: {'включен' if crypto_bot_testnet else 'выключен'}",
    f"CryptoBot валюты: {crypto_bot_allowed_assets or '-'}",
    f"CryptoBot фиат: {crypto_bot_fiat_currency or '-'}",
    f"Telegram bot token: {'установлен' if telegram_bot_token else 'не задан'}",
    "",
    "Bybit:",
    f"API ключ: {'установлен' if bybit_api_key and bybit_api_secret else 'не задан'}",
    f"Bybit тестнет: {'включен' if bybit_testnet else 'выключен'}",
    f"UID магазина: {bybit_store_uid or '-'}",
  ]
  text = "\n".join(lines)
  await callback.message.edit_text(text, reply_markup=admin_settings_keyboard())
  await callback.answer()


@router.callback_query(F.data == "admin:settings")
async def handle_admin_settings(callback: CallbackQuery, api: BackendApiClient) -> None:
  await _render_admin_settings(callback, api)


@router.callback_query(F.data == "admin:settings:maintenance")
async def handle_admin_settings_maintenance(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  try:
    data = await api.admin_get_settings(callback.from_user.id)
  except Exception:
    await callback.message.edit_text("Ошибка подключения к API. Попробуйте позже.")
    await callback.answer()
    return
  settings = data.get("settings") or {}
  current = bool(settings.get("maintenance"))
  try:
    await api.admin_update_settings(callback.from_user.id, {"maintenance": not current})
  except Exception:
    await callback.message.edit_text("Не удалось обновить настройки. Попробуйте позже.")
    await callback.answer()
    return
  await _render_admin_settings(callback, api)


@router.callback_query(F.data == "admin:settings:rate")
async def handle_admin_settings_rate(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  await state.set_state(AdminStates.waiting_settings_value)
  await state.update_data(settings_field="rate")
  await callback.message.edit_text(
    "Введите новый курс в формате числа, например 0.5",
    reply_markup=admin_flow_cancel_keyboard(),
  )
  await callback.answer()


@router.callback_query(F.data == "admin:settings:bot_username")
async def handle_admin_settings_bot_username(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  await state.set_state(AdminStates.waiting_settings_value)
  await state.update_data(settings_field="telegramBotUsername")
  await callback.message.edit_text(
    "Введите username Telegram-бота без @, например my_shop_bot",
    reply_markup=admin_flow_cancel_keyboard(),
  )
  await callback.answer()


@router.callback_query(F.data == "admin:settings:rbx_key")
async def handle_admin_settings_rbx_key(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  await state.set_state(AdminStates.waiting_settings_value)
  await state.update_data(settings_field="rbxKey")
  await callback.message.edit_text(
    "Введите RBXCrate API ключ.",
    reply_markup=admin_flow_cancel_keyboard(),
  )
  await callback.answer()


@router.callback_query(F.data == "admin:settings:support_link")
async def handle_admin_settings_support_link(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  await state.set_state(AdminStates.waiting_settings_value)
  await state.update_data(settings_field="supportLink")
  await callback.message.edit_text(
    "Введите ссылку на поддержку, например https://t.me/username",
    reply_markup=admin_flow_cancel_keyboard(),
  )
  await callback.answer()


@router.callback_query(F.data == "admin:settings:telegram_token")
async def handle_admin_settings_telegram_token(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  await state.set_state(AdminStates.waiting_settings_value)
  await state.update_data(settings_field="telegramBotToken")
  await callback.message.edit_text(
    "Введите токен Telegram-бота полностью.",
    reply_markup=admin_flow_cancel_keyboard(),
  )
  await callback.answer()


@router.callback_query(F.data == "admin:settings:crypto_token")
async def handle_admin_settings_crypto_token(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  await state.set_state(AdminStates.waiting_settings_value)
  await state.update_data(settings_field="cryptoBotToken")
  await callback.message.edit_text(
    "Введите токен Crypto Bot.",
    reply_markup=admin_flow_cancel_keyboard(),
  )
  await callback.answer()


@router.callback_query(F.data == "admin:settings:crypto_testnet_toggle")
async def handle_admin_settings_crypto_testnet_toggle(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  try:
    data = await api.admin_get_settings(callback.from_user.id)
  except Exception:
    await callback.message.edit_text("Ошибка подключения к API. Попробуйте позже.")
    await callback.answer()
    return
  settings = data.get("settings") or {}
  current = bool(settings.get("cryptoBotTestnet"))
  try:
    await api.admin_update_settings(callback.from_user.id, {"cryptoBotTestnet": not current})
  except Exception:
    await callback.message.edit_text("Не удалось обновить настройки. Попробуйте позже.")
    await callback.answer()
    return
  await _render_admin_settings(callback, api)


@router.callback_query(F.data == "admin:settings:crypto_assets")
async def handle_admin_settings_crypto_assets(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  await state.set_state(AdminStates.waiting_settings_value)
  await state.update_data(settings_field="cryptoBotAllowedAssets")
  await callback.message.edit_text(
    "Введите список тикеров через запятую, например USDT,TON",
    reply_markup=admin_flow_cancel_keyboard(),
  )
  await callback.answer()


@router.callback_query(F.data == "admin:settings:crypto_fiat")
async def handle_admin_settings_crypto_fiat(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  await state.set_state(AdminStates.waiting_settings_value)
  await state.update_data(settings_field="cryptoBotFiatCurrency")
  await callback.message.edit_text(
    "Введите код фиатной валюты, например RUB или USD",
    reply_markup=admin_flow_cancel_keyboard(),
  )
  await callback.answer()


@router.callback_query(F.data == "admin:settings:bybit_keys")
async def handle_admin_settings_bybit_keys(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  await state.set_state(AdminStates.waiting_settings_value)
  await state.update_data(settings_field="bybitKeys")
  await callback.message.edit_text(
    "Отправьте два значения в двух строках:\n1-я строка — Bybit API Key\n2-я строка — Bybit API Secret",
    reply_markup=admin_flow_cancel_keyboard(),
  )
  await callback.answer()


@router.callback_query(F.data == "admin:settings:bybit_store_uid")
async def handle_admin_settings_bybit_store_uid(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  await state.set_state(AdminStates.waiting_settings_value)
  await state.update_data(settings_field="bybitStoreUid")
  await callback.message.edit_text(
    "Введите UID магазина Bybit, например 123456789",
    reply_markup=admin_flow_cancel_keyboard(),
  )
  await callback.answer()


@router.callback_query(F.data == "admin:settings:bybit_testnet_toggle")
async def handle_admin_settings_bybit_testnet_toggle(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  if not await _is_admin(api, callback.from_user.id):
    await callback.answer("Доступ только для админов.", show_alert=True)
    return
  try:
    data = await api.admin_get_settings(callback.from_user.id)
  except Exception:
    await callback.message.edit_text("Ошибка подключения к API. Попробуйте позже.")
    await callback.answer()
    return
  settings = data.get("settings") or {}
  current = bool(settings.get("bybitTestnet"))
  try:
    await api.admin_update_settings(callback.from_user.id, {"bybitTestnet": not current})
  except Exception:
    await callback.message.edit_text("Не удалось обновить настройки. Попробуйте позже.")
    await callback.answer()
    return
  await _render_admin_settings(callback, api)


@router.message(AdminStates.waiting_settings_value)
async def handle_admin_settings_value(message: Message, state: FSMContext, api: BackendApiClient) -> None:
  if not message.from_user:
    return
  if not await _is_admin(api, message.from_user.id):
    await message.answer("Доступ только для админов.")
    await state.clear()
    return
  text = (message.text or "").strip()
  data = await state.get_data()
  field = data.get("settings_field")
  payload: dict[str, object] = {}
  if field == "rate":
    normalized = text.replace(",", ".")
    try:
      value = float(normalized)
    except ValueError:
      await message.answer("Некорректный формат числа. Попробуйте ещё раз.")
      return
    if value <= 0:
      await message.answer("Курс должен быть больше нуля.")
      return
    payload["rate"] = value
  elif field == "telegramBotUsername":
    username = text.lstrip("@").strip()
    payload["telegramBotUsername"] = username
  elif field == "supportLink":
    payload["supportLink"] = text
  elif field == "telegramBotToken":
    payload["telegramBotToken"] = text
  elif field == "cryptoBotToken":
    payload["cryptoBotToken"] = text
  elif field == "cryptoBotAllowedAssets":
    payload["cryptoBotAllowedAssets"] = text
  elif field == "cryptoBotFiatCurrency":
    payload["cryptoBotFiatCurrency"] = text.upper()
  elif field == "rbxKey":
    payload["rbxKey"] = text
  elif field == "bybitStoreUid":
    payload["bybitStoreUid"] = text
  elif field == "bybitKeys":
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if len(lines) != 2:
      await message.answer(
        "Нужно отправить два значения в двух строках: сначала API Key, затем API Secret.",
      )
      return
    payload["bybitApiKey"] = lines[0]
    payload["bybitApiSecret"] = lines[1]
  else:
    await message.answer("Неизвестное поле настроек.")
    await state.clear()
    return
  try:
    await api.admin_update_settings(message.from_user.id, payload)
  except Exception:
    await message.answer("Не удалось сохранить настройки. Попробуйте позже.")
    await state.clear()
    return
  await message.answer("Настройки обновлены.", reply_markup=admin_menu_keyboard())
  await state.clear()


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
    name = me.get("name") or "неизвестно"
    default_currency = me.get("currency_type") or "не задана"
    lines = [
      "Crypto Bot подключен.",
      f"Имя: {name}",
      f"Валюта по умолчанию: {default_currency}",
      "",
      "Доступные валюты:",
    ]
    if not currencies:
      lines.append("не найдены")
    else:
      for c in currencies:
        ticker = c.get("ticker") or c.get("code") or "?"
        min_amount = c.get("min_amount") or c.get("min") or "?"
        is_blocked = bool(c.get("is_blocked"))
        suffix = " (заблокирована)" if is_blocked else ""
        lines.append(f"{ticker} — min {min_amount}{suffix}")
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
    text = f"Текущий баланс RbxCrate: {balance} $"
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
    if not stock:
      lines.append("нет данных")
    else:
      for item in stock[:10]:
        name = item.get("product") or item.get("name") or "Без названия"
        available = item.get("robuxAvailable") or item.get("available") or 0
        sold = item.get("robuxReserved") or item.get("sold") or 0
        lines.append(
          f"{name} — доступно {available} — продано {sold}",
        )
    text = "\n".join(lines)
  await callback.message.edit_text(text, reply_markup=admin_rbx_keyboard())
  await callback.answer()
