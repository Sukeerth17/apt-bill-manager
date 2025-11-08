from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from .database import Base
import uuid

# --- COMMITTEE MEMBER MODEL (The 1 to 5 Authorized Users) ---
class CommitteeMember(Base):
    """
    Authorized members of the committee who can log in.
    Primary login identifier is email (for free OTP).
    """
    __tablename__ = "committee_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False) 
    phone_number = Column(String, unique=True, index=True, nullable=True) 
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=func.now())

# --- FLAT OWNER/TENANT MODEL (For Bill Recipients) ---
class FlatOwner(Base):
    """
    Master record for each flat, including the required Telegram Chat ID for notification.
    """
    __tablename__ = "flat_owners"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    flat_no = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    
    # The Chat ID is essential for sending free Telegram notifications
    telegram_chat_id = Column(String, unique=False, nullable=True) 
    
    # Store the phone number from Excel for reference/lookup
    phone_number = Column(String, index=True, nullable=True) 
    
    created_at = Column(DateTime(timezone=True), default=func.now())