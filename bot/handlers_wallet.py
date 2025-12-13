from __future__ import annotations

from aiogram import Router, F
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
import httpx

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
    waiting_bybit_receipt = State()


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
    user_id = callback.from_user.id
    username = callback.from_user.username or "Не указан"
    full_name = callback.from_user.full_name
    
    text = (
        f"👤 <b>Личный кабинет</b>\n\n"
        f"🆔 ID: <code>{user_id}</code>\n"
        f"👤 Имя: {full_name}\n"
        f"📧 Username: @{username}\n"
        f"➖➖➖➖➖➖➖➖➖➖\n"
        f"💰 <b>Баланс:</b> <code>{balance} ₽</code>"
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
    
    def format_item(p):
        amount = p.get("amount")
        status = p.get("status")
        method = p.get("method")
        
        status_emoji = "✅" if status == "paid" else "⏳" if status == "pending" else "❌"
        return f"<blockquote>{status_emoji} <b>{amount} ₽</b> — {status} ({method})</blockquote>"
        
    text_content, keyboard = create_pagination_keyboard(
        items=payments,
        page=page,
        items_per_page=5,
        callback_prefix="history:page",
        item_formatter=format_item,
        back_callback="menu:back"
    )
    
    if not payments:
        text_content = "История пополнений пуста."
    else:
        text_content = f"<b>Последние пополнения (стр. {page}):</b>\n" + text_content

    await callback.message.edit_text(text_content, reply_markup=keyboard)
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
        f"📊 <b>Курс и наличие</b>\n\n"
        f"💰 <b>Курс:</b> <code>{rate_per_100} ₽</code> за 100 R$\n"
        f"📦 <b>В наличии:</b> <code>{robux_available} R$</code>\n\n"
        f"<blockquote>Курс может меняться в зависимости от рынка.</blockquote>"
    )
    
    await callback.message.edit_text(text, reply_markup=stock_keyboard())
    await callback.answer()


@router.callback_query(F.data.startswith("menu:orders_history") | F.data.startswith("orders:page:"))
async def handle_orders_history(callback: CallbackQuery, api: BackendApiClient) -> None:
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
        orders_data = await api.get_my_orders(callback.from_user.id)
    except Exception:
        await callback.answer("Ошибка получения заказов.", show_alert=True)
        return
        
    orders = orders_data.get("orders") or []
    
    def format_item(order):
        oid = order.get("id")
        amount = order.get("amount")
        status = order.get("status")
        
        status_emoji = {
            "pending": "⏳",
            "done": "✅",
            "cancelled": "❌",
            "error": "⚠️"
        }.get(status, "❓")
        
        return f"<blockquote>{status_emoji} <b>Заказ #{oid}</b>\n💰 {amount} R$ — {status}</blockquote>"
        
    text_content, keyboard = create_pagination_keyboard(
        items=orders,
        page=page,
        items_per_page=5,
        callback_prefix="orders:page",
        item_formatter=format_item,
        back_callback="menu:back"
    )
    
    if not orders:
        text_content = "Список заказов пуст."
    else:
        text_content = f"<b>Ваши заказы (стр. {page}):</b>\n" + text_content

    await callback.message.edit_text(text_content, reply_markup=keyboard)
    await callback.answer()


@router.callback_query(F.data == "menu:topup")
async def handle_topup_start(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(WalletStates.waiting_topup_amount)
    await callback.message.edit_text(
        "💳 <b>Пополнение баланса</b>\n\n"
        "<blockquote>Введите сумму пополнения в рублях (например, 500):</blockquote>",
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

    await message.answer(
        f"💳 <b>Выберите способ оплаты</b>\n"
        f"Сумма: {amount} ₽",
        reply_markup=payment_method_keyboard(amount)
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
        f"<blockquote>Сумма к оплате: {amount} ₽</blockquote>\n\n"
        "Нажмите кнопку ниже, чтобы оплатить.\n"
        "После оплаты вернитесь в бот и обновите баланс.",
        reply_markup=topup_confirm_keyboard(payment_url),
    )


@router.callback_query(F.data.startswith("topup:method:bybit:"))
async def handle_topup_bybit(callback: CallbackQuery, api: BackendApiClient, state: FSMContext) -> None:
    if not callback.from_user:
        return

    try:
        amount = float(callback.data.split(":")[-1])
    except ValueError:
        await callback.answer("Ошибка суммы", show_alert=True)
        return

    await callback.message.edit_text("⏳ Создаем платеж Bybit Pay...")

    try:
        res = await api.create_bybit_pay_order(
            telegram_id=callback.from_user.id,
            amount_rub=amount
        )
    except Exception as e:
        await callback.message.edit_text(f"❌ Ошибка создания платежа: {e}")
        return

    payment_id = res.get("paymentId")
    pay_url = res.get("payUrl") or res.get("webUrl") or res.get("appUrl")
    amount_usdt = res.get("amountUsdt")
    
    if not pay_url:
        # Fallback if no URL returned (e.g. if API requires QR scan only)
        # But for E_COMMERCE it should return a URL.
        # Let's print the full response to debug if it fails
        await callback.message.edit_text(f"❌ Ошибка: Bybit не вернул ссылку на оплату.\nResponse: {res}")
        return
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔗 Оплатить через Bybit", url=pay_url)],
        [InlineKeyboardButton(text="🔄 Проверить оплату", callback_data=f"bybit:check:{payment_id}")],
        [InlineKeyboardButton(text="⬅️ Отмена", callback_data="flow:cancel")]
    ])
    
    text = (
        f"💱 <b>Оплата через Bybit Pay</b>\n\n"
        f"Сумма: <b>{amount} RUB</b> (~{amount_usdt} USDT)\n\n"
        f"Нажмите кнопку ниже, чтобы перейти к оплате."
    )
    
    await callback.message.edit_text(text, reply_markup=keyboard)


@router.callback_query(F.data.startswith("bybit:check:"))
async def handle_bybit_check(callback: CallbackQuery, api: BackendApiClient) -> None:
    payment_id = callback.data.split(":")[-1]
    
    await callback.answer("Проверяем платеж...", show_alert=False)
    
    try:
        res = await api.check_bybit_payment(callback.from_user.id, payment_id)
        
        if res.get("paid") or res.get("alreadyPaid"):
             await callback.message.edit_text(
                "✅ <b>Оплата получена!</b>\n\n"
                "Ваш баланс успешно пополнен."
             )
        else:
             await callback.answer("Платеж пока не найден. Попробуйте через минуту.", show_alert=True)
             
    except Exception as e:
        await callback.answer("Ошибка проверки. Попробуйте позже.", show_alert=True)

