from __future__ import annotations

from aiogram import Router, F
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message, CallbackQuery

from .backend_api import BackendApiClient
from .keyboards import main_menu_keyboard, topup_confirm_keyboard, bybit_menu_keyboard, flow_cancel_keyboard


router = Router()


class WalletStates(StatesGroup):
  waiting_topup_amount = State()
  waiting_bybit_uid = State()


@router.callback_query(F.data == "menu:balance")
async def handle_balance(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  try:
    me = await api.get_me(callback.from_user.id)
  except Exception:
    await callback.answer("Ошибка авторизации. Отправьте /start и попробуйте снова.", show_alert=True)
    return
  balance = me.get("balance", 0)
  is_admin = me.get("role") == "admin"
  text = f"Ваш текущий баланс: {balance} ₽"
  await callback.message.edit_text(text, reply_markup=main_menu_keyboard(is_admin=is_admin))
  await callback.answer()


@router.callback_query(F.data == "menu:history")
async def handle_history(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  try:
    me = await api.get_me(callback.from_user.id)
    history = await api.get_wallet_history(callback.from_user.id)
  except Exception:
    await callback.answer("Ошибка авторизации. Отправьте /start и попробуйте снова.", show_alert=True)
    return
  is_admin = me.get("role") == "admin"
  payments = history.get("payments") or []
  if not payments:
    text = "История пополнений пуста."
  else:
    lines = []
    for p in payments[:10]:
      amount = p.get("amount")
      status = p.get("status")
      method = p.get("method")
      lines.append(f"{amount} ₽ — {status} ({method})")
    text = "Последние пополнения:\n" + "\n".join(lines)
  await callback.message.edit_text(text, reply_markup=main_menu_keyboard(is_admin=is_admin))
  await callback.answer()


@router.callback_query(F.data == "menu:topup")
async def handle_topup_start(callback: CallbackQuery, state: FSMContext) -> None:
  await state.set_state(WalletStates.waiting_topup_amount)
  await callback.message.edit_text(
    "Введите сумму пополнения в рублях (например, 500):",
    reply_markup=flow_cancel_keyboard(),
  )
  await callback.answer()


@router.message(WalletStates.waiting_topup_amount)
async def handle_topup_amount(message: Message, state: FSMContext, api: BackendApiClient) -> None:
  if not message.from_user:
    return

  text = message.text or ""
  try:
    amount = float(text.replace(",", "."))
  except ValueError:
    await message.answer("Введите число. Например, 500 или 500.5")
    return

  if amount <= 0:
    await message.answer("Сумма должна быть больше нуля. Попробуйте ещё раз.")
    return

  try:
    data = await api.create_topup(message.from_user.id, amount)
  except Exception:
    await message.answer("Не удалось создать счёт. Отправьте /start и попробуйте ещё раз.")
    await state.clear()
    return
  payment_url = data.get("paymentUrl")
  if not payment_url:
    await message.answer("Не удалось создать счёт. Попробуйте позже.")
    await state.clear()
    return

  await message.answer(
    f"Счёт создан на сумму {amount} ₽.\n"
    "Нажмите кнопку ниже, чтобы оплатить. "
    "После оплаты вернитесь в бот и обновите баланс.",
    reply_markup=topup_confirm_keyboard(payment_url),
  )
  await state.clear()


@router.callback_query(F.data == "menu:bybit")
async def handle_bybit_menu(callback: CallbackQuery, api: BackendApiClient, state: FSMContext) -> None:
  if not callback.from_user:
    await callback.answer()
    return
  try:
    me = await api.get_me(callback.from_user.id)
  except Exception:
    await callback.answer("Ошибка авторизации. Отправьте /start и попробуйте снова.", show_alert=True)
    return
  current_uid = me.get("bybitUid") or "не указан"
  text = f"Bybit UID: {current_uid}\n\n" \
         "Вы можете сохранить свой UID или проверить последние пополнения."
  await state.clear()
  await callback.message.edit_text(text, reply_markup=bybit_menu_keyboard())
  await callback.answer()


@router.callback_query(F.data == "bybit:save")
async def handle_bybit_save_start(callback: CallbackQuery, state: FSMContext) -> None:
  await state.set_state(WalletStates.waiting_bybit_uid)
  await callback.message.edit_text(
    "Отправьте ваш Bybit UID (или 0, чтобы очистить):",
    reply_markup=flow_cancel_keyboard(),
  )
  await callback.answer()


@router.message(WalletStates.waiting_bybit_uid)
async def handle_bybit_uid(message: Message, state: FSMContext, api: BackendApiClient) -> None:
  if not message.from_user:
    return
  raw = (message.text or "").strip()
  value = None if raw == "0" or raw == "" else raw

  try:
    data = await api.set_bybit_uid(message.from_user.id, value)
  except Exception:
    await message.answer("Ошибка при сохранении Bybit UID. Отправьте /start и попробуйте ещё раз.")
    await state.clear()
    return
  if data.get("success"):
    await message.answer("Bybit UID сохранён.")
  else:
    await message.answer(data.get("error") or "Не удалось сохранить Bybit UID.")
  await state.clear()


@router.callback_query(F.data == "bybit:check")
async def handle_bybit_check(callback: CallbackQuery, api: BackendApiClient) -> None:
  if not callback.from_user:
    await callback.answer()
    return

  try:
    data = await api.bybit_quick_check(callback.from_user.id)
  except Exception:
    await callback.answer("Ошибка при проверке Bybit", show_alert=True)
    return

  if not data.get("success"):
    error = data.get("error") or "Не удалось проверить пополнения Bybit"
    await callback.answer(error, show_alert=True)
    return

  processed = data.get("processed") or 0
  if processed > 0:
    await callback.answer(f"Синхронизировано пополнений Bybit: {processed}", show_alert=True)
  else:
    await callback.answer("Новых пополнений Bybit не найдено", show_alert=True)
