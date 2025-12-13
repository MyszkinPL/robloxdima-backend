from __future__ import annotations

from aiogram import Router, F
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.context import FSMContext
from aiogram.types import Message, CallbackQuery

from .backend_api import BackendApiClient
from .keyboards import main_menu_keyboard


router = Router()


class OrderStates(StatesGroup):
  waiting_username = State()
  waiting_amount = State()
  waiting_place_id = State()


@router.callback_query(F.data == "menu:order")
async def handle_order_start(callback: CallbackQuery, state: FSMContext) -> None:
  await state.set_state(OrderStates.waiting_username)
  await callback.message.edit_text(
    "Введите ваш ник в Roblox:",
  )
  await callback.answer()


@router.message(OrderStates.waiting_username)
async def handle_order_username(message: Message, state: FSMContext) -> None:
  username = (message.text or "").strip()
  if len(username) < 3 or len(username) > 50:
    await message.answer("Ник должен быть от 3 до 50 символов. Попробуйте ещё раз.")
    return
  await state.update_data(username=username)
  await state.set_state(OrderStates.waiting_amount)
  await message.answer("Сколько робуксов хотите купить? (от 10 до 100000)")


@router.message(OrderStates.waiting_amount)
async def handle_order_amount(message: Message, state: FSMContext) -> None:
  text = (message.text or "").strip()
  if not text.isdigit():
    await message.answer("Введите целое число робуксов.")
    return
  amount = int(text)
  if amount < 10 or amount > 100000:
    await message.answer("Сумма должна быть от 10 до 100000.")
    return
  await state.update_data(amount=amount)
  await state.set_state(OrderStates.waiting_place_id)
  await message.answer("Отправьте ID плейса или ссылку на игру.")


@router.message(OrderStates.waiting_place_id)
async def handle_order_place_id(
  message: Message,
  state: FSMContext,
  api: BackendApiClient,
) -> None:
  if not message.from_user:
    return

  place_raw = (message.text or "").strip()
  if "roblox.com" in place_raw:
    # backend сам вырежет ID из ссылки, можно отправлять как есть
    place_id = place_raw
  else:
    place_id = place_raw

  data = await state.get_data()
  username = data.get("username")
  amount = data.get("amount")

  if not username or not amount:
    await message.answer("Что-то пошло не так. Начните заказ заново.")
    await state.clear()
    return

  try:
    result = await api.create_order(
      telegram_id=message.from_user.id,
      username=username,
      amount=int(amount),
      place_id=place_id,
    )
  except Exception:
    await message.answer("Не удалось создать заказ. Попробуйте позже.")
    await state.clear()
    return

  if not result.get("success"):
    error = result.get("error") or "Неизвестная ошибка при создании заказа."
    await message.answer(error)
    await state.clear()
    return

  order_id = result.get("orderId")
  me = await api.get_me(message.from_user.id)
  is_admin = me.get("role") == "admin"
  await message.answer(
    f"Заказ создан! ID заказа: {order_id}\n"
    "Ожидайте выполнения. Статус можно отслеживать на сайте.",
    reply_markup=main_menu_keyboard(is_admin=is_admin),
  )
  await state.clear()
