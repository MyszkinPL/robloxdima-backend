from __future__ import annotations

from decimal import Decimal
from aiogram import Router, F
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.context import FSMContext
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.exceptions import TelegramBadRequest
import httpx
import math
import logging

logger = logging.getLogger(__name__)

from .backend_api import BackendApiClient
from .keyboards import (
    main_menu_keyboard, 
    flow_cancel_keyboard, 
    order_amount_keyboard,
    order_details_keyboard,
    order_type_keyboard
)
from .stickers import STICKERS
from .utils import create_pagination_keyboard


router = Router()


class OrderStates(StatesGroup):
  waiting_username = State()
  waiting_type = State()
  waiting_amount = State()
  waiting_custom_amount = State()
  waiting_place_id = State()


async def safe_edit_text(message: Message, text: str, reply_markup=None):
    try:
        await message.edit_text(text, reply_markup=reply_markup)
    except TelegramBadRequest:
        await message.answer(text, reply_markup=reply_markup)
    except Exception as e:
        logger.error(f"Error editing message: {e}")


@router.callback_query(F.data == "menu:order")
async def handle_order_start(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
  user_id = callback.from_user.id
  
  # Check active orders
  try:
    orders = await api.get_my_orders(user_id)
    active = [o for o in orders if o.get("status") in ["pending", "processing"]]
    if len(active) >= 3:
      await callback.answer("⚠️ У вас уже есть 3 активных заказа. Дождитесь их завершения.", show_alert=True)
      return
  except Exception as e:
    logger.error(f"Error checking active orders: {e}")
    pass

  await state.clear()
  await state.set_state(OrderStates.waiting_username)
  
  rate = 0
  try:
    settings = await api.get_public_settings()
    rate = settings.get("rate", 0)
  except:
    pass

  text = (
      "👤 <b>Введите ваш ник в Roblox:</b>\n"
      "<blockquote>Пример: RobloxUser123</blockquote>"
  )
  
  if rate > 0:
      text = f"💱 <b>Текущий курс:</b> 1 R$ = {rate} ₽\n\n" + text

  await safe_edit_text(callback.message, text, reply_markup=flow_cancel_keyboard())
  await callback.answer()


@router.callback_query(F.data.startswith("order:create:"))
async def handle_order_create_with_amount(callback: CallbackQuery, state: FSMContext) -> None:
  try:
    amount = int(callback.data.split(":")[-1])
  except ValueError:
    await callback.answer("⚠️ Ошибка суммы.")
    return

  await state.update_data(amount=amount)
  await state.set_state(OrderStates.waiting_username)
  
  text = (
    f"✅ <b>Выбрана сумма:</b> {amount} R$\n\n"
    "👤 <b>Введите ваш ник в Roblox:</b>\n"
    "<blockquote>Пример: RobloxUser123</blockquote>"
  )
  await safe_edit_text(callback.message, text, reply_markup=flow_cancel_keyboard())
  await callback.answer()


@router.message(OrderStates.waiting_username)
async def handle_order_username(message: Message, state: FSMContext, api: BackendApiClient) -> None:
  username = (message.text or "").strip()
  # Validation rule: 3 to 20 characters
  if len(username) < 3 or len(username) > 20:
    await message.answer("⚠️ <b>Ошибка:</b> Ник должен быть от 3 до 20 символов. Попробуйте ещё раз.")
    return
  await state.update_data(username=username)
  
  await state.set_state(OrderStates.waiting_type)
  await message.answer(
      f"✅ <b>Ник:</b> {username}\n\n"
      "👇 <b>Выберите способ доставки:</b>",
      reply_markup=order_type_keyboard()
  )


@router.callback_query(F.data.startswith("order:type:"))
async def handle_order_type_selection(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
    type_ = callback.data.split(":")[-1]
    await state.update_data(order_type=type_)
    
    data = await state.get_data()
    if data.get("amount"):
         await state.set_state(OrderStates.waiting_place_id)
         text = (
            f"✅ <b>Способ:</b> {'Gamepass' if type_ == 'gamepass' else 'VIP Server'}\n"
            f"✅ <b>Сумма:</b> {data.get('amount')} R$\n\n"
            "🎮 <b>Введите ID плейса (Place ID):</b>\n"
            "<blockquote>Его можно найти в ссылке на ваш плейс, например:\n.../games/<b>123456</b>/...</blockquote>"
         )
         await safe_edit_text(callback.message, text, reply_markup=flow_cancel_keyboard())
    else:
         rate = 0
         available = 0
         try:
            settings = await api.get_public_settings()
            rate = settings.get("rate", 0)
            stock = await api.get_stock_summary()
            available = stock.get("robuxAvailable", 0)
         except:
            pass
            
         await state.set_state(OrderStates.waiting_amount)
         text = (
            f"✅ <b>Способ:</b> {'Gamepass' if type_ == 'gamepass' else 'VIP Server'}\n\n"
            f"📦 <b>Доступно:</b> {available} R$\n"
            f"💵 <b>Курс:</b> {rate} ₽ за 1 R$\n\n"
            "👇 <b>Выберите сумму робуксов:</b>"
         )
         await safe_edit_text(callback.message, text, reply_markup=order_amount_keyboard())
    await callback.answer()


@router.callback_query(F.data == "order:amount:custom")
async def handle_order_custom_amount_start(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(OrderStates.waiting_custom_amount)
    text = (
        "✍️ <b>Введите сумму робуксов:</b>\n"
        "<blockquote>Минимальная сумма: 100 R$</blockquote>"
    )
    await safe_edit_text(callback.message, text, reply_markup=flow_cancel_keyboard())
    await callback.answer()


@router.message(OrderStates.waiting_custom_amount)
async def handle_order_custom_amount_input(message: Message, state: FSMContext, api: BackendApiClient) -> None:
    text = (message.text or "").strip()
    if not text.isdigit():
        await message.answer("⚠️ Сумма должна быть числом.")
        return
        
    amount = int(text)
    if amount < 100:
        await message.answer("⚠️ Минимальная сумма заказа: 100 R$.")
        return

    await state.update_data(amount=amount)
    await state.set_state(OrderStates.waiting_place_id)
    
    await message.answer(
        f"✅ <b>Сумма:</b> {amount} R$\n\n"
        "🎮 <b>Введите ID плейса (Place ID):</b>\n"
        "<blockquote>Его можно найти в ссылке на ваш плейс, например:\n.../games/<b>123456</b>/...</blockquote>",
        reply_markup=flow_cancel_keyboard()
    )


@router.callback_query(F.data.startswith("order:amount:"))
async def handle_order_amount_selection(callback: CallbackQuery, state: FSMContext) -> None:
    try:
        amount = int(callback.data.split(":")[-1])
    except ValueError:
        await callback.answer("⚠️ Ошибка")
        return
    
    await state.update_data(amount=amount)
    await state.set_state(OrderStates.waiting_place_id)
    
    text = (
        f"✅ <b>Сумма:</b> {amount} R$\n\n"
        "🎮 <b>Введите ID плейса (Place ID):</b>\n"
        "<blockquote>Его можно найти в ссылке на ваш плейс, например:\n.../games/<b>123456</b>/...</blockquote>"
    )
    await safe_edit_text(callback.message, text, reply_markup=flow_cancel_keyboard())
    await callback.answer()


@router.message(OrderStates.waiting_place_id)
async def handle_place_id(message: Message, state: FSMContext, api: BackendApiClient) -> None:
    place_id = (message.text or "").strip()
    if not place_id.isdigit():
        await message.answer("⚠️ Place ID должен состоять только из цифр.")
        return
        
    await state.update_data(place_id=place_id)
    
    data = await state.get_data()
    amount = data.get("amount", 0)
    username = data.get("username", "")
    order_type = data.get("order_type", "gamepass")
    
    rate = 0
    try:
        settings = await api.get_public_settings()
        rate = settings.get("rate", 0)
    except:
        pass
        
    # Use Decimal for accurate money calculation
    try:
        d_amount = Decimal(str(amount))
        d_rate = Decimal(str(rate))
        price = d_amount * d_rate
    except:
        price = Decimal(0)
        
    price_str = f"{price:.2f}"
    amount_to_receive = math.floor(amount * 0.7)
    type_text = "Gamepass" if order_type == "gamepass" else "VIP Server"
    
    await message.answer(
        f"📋 <b>Подтверждение заказа</b>\n\n"
        f"👤 <b>Ник:</b> {username}\n"
        f"📦 <b>Способ:</b> {type_text}\n"
        f"💰 <b>Вы покупаете:</b> {amount} R$\n"
        f"📥 <b>Получите на счет:</b> {amount_to_receive} R$\n"
        f"🎮 <b>Place ID:</b> {place_id}\n"
        f"💵 <b>К оплате:</b> {price_str} ₽\n\n"
        f"<blockquote>⚠️ <b>Внимание:</b> Roblox забирает 30% комиссии.\nЦену геймпасса/сервера нужно ставить <b>{amount} R$</b>.</blockquote>\n\n"
        "Всё верно?",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="✅ Оплатить с баланса", callback_data="order:confirm")],
            [InlineKeyboardButton(text="⬅️ Отмена", callback_data="flow:cancel")]
        ])
    )


