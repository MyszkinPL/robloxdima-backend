from __future__ import annotations

from aiogram import Router, F
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.context import FSMContext
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
import httpx

from .backend_api import BackendApiClient
from .keyboards import (
    main_menu_keyboard, 
    flow_cancel_keyboard, 
    order_amount_keyboard,
    order_details_keyboard
)
from .stickers import STICKERS
from .utils import create_pagination_keyboard


router = Router()


class OrderStates(StatesGroup):
  waiting_username = State()
  waiting_amount = State()
  waiting_place_id = State()


@router.callback_query(F.data == "menu:order")
async def handle_order_start(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
  await state.clear()
  await state.set_state(OrderStates.waiting_username)
  
  rate = 0
  try:
    settings = await api.get_public_settings()
    rate = settings.get("rate", 0)
  except:
    pass

  text = "<blockquote>Введите ваш ник в Roblox:</blockquote>"
  if rate > 0:
      text = f"💱 <b>Курс:</b> 1 R$ = {rate} ₽\n\n" + text

  await callback.message.edit_text(
    text,
    reply_markup=flow_cancel_keyboard(),
  )
  await callback.answer()


@router.callback_query(F.data.startswith("order:create:"))
async def handle_order_create_with_amount(callback: CallbackQuery, state: FSMContext) -> None:
  try:
    amount = int(callback.data.split(":")[-1])
  except ValueError:
    await callback.answer("Ошибка суммы.")
    return

  await state.update_data(amount=amount)
  await state.set_state(OrderStates.waiting_username)
  
  await callback.message.edit_text(
    f"✅ Выбрана сумма: {amount} R$\n\n"
    "<blockquote>Введите ваш ник в Roblox:</blockquote>",
    reply_markup=flow_cancel_keyboard(),
  )
  await callback.answer()


@router.message(OrderStates.waiting_username)
async def handle_order_username(message: Message, state: FSMContext, api: BackendApiClient) -> None:
  username = (message.text or "").strip()
  if len(username) < 3 or len(username) > 50:
    await message.answer("Ник должен быть от 3 до 50 символов. Попробуйте ещё раз.")
    return
  await state.update_data(username=username)
  
  data = await state.get_data()
  if data.get("amount"):
    amount = data.get("amount")
    try:
      settings = await api.get_public_settings()
      rate = settings.get("rate", 0)
      price = round(amount * rate, 2)
    except Exception:
      price = 0

    await state.set_state(OrderStates.waiting_place_id)
    msg_text = (
      f"💰 <b>Стоимость заказа:</b> <code>{price} ₽</code>\n\n"
      "<blockquote>Отправьте ID плейса или ссылку на игру.</blockquote>"
    )
    await message.answer(msg_text, reply_markup=flow_cancel_keyboard())
  else:
    await state.set_state(OrderStates.waiting_amount)
    await message.answer(
      "<blockquote>Сколько робуксов хотите купить? (от 10 до 100000)</blockquote>",
      reply_markup=order_amount_keyboard(),
    )


@router.callback_query(F.data.startswith("order:amount:"))
async def handle_order_amount_callback(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
    try:
        amount = int(callback.data.split(":")[-1])
    except ValueError:
        await callback.answer("Ошибка суммы.")
        return
    
    await state.update_data(amount=amount)
    
    # Calculate price for preview
    try:
      settings = await api.get_public_settings()
      rate = settings.get("rate", 0)
      price = round(amount * rate, 2)
    except Exception:
      price = 0

    await state.set_state(OrderStates.waiting_place_id)
    
    msg_text = (
      f"✅ Выбрана сумма: {amount} R$\n"
      f"💰 <b>Стоимость:</b> <code>{price} ₽</code>\n\n"
      "<blockquote>Отправьте ID плейса или ссылку на игру.</blockquote>"
    )
    
    await callback.message.edit_text(msg_text, reply_markup=flow_cancel_keyboard())
    await callback.answer()


@router.message(OrderStates.waiting_place_id)
async def handle_order_place_id(message: Message, state: FSMContext, api: BackendApiClient) -> None:
  place_id = (message.text or "").strip()
  # Simple validation or regex for place id / url could be added here
  if not place_id:
      await message.answer("Пожалуйста, введите корректный ID плейса.")
      return

  await state.update_data(place_id=place_id)
  data = await state.get_data()
  
  username = data.get("username")
  amount = data.get("amount")
  
  if not username or not amount:
      await message.answer("Ошибка данных. Начните заново.")
      await state.clear()
      return

  # Create order
  try:
      result = await api.create_order(
          telegram_id=message.from_user.id,
          username=username,
          amount=amount,
          place_id=place_id
      )
  except Exception as e:
      await message.answer(f"Ошибка при создании заказа: {e}")
      return

  if not result.get("success"):
    error = result.get("error") or "Неизвестная ошибка при создании заказа."
    await message.answer(error)
    await state.clear()
    return

  order_id = result.get("orderId")
  me = await api.get_me(message.from_user.id)
  is_admin = me.get("role") == "admin"
  
  receipt_text = (
      f"✅ <b>Заказ #{order_id} успешно создан!</b>\n\n"
      f"👤 <b>Ник:</b> {username}\n"
      f"💰 <b>Сумма:</b> {amount} R$\n"
      f"🎮 <b>Плейс:</b> {place_id}\n"
      f"➖➖➖➖➖➖➖➖➖➖\n"
      f"<blockquote>Ожидайте выполнения. Статус можно отслеживать на сайте.</blockquote>"
  )
  
  if STICKERS.get("order_success") and len(STICKERS["order_success"]) > 20:
      try:
          await message.answer_sticker(STICKERS["order_success"])
      except:
          pass

  await message.answer(
    receipt_text,
    reply_markup=main_menu_keyboard(is_admin=is_admin),
  )
  await state.clear()


@router.callback_query(F.data.startswith("menu:orders_history") | F.data.startswith("orders:page:"))
async def handle_my_orders(callback: CallbackQuery, api: BackendApiClient) -> None:
    if not callback.from_user:
        await callback.answer()
        return

    page = 1
    if "page" in callback.data:
        try:
            page = int(callback.data.split(":")[-1])
        except ValueError:
            page = 1

    try:
        data = await api.get_my_orders(callback.from_user.id)
        orders = data.get("orders") or []
    except Exception:
        await callback.answer("Не удалось загрузить заказы.", show_alert=True)
        return

    def format_button(o):
        status = o.get("status")
        status_icon = {
            "pending": "⏳",
            "processing": "⚙️",
            "completed": "✅",
            "cancelled": "❌",
            "failed": "⚠️"
        }.get(status, "❓")
        
        amount = o.get("amount")
        # Format date: 2023-12-14T10:00:00.000Z -> 14.12
        try:
             date_part = o.get('createdAt', '')[:10].split('-')
             date_str = f"{date_part[2]}.{date_part[1]}"
        except:
             date_str = ""
             
        return f"{status_icon} {amount} R$ ({date_str})"

    text_content, keyboard = create_pagination_keyboard(
        items=orders,
        page=page,
        items_per_page=5,
        callback_prefix="orders:page",
        item_formatter=None, 
        back_callback="menu:back",
        item_callback_prefix="order:details",
        item_id_key="id",
        item_button_formatter=format_button
    )
    
    if not orders:
        text_content = "📭 История заказов пуста."
    else:
        text_content = f"📦 <b>Ваши заказы (стр. {page}):</b>\nВыберите заказ для подробностей."

    await callback.message.edit_text(text_content, reply_markup=keyboard)
    await callback.answer()


@router.callback_query(F.data.startswith("order:details:"))
async def handle_order_details(callback: CallbackQuery, api: BackendApiClient) -> None:
    order_id = callback.data.split(":")[-1]
    
    try:
        data = await api.get_my_orders(callback.from_user.id)
        orders = data.get("orders") or []
        order = next((o for o in orders if o["id"] == order_id), None)
    except Exception:
        await callback.answer("Ошибка загрузки.", show_alert=True)
        return

    if not order:
        await callback.answer("Заказ не найден.", show_alert=True)
        return

    status = order.get("status")
    status_text = {
        "pending": "⏳ Ожидает",
        "processing": "⚙️ В обработке",
        "completed": "✅ Выполнен",
        "cancelled": "❌ Отменен",
        "failed": "⚠️ Ошибка"
    }.get(status, status)

    text = (
        f"📦 <b>Заказ #{order.get('id')[-8:]}</b>\n\n"
        f"👤 <b>Ник:</b> {order.get('username')}\n"
        f"💰 <b>Сумма:</b> {order.get('amount')} R$\n"
        f"💵 <b>Цена:</b> {order.get('price')} ₽\n"
        f"🎮 <b>Плейс:</b> {order.get('placeId')}\n"
        f"📊 <b>Статус:</b> {status_text}\n"
        f"📅 <b>Дата:</b> {order.get('createdAt')[:10]}\n"
    )

    support_link = None
    try:
        settings = await api.get_public_settings()
        support_link = settings.get("supportLink")
    except:
        pass
    
    await callback.message.edit_text(text, reply_markup=order_details_keyboard(order_id, status, support_link))
    await callback.answer()


@router.callback_query(F.data.startswith("order:cancel:"))
async def handle_order_cancel(callback: CallbackQuery, api: BackendApiClient) -> None:
    order_id = callback.data.split(":")[-1]
    
    await callback.message.edit_text("⏳ Отменяем заказ...")
    
    try:
        res = await api.cancel_order(callback.from_user.id, order_id)
        if res.get("success"):
            await callback.message.edit_text(
                "✅ Заказ успешно отменен. Средства возвращены на баланс.",
                reply_markup=main_menu_keyboard()
            )
        else:
             await callback.message.edit_text(
                f"❌ Ошибка отмены: {res.get('error')}",
                reply_markup=main_menu_keyboard()
            )
            
    except Exception as e:
        await callback.message.edit_text(f"❌ Произошла ошибка: {e}")
        
    await callback.answer()


@router.callback_query(F.data.startswith("order:repeat:"))
async def handle_order_repeat(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
    order_id = callback.data.split(":")[-1]
    
    try:
        data = await api.get_my_orders(callback.from_user.id)
        orders = data.get("orders") or []
        order = next((o for o in orders if o["id"] == order_id), None)
    except Exception:
        await callback.answer("Ошибка загрузки.", show_alert=True)
        return
        
    if not order:
        await callback.answer("Заказ не найден.", show_alert=True)
        return

    amount = order.get("amount")
    
    await state.clear()
    await state.update_data(amount=amount)
    await state.set_state(OrderStates.waiting_username)
    
    await callback.message.edit_text(
        f"✅ Выбрана сумма: {amount} R$ (повтор)\n\n"
        "<blockquote>Введите ваш ник в Roblox:</blockquote>",
        reply_markup=flow_cancel_keyboard(),
    )
    await callback.answer()
