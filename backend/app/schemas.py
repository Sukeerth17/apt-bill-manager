from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
import uuid
from datetime import datetime

# --- COMMITTEE MEMBER SCHEMAS ---

class CommitteeMemberBase(BaseModel):
    email: EmailStr = Field(..., example="committee.head@apt.com")
    phone_number: Optional[str] = Field(None, example="919876543210")

class CommitteeMemberCreate(CommitteeMemberBase):
    pass

class CommitteeMember(CommitteeMemberBase):
    id: uuid.UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- FLAT OWNER SCHEMAS ---

class FlatOwnerRegister(BaseModel):
    """Schema for a user registering their Telegram ID."""
    flat_no: str = Field(..., example="G1")
    telegram_chat_id: str = Field(..., example="1234567890")

class FlatOwner(BaseModel):
    flat_no: str
    name: Optional[str]
    telegram_chat_id: Optional[str]
    phone_number: Optional[str]
    
    class Config:
        from_attributes = True

# --- AUTHENTICATION SCHEMAS ---

class Token(BaseModel):
    access_token: str
    token_type: str

class OtpRequest(BaseModel):
    email: EmailStr

class OtpVerification(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)

# --- BILLING SCHEMAS ---

class BillRecord(BaseModel):
    """A single record ready for notification."""
    flat_no: str
    name: str
    units_consumed: float
    amount_due: float
    # Note: Telegram Chat ID is used for sending, Phone for lookup/logging
    telegram_chat_id: Optional[str] = None

class BillProcessResponse(BaseModel):
    """Final response after processing the Excel file."""
    total_records_processed: int
    notifications_ready: int
    skipped_records: int
    preview: List[BillRecord]