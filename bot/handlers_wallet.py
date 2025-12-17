from __future__ import annotations

from aiogram import Router, F
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton, LabeledPrice, PreCheckoutQuery
import httpx
import math

from .backend_api import BackendApiClient
from .keyboards import (
    main_menu_keyboard, 
    topup_confirm_keyboard, 
    payment_method_keyboard,
    flow_cancel_keyboard,
    profile_keyboard,
    stock_keyboard
)
from .utils import create_pagination_keyboard


router = Router()


class WalletStates(StatesGroup):
    waiting_topup_amount = State()


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
    total_orders = me.get("totalOrders", 0)
    total_spent = me.get("totalSpent", 0)
    
    user_id = callback.from_user.id
    username = callback.from_user.username or "Не указан"
    full_name = callback.from_user.full_name
    
    text = (
        f"👤 <b>Личный кабинет</b>\n\n"
        f"<blockquote>🆔 ID: <code>{user_id}</code></blockquote>\n"
        f"<blockquote>👤 Имя: {full_name}</blockquote>\n"
        f"<blockquote>📧 Username: @{username}</blockquote>\n"
        f"➖➖➖➖➖➖➖➖➖➖\n"
        f"💰 <b>Ваш баланс:</b> <code>{balance} ₽</code>\n"
        f"📦 <b>Всего заказов:</b> <code>{total_orders}</code>\n"
        f"💸 <b>Потрачено за все время:</b> <code>{total_spent} ₽</code>"
    )
    await callback.message.edit_text(text, reply_markup=profile_keyboard())
    await callback.answer()


@router.callback_query(F.data.startswith("menu:history") | F.data.startswith("history:page:"))
async def handle_history(callback: CallbackQuery, api: BackendApiClient) -> None:
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
        history = await api.get_wallet_history(callback.from_user.id)
    except Exception:
        await callback.answer("Ошибка авторизации. Отправьте /start и попробуйте снова.", show_alert=True)
        return
    payments = history.get("payments") or []
    
    def format_button(p):
        amount = p.get("amount")
        status = p.get("status")
        # method = p.get("method") # Method is less important for button, maybe in details?
        
        status_icon = "✅" if status == "paid" else "⏳" if status == "pending" else "❌"
        
        try:
             date_part = p.get('createdAt', '')[:10].split('-')
             date_str = f" ({date_part[2]}.{date_part[1]})"
        except:
             date_str = ""
             
        return f"{status_icon} {amount} ₽{date_str}"

    text_content, keyboard = create_pagination_keyboard(
        items=payments,
        page=page,
        items_per_page=5,
        callback_prefix="history:page",
        item_formatter=None,
        back_callback="menu:back",
        item_callback_prefix="history:details",
        item_id_key="id",
        item_button_formatter=format_button
    )
    
    if not payments:
        text_content = "История пополнений пуста."
        keyboard = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="🔙 Назад", callback_data="menu:back")]])
    else:
        text_content = f"<b>Последние пополнения (стр. {page}):</b>\nНажмите для подробностей."

    await callback.message.edit_text(text_content, reply_markup=keyboard)
    await callback.answer()


@router.callback_query(F.data.startswith("history:details:"))
async def handle_history_details(callback: CallbackQuery, api: BackendApiClient) -> None:
    payment_id = callback.data.split(":")[-1]
    
    try:
        history = await api.get_wallet_history(callback.from_user.id)
        payments = history.get("payments") or []
        payment = next((p for p in payments if p["id"] == payment_id), None)
    except Exception:
        await callback.answer("Ошибка загрузки.", show_alert=True)
        return

    if not payment:
        await callback.answer("Платеж не найден.", show_alert=True)
        return

    status = payment.get("status")
    status_text = {
        "pending": "⏳ Ожидает оплаты",
        "paid": "✅ Оплачен",
        "cancelled": "❌ Отменен",
        "expired": "⏰ Истек"
    }.get(status, status)

    text = (
        f"🧾 <b>Чек пополнения</b>\n\n"
        f"💳 <b>ID платежа:</b> <code>{payment.get('id')}</code>\n"
        f"💰 <b>Сумма:</b> <code>{payment.get('amount')} ₽</code>\n"
        f"🏦 <b>Способ оплаты:</b> {payment.get('method')}\n"
        f"📊 <b>Статус:</b> {status_text}\n"
        f"📅 <b>Дата создания:</b> {payment.get('createdAt')}\n"
    )

    # Back button to history page (calculating page might be hard, so just back to history start)
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🔙 Назад к списку", callback_data="menu:history")
    ]])
    
    await callback.message.edit_text(text, reply_markup=keyboard)
    await callback.answer()


@router.callback_query(F.data == "menu:stock_info")
async def handle_stock_info(callback: CallbackQuery, api: BackendApiClient) -> None:
    if not callback.from_user:
        await callback.answer()
        return

    try:
        settings = await api.get_public_settings()
        stock = await api.get_stock_summary()
    except Exception:
        await callback.answer("Ошибка получения данных.", show_alert=True)
        return

    rate = settings.get("rate", 0)
    robux_available = stock.get("robuxAvailable", 0)
    
    rate_per_100 = round(rate * 100, 2)

    text = (
        f"📊 <b>Актуальная информация</b>\n\n"
        f"💎 <b>Курс валюты:</b>\n"
        f"🔹 <code>{rate_per_100} ₽</code> = 100 R$\n\n"
        f"📦 <b>Доступно к покупке:</b>\n"
        f"🔹 <code>{robux_available} R$</code>\n\n"
        f"<blockquote>💡 Курс может меняться в зависимости от ситуации на рынке.</blockquote>"
    )
    
    await callback.message.edit_text(text, reply_markup=stock_keyboard())
    await callback.answer()