@router.callback_query(F.data == "order:confirm")
async def handle_order_confirm(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
    data = await state.get_data()
    username = data.get("username")
    amount = data.get("amount")
    place_id = data.get("place_id")
    order_type = data.get("order_type", "gamepass")
    
    if not username or not amount or not place_id:
        await callback.answer("⚠️ Ошибка данных. Начните заново.")
        await state.clear()
        return
        
    # Show loading state
    await safe_edit_text(callback.message, "⏳ <b>Создаем заказ...</b>", reply_markup=None)
    
    try:
        res = await api.create_order(
            telegram_id=callback.from_user.id,
            username=username,
            amount=amount,
            place_id=place_id,
            order_type=order_type
        )
        
        if res.get("order"):
             order = res.get("order")
             text = (
                 f"✅ <b>Заказ #{order.get('id')[-8:]} создан!</b>\n\n"
                 f"📦 <b>Статус:</b> {order.get('status')}\n\n"
                 "<blockquote>Ожидайте выполнения. Вы получите уведомление при изменении статуса.</blockquote>"
             )
             await safe_edit_text(callback.message, text, reply_markup=main_menu_keyboard())
        else:
             text = f"❌ <b>Ошибка:</b>\n{res.get('error', 'Неизвестная ошибка')}"
             await safe_edit_text(callback.message, text, reply_markup=main_menu_keyboard())
             
    except Exception as e:
        logger.error(f"Error creating order: {e}")
        text = f"❌ <b>Не удалось создать заказ:</b>\n{str(e)}"
        await safe_edit_text(callback.message, text, reply_markup=main_menu_keyboard())
        
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
        orders = data.get("orders")
        if not isinstance(orders, list):
            orders = []
    except Exception:
        await callback.answer("⚠️ Не удалось загрузить заказы.", show_alert=True)
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
        try:
             date_part = o.get('createdAt', '')[:10].split('-')
             date_str = f" ({date_part[2]}.{date_part[1]})"
        except:
             date_str = ""
             
        return f"{status_icon} {amount} R${date_str}"

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
        text_content = "📭 <b>История заказов пуста</b>"
    else:
        text_content = f"📦 <b>Ваши заказы (стр. {page})</b>\n\n👇 Выберите заказ для подробностей:"

    await safe_edit_text(callback.message, text_content, reply_markup=keyboard)
    await callback.answer()


@router.callback_query(F.data.startswith("order:details:"))
async def handle_order_details(callback: CallbackQuery, api: BackendApiClient) -> None:
    order_id = callback.data.split(":")[-1]
    
    try:
        data = await api.get_my_orders(callback.from_user.id)
        orders = data.get("orders")
        if not isinstance(orders, list):
            orders = []
        order = next((o for o in orders if o["id"] == order_id), None)
    except Exception:
        await callback.answer("⚠️ Ошибка загрузки.", show_alert=True)
        return

    if not order:
        await callback.answer("⚠️ Заказ не найден.", show_alert=True)
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
    
    await safe_edit_text(callback.message, text, reply_markup=order_details_keyboard(order_id, status, support_link))
    await callback.answer()


@router.callback_query(F.data.startswith("order:cancel:"))
async def handle_order_cancel(callback: CallbackQuery, api: BackendApiClient) -> None:
    order_id = callback.data.split(":")[-1]
    
    await safe_edit_text(callback.message, "⏳ <b>Отменяем заказ...</b>")
    
    try:
        res = await api.cancel_order(callback.from_user.id, order_id)
        if res.get("success"):
            await safe_edit_text(
                callback.message,
                "✅ <b>Заказ успешно отменен</b>\n\n"
                "Средства возвращены на ваш баланс.",
                reply_markup=main_menu_keyboard()
            )
        else:
             await safe_edit_text(
                callback.message,
                f"❌ <b>Ошибка отмены:</b>\n{res.get('error')}",
                reply_markup=main_menu_keyboard()
            )
            
    except Exception as e:
        await safe_edit_text(callback.message, f"❌ <b>Произошла ошибка:</b>\n{e}")
        
    await callback.answer()


@router.callback_query(F.data.startswith("order:repeat:"))
async def handle_order_repeat(callback: CallbackQuery, state: FSMContext, api: BackendApiClient) -> None:
    order_id = callback.data.split(":")[-1]
    
    try:
        data = await api.get_my_orders(callback.from_user.id)
        orders = data.get("orders")
        if not isinstance(orders, list):
            orders = []
        order = next((o for o in orders if o["id"] == order_id), None)
    except Exception:
        await callback.answer("⚠️ Ошибка загрузки.", show_alert=True)
        return
        
    if not order:
        await callback.answer("⚠️ Заказ не найден.", show_alert=True)
        return

    amount = order.get("amount")
    
    await state.clear()
    await state.update_data(amount=amount)
    await state.set_state(OrderStates.waiting_username)
    
    text = (
        f"✅ <b>Выбрана сумма:</b> {amount} R$ (повтор)\n\n"
        "👤 <b>Введите ваш ник в Roblox:</b>\n"
        "<blockquote>Пример: RobloxUser123</blockquote>"
    )
    await safe_edit_text(callback.message, text, reply_markup=flow_cancel_keyboard())
    await callback.answer()


@router.callback_query(F.data.startswith("order:resend:"))
async def handle_order_resend(callback: CallbackQuery, api: BackendApiClient) -> None:
    order_id = callback.data.split(":")[-1]
    
    await safe_edit_text(callback.message, "⏳ <b>Отправляем запрос на повторную проверку...</b>")
    
    try:
        res = await api.resend_order(callback.from_user.id, order_id)
        if res.get("success"):
            await safe_edit_text(
                callback.message,
                "✅ <b>Запрос отправлен!</b>\n\n"
                "Ожидайте обновления статуса заказа.",
                reply_markup=main_menu_keyboard()
            )
        else:
            await safe_edit_text(
                callback.message,
                f"❌ <b>Ошибка отправки:</b>\n{res.get('error', 'Неизвестная ошибка')}",
                reply_markup=main_menu_keyboard()
            )
            
    except Exception as e:
        await safe_edit_text(
             callback.message,
             f"❌ <b>Произошла ошибка:</b>\n{str(e)}",
             reply_markup=main_menu_keyboard()
        )
        
    await callback.answer()
