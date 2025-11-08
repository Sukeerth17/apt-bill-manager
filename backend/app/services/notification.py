import httpx
from typing import List
from .. import schemas
from ..config import settings
from fastapi import HTTPException, status, BackgroundTasks

# Telegram API Configuration
TELEGRAM_BASE_URL = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}"

async def send_telegram_notification(chat_id: str, message: str):
    """
    Sends a message to a specific Telegram Chat ID using the free Telegram Bot API.
    """
    if settings.TELEGRAM_BOT_TOKEN == "YOUR_TELEGRAM_BOT_TOKEN_HERE":
        # Mock successful send if using placeholder token
        print(f"--- MOCK TELEGRAM SENT --- CHAT ID: {chat_id}, MESSAGE: {message}")
        return True
        
    try:
        url = f"{TELEGRAM_BASE_URL}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "MarkdownV2"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=15)

        if response.status_code != 200:
            print(f"Telegram Error for Chat ID {chat_id}: {response.text}")
            return False
            
        return True
    
    except Exception as e:
        print(f"Telegram connection failed: {e}")
        return False

def format_bill_message(record: schemas.BillRecord) -> str:
    """Formats the bill data into a Markdown-friendly message."""
    
    # Use MarkdownV2 escape characters to ensure correct formatting in Telegram
    def escape_markdown(text):
        special_chars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!']
        for char in special_chars:
            text = text.replace(char, f'\\{char}')
        return text

    flat_no = escape_markdown(record.flat_no)
    name = escape_markdown(record.name)
    units = escape_markdown(f"{record.units_consumed:.2f}")
    amount = escape_markdown(f"₹{record.amount_due:.2f}")

    message = (
        f"\\*\\*Apartment Bill Notification\\*\\*\n\n"
        f"Hello, {name}\\.\n"
        f"Your bill for **Flat No: {flat_no}** is ready for this period\\.\n\n"
        f"💧 Units Consumed: **{units}** units\n"
        f"💰 Amount Due: **{amount}**\n\n"
        f"Thank you\\! Please contact the committee for payment details\\."
    )
    return message
    
async def send_all_notifications_task(records: List[schemas.BillRecord]):
    """Background task to send all notifications asynchronously."""
    print(f"Starting background task to send {len(records)} notifications.")
    
    for record in records:
        if record.telegram_chat_id:
            message = format_bill_message(record)
            # Send message without waiting for response (fire-and-forget for speed)
            await send_telegram_notification(record.telegram_chat_id, message)
            # Add a small delay to avoid hitting Telegram rate limits
            await httpx.AsyncClient().get("http://localhost:8000/delay", timeout=0.5) 
    
    print("Background notification task finished.")