@router.callback_query(F.data == "menu:topup")
async def handle_topup_start(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(WalletStates.waiting_topup_amount)
    await callback.message.edit_text(
        "💳 <b>Пополнение баланса</b>\n\n"
        "👇 <b>Введите сумму в рублях:</b>\n"
        "<blockquote>Минимальная сумма: 10 ₽</blockquote>\n\n"
        "<i>Отправьте сообщение с числом, например: 500</i>",
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
        await message.answer("⚠️ Сумма должна быть больше нуля. Попробуйте ещё раз.")
        return

    try:
        settings = await api.get_public_settings()
    except:
        settings = {}

    await message.answer(
        f"💳 <b>Выберите способ оплаты</b>\n\n"
        f"💰 <b>Сумма к оплате:</b> <code>{amount} ₽</code>\n\n"
        "👇 Нажмите на кнопку ниже:",
        reply_markup=payment_method_keyboard(amount, settings)
    )
    await state.clear()


@router.callback_query(F.data.startswith("topup:method:cryptobot:"))
async def handle_topup_cryptobot(callback: CallbackQuery, api: BackendApiClient) -> None:
    if not callback.from_user:
        return
    
    try:
        amount = float(callback.data.split(":")[-1])
    except ValueError:
        await callback.answer("Ошибка суммы", show_alert=True)
        return

    try:
        data = await api.create_topup(callback.from_user.id, amount)
    except httpx.HTTPStatusError as e:
        # Обрабатываем ошибку лимитов (400 Bad Request)
        if e.response.status_code == 400:
             try:
                 error_json = e.response.json()
                 error_text = error_json.get('error', 'Ошибка создания счета')
                 await callback.message.edit_text(f"⚠️ {error_text}")
             except:
                 await callback.message.edit_text("⚠️ Ошибка валидации данных.")
             return

        text_error = "❌ Не удалось создать счёт. Отправьте /start и попробуйте ещё раз."
        try:
            if e.response is not None and e.response.status_code == 503:
                payload = e.response.json()
                api_error = payload.get("error")
                if isinstance(api_error, str) and api_error:
                    text_error = f"❌ {api_error}"
                else:
                    text_error = "🚧 Магазин на техническом обслуживании"
        except Exception:
            if e.response is not None and e.response.status_code == 503:
                text_error = "🚧 Магазин на техническом обслуживании"
        await callback.message.edit_text(text_error)
        return
    except Exception:
        await callback.message.edit_text("❌ Не удалось создать счёт. Отправьте /start и попробуйте ещё раз.")
        return
    payment_url = data.get("paymentUrl")
    if not payment_url:
        await callback.message.edit_text("❌ Не удалось создать счёт. Попробуйте позже.")
        return

    await callback.message.edit_text(
        f"💳 <b>Счёт Crypto Bot создан!</b>\n\n"
        f"💰 <b>К оплате:</b> <code>{amount} ₽</code>\n\n"
        "<blockquote>⚠️ У вас есть 15 минут на оплату.</blockquote>\n\n"
        "👇 Нажмите кнопку ниже для перехода к оплате:",
        reply_markup=topup_confirm_keyboard(payment_url),
    )


@router.callback_query(F.data.startswith("topup:method:paypalych:"))
async def handle_topup_paypalych(callback: CallbackQuery, api: BackendApiClient) -> None:
    if not callback.from_user:
        return
    
    parts = callback.data.split(":")
    # Expected format: topup:method:paypalych:sbp:100 or topup:method:paypalych:card:100
    if len(parts) < 5:
        await callback.answer("Ошибка данных", show_alert=True)
        return

    sub_method = parts[3] # sbp or card
    try:
        amount = float(parts[4])
    except ValueError:
        await callback.answer("Ошибка суммы", show_alert=True)
        return

    try:
        data = await api.create_topup(callback.from_user.id, amount, method="paypalych", sub_method=sub_method)
    except httpx.HTTPStatusError as e:
        text_error = "❌ Не удалось создать счёт. Отправьте /start и попробуйте ещё раз."
        try:
            if e.response is not None:
                payload = e.response.json()
                api_error = payload.get("error")
                if isinstance(api_error, str) and api_error:
                    text_error = f"❌ {api_error}"
        except Exception:
            pass
        await callback.message.edit_text(text_error)
        return
    except Exception:
        await callback.message.edit_text("❌ Не удалось создать счёт. Отправьте /start и попробуйте ещё раз.")
        return

    payment_url = data.get("paymentUrl")
    if not payment_url:
        await callback.message.edit_text("❌ Не удалось создать счёт. Попробуйте позже.")
        return
    
    method_name = "СБП" if sub_method == "sbp" else "Картой"
    
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=f"💸 Оплатить ({method_name})", url=payment_url)],
            [InlineKeyboardButton(text="⬅️ Отмена", callback_data="flow:cancel")],
        ]
    )

    await callback.message.edit_text(
        f"💳 <b>Счёт Paypalych создан!</b>\n\n"
        f"💰 <b>К оплате:</b> <code>{amount} ₽</code>\n"
        f"🏦 <b>Способ:</b> {method_name}\n\n"
        "👇 Нажмите кнопку ниже для перехода к оплате:",
        reply_markup=keyboard,
    )





