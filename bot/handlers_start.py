from __future__ import annotations

from aiogram import Router
from aiogram.filters import CommandStart, CommandObject
from aiogram.fsm.context import FSMContext
from aiogram.types import Message

from .backend_api import BackendApiClient
from .keyboards import simple_menu_keyboard
from .config import load_config

router = Router()


@router.message(CommandStart())
async def handle_start(message: Message, command: CommandObject, api: BackendApiClient, state: FSMContext) -> None:
  await state.clear()
  
  # Fetch public settings for support link
  try:
    settings = await api.get_public_settings()
    support_link = settings.get("supportLink")
    if not support_link:
        support_link = "https://t.me/RBTradee"
  except Exception:
    support_link = "https://t.me/RBTradee"

  config = load_config()
  
  await message.answer(
    "<b>👋 Добро пожаловать в RobuxTrade!</b>\n\n"
    "💎 Здесь вы можете купить робуксы по самому выгодному курсу.\n"
    "🚀 Быстрая доставка и гарантия качества.",
    reply_markup=simple_menu_keyboard(support_url=support_link, webapp_url=config.webapp_url),
  )
