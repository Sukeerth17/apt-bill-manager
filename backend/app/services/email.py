import httpx
from pydantic import EmailStr
from fastapi import HTTPException, status
from ..config import settings

# Mailgun Endpoint Configuration
MAILGUN_URL = f"https://api.mailgun.net/v3/{settings.MAILGUN_DOMAIN}/messages"
MAILGUN_AUTH = ("api", settings.MAILGUN_API_KEY)

async def send_otp_email(recipient_email: EmailStr, otp_code: str):
    """
    Sends the OTP using the zero-cost email API (Mailgun free tier).
    Uses synchronous httpx.post for simplicity in this utility function.
    """
    # Check for placeholder keys (to allow local testing without real keys)
    if settings.MAILGUN_API_KEY == "key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx":
        print(f"--- MOCK EMAIL SUCCESS --- TO: {recipient_email}, OTP: {otp_code}")
        return True
        
    try:
        data = {
            "from": f"Apt Bill Manager <{settings.MAIL_SENDER_EMAIL}>",
            "to": recipient_email,
            "subject": "Committee Login OTP",
            "text": f"Your one-time passcode (OTP) for the Apt Bill Manager is: {otp_code}. \n\nThis code is valid for 5 minutes. Do not share it."
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                MAILGUN_URL,
                auth=MAILGUN_AUTH,
                data=data,
                timeout=10
            )
        
        if response.status_code not in [200, 202]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send OTP email: {response.text}"
            )
            
    except Exception as e:
        print(f"Error connecting to Mailgun: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="A critical error occurred while sending the OTP email."
        )