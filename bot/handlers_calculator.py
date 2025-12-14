from __future__ import annotations

from aiogram import Router, F
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton

from .backend_api import BackendApiClient
from .keyboards import main_menu_keyboard, flow_cancel_keyboard


router = Router()


class CalculatorStates(StatesGroup):
    waiting_amount = State()


@router.callback_query(F.data == "menu:calculator")
async def handle_calculator_start(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(CalculatorStates.waiting_amount)
    await callback.message.edit_text(
        "🧮 <b>Калькулятор стоимости</b>\n\n"
        "👇 <b>Введите количество робуксов:</b>\n"
        "<blockquote>Например: 1000</blockquote>",
        reply_markup=flow_cancel_keyboard(),
    )
    await callback.answer()


@router.message(CalculatorStates.waiting_amount)
async def handle_calculator_calculate(
    message: Message,
    state: FSMContext,
    api: BackendApiClient,
) -> None:
    text = (message.text or "").strip()
    
    if not text.isdigit():
        await message.answer("⚠️ Введите целое число.")
        return

    amount = int(text)
    if amount <= 0:
        await message.answer("⚠️ Число должно быть больше 0.")
        return

    try:
        settings = await api.get_public_settings()
        rate = settings.get("rate", 0)
        stock = await api.get_stock_summary()
        available = stock.get("robuxAvailable", 0)
    except Exception:
        await message.answer("❌ Ошибка получения курса. Попробуйте позже.")
        await state.clear()
        return

    price = round(amount * rate, 2)
    amount_to_receive = int(amount * 0.7)
    
    # Check if stock is sufficient
    stock_status = "✅ В наличии" if available >= amount else f"⚠️ Мало на складе (всего {available})"

    result_text = (
        f"🧮 <b>Расчет стоимости</b>\n\n"
        f"💎 <b>Вы покупаете:</b> <code>{amount} R$</code>\n"
        f"📥 <b>Получите на счет:</b> <code>{amount_to_receive} R$</code>\n"
        f"💰 <b>Цена:</b> <code>{price} ₽</code>\n"
        f"📦 <b>Статус:</b> {stock_status}\n"
        f"📊 <b>Курс:</b> {round(rate * 100, 2)} ₽ за 100 R$\n\n"
        f"<blockquote>ℹ️ Учтена комиссия Roblox 30%</blockquote>"
    )

    # Button to proceed to order with this amount
    buy_keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=f"🛒 Купить за {price} ₽",
                    callback_data=f"order:create:{amount}"
                )
            ],
            [
                InlineKeyboardButton(text="🔄 Посчитать еще", callback_data="menu:calculator"),
                InlineKeyboardButton(text="⬅️ В меню", callback_data="flow:cancel")
            ]
        ]
    )

    await message.answer(result_text, reply_markup=buy_keyboard)
    await state.clear()
