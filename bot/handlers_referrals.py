from aiogram import Router, F
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton

from .backend_api import BackendApiClient

router = Router()

@router.callback_query(F.data == "menu:referrals")
async def show_referrals(callback: CallbackQuery, api: BackendApiClient) -> None:
    user_id = callback.from_user.id
    try:
        stats = await api.get_referrals(user_id)
        bot_user = await callback.bot.get_me()
        bot_username = bot_user.username
        
        ref_link = f"https://t.me/{bot_username}?start={user_id}"
        
        balance = stats.get("referralBalance", 0)
        count = stats.get("referralsCount", 0)
        percent = stats.get("referralPercent", 5)
        
        text = (
            f"<b>👥 Реферальная система</b>\n\n"
            f"Приглашайте друзей и получайте <b>{percent}%</b> от суммы их покупок на свой реферальный баланс!\n\n"
            f"🔗 <b>Ваша ссылка:</b>\n<code>{ref_link}</code>\n\n"
            f"📊 <b>Статистика:</b>\n"
            f"• Приглашено: <b>{count}</b> чел.\n"
            f"• Баланс: <b>{balance:.2f} ₽</b>\n\n"
            f"<i>Деньги с реферального баланса можно использовать для покупок в боте.</i>"
        )
        
        # TODO: Add Withdraw/Transfer button if balance > 0
        
        rows = []
        if balance > 0:
            rows.append([InlineKeyboardButton(text="💸 Перевести на основной баланс", callback_data="referrals:transfer")])
        
        rows.append([InlineKeyboardButton(text="🔙 Назад", callback_data="menu:back")])
        
        keyboard = InlineKeyboardMarkup(inline_keyboard=rows)
        
        await callback.message.edit_text(text, reply_markup=keyboard)
        
    except Exception as e:
        await callback.answer("Ошибка при загрузке данных", show_alert=True)
        # Log error in production
        print(f"Error in show_referrals: {e}")


@router.callback_query(F.data == "referrals:transfer")
async def handle_referral_transfer(callback: CallbackQuery, api: BackendApiClient) -> None:
    user_id = callback.from_user.id
    try:
        res = await api.transfer_referral_balance(user_id)
        amount = res.get("transferred", 0)
        
        await callback.answer(f"✅ Успешно переведено {amount:.2f} ₽ на основной баланс!", show_alert=True)
        
        # Refresh the referral page
        await show_referrals(callback, api)
        
    except Exception as e:
        await callback.answer("Ошибка перевода. Возможно, баланс пуст.", show_alert=True)
