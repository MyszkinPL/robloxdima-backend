from __future__ import annotations

from math import ceil
from typing import List, Optional

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

def create_pagination_keyboard(
    items: List[dict],
    page: int,
    items_per_page: int,
    callback_prefix: str,
    item_formatter: Optional[callable] = None,  # Function to format item into text (optional if using buttons)
    back_callback: str = "menu:back",
    item_callback_prefix: Optional[str] = None,
    item_id_key: str = "id",
    item_button_formatter: Optional[callable] = None,
) -> tuple[str, InlineKeyboardMarkup]:
    
    if not items:
        total_pages = 1
    else:
        total_pages = ceil(len(items) / items_per_page)
        
    if page < 1:
        page = 1
    if page > total_pages:
        page = total_pages
        
    start_index = (page - 1) * items_per_page
    end_index = start_index + items_per_page
    current_items = items[start_index:end_index]
    
    # Build text content
    text_lines = []
    if item_formatter:
        for item in current_items:
            text_lines.append(item_formatter(item))
        
    if not text_lines and not item_callback_prefix:
        text = "Список пуст."
    elif not text_lines:
        text = f"Страница {page} из {total_pages}"
    else:
        text = "\n".join(text_lines)
        
    # Build keyboard
    keyboard_rows = []

    # Item buttons
    if item_callback_prefix and item_button_formatter:
        for item in current_items:
            btn_text = item_button_formatter(item)
            item_id = item.get(item_id_key)
            keyboard_rows.append([
                InlineKeyboardButton(text=btn_text, callback_data=f"{item_callback_prefix}:{item_id}")
            ])
    
    # Pagination buttons
    pagination_buttons = []
    if page > 1:
        pagination_buttons.append(
            InlineKeyboardButton(text="⬅️", callback_data=f"{callback_prefix}:{page - 1}")
        )
    
    pagination_buttons.append(
        InlineKeyboardButton(text=f"{page}/{total_pages}", callback_data="noop")
    )
    
    if page < total_pages:
        pagination_buttons.append(
            InlineKeyboardButton(text="➡️", callback_data=f"{callback_prefix}:{page + 1}")
        )
        
    if total_pages > 1:
        keyboard_rows.append(pagination_buttons)
        
    # Back button
    keyboard_rows.append([
        InlineKeyboardButton(text="⬅️ Назад", callback_data=back_callback)
    ])
    
    return text, InlineKeyboardMarkup(inline_keyboard=keyboard_rows)
