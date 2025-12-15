import asyncio
import logging
from aiogram import Bot
from .backend_api import BackendApiClient

logger = logging.getLogger(__name__)

async def start_scheduler(bot: Bot, api: BackendApiClient):
    logger.info("Scheduler started")
    while True:
        try:
            updates = await api.sync_orders()
            for update in updates:
                user_id_str = str(update["userId"])
                
                # Check if userId is a telegram ID (digits only)
                if not user_id_str.isdigit():
                    continue
                    
                user_id = int(user_id_str)
                status = update["status"]
                amount = update["amount"]
                order_id = update["orderId"][:8] # Shorten ID
                
                if status == "completed":
                    await bot.send_message(
                        user_id,
                        f"✅ <b>Заказ выполнен!</b>\n\n"
                        f"Заказ #{order_id} на {amount} R$ успешно доставлен."
                    )
                elif status == "failed":
                    refunded_text = "\nСредства возвращены на баланс." if update.get("refunded") else ""
                    await bot.send_message(
                        user_id,
                        f"❌ <b>Заказ отменен</b>\n\n"
                        f"Заказ #{order_id} на {amount} R$ не удалось выполнить.{refunded_text}"
                    )
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
        
        await asyncio.sleep(30)
