import uuid
from datetime import timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from .. import schemas, crud, config, models
from ..database import get_db
from ..services.email import send_otp_email
from ..services.security import (
    generate_otp, verify_otp, ACCESS_TOKEN_EXPIRE_MINUTES, 
    create_access_token, oauth2_scheme, SECRET_KEY, ALGORITHM
)

router = APIRouter()
settings = config.settings

# --- Dependency to get Current Authenticated Member ---

async def get_current_member(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """A dependency function to fetch the current authenticated member from JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    member = crud.get_member_by_email(db, email=token_data.email)
    if member is None or not member.is_active:
        raise credentials_exception
    
    return member

# --- PUBLIC ENDPOINTS (No Login Required) ---

@router.post("/otp/request", summary="Request OTP for Committee Login")
async def request_otp(otp_request: schemas.OtpRequest, db: Session = Depends(get_db)):
    """
    Checks if the email is an authorized member and sends an OTP via the zero-cost email service.
    """
    member = crud.get_member_by_email(db, email=otp_request.email)
    
    # 1. Check if member is authorized and active
    if not member or not member.is_active:
        # Prevent enumeration: always return a general success message
        return {"message": "If the email is authorized, an OTP has been sent."}

    # 2. Generate OTP
    otp_code = generate_otp(otp_request.email) 
    
    # 3. Send OTP (Async)
    try:
        await send_otp_email(otp_request.email, otp_code)
    except Exception as e:
        print(f"Error sending email: {e}")
        # Log the error, but return general success for security
        pass 

    return {"message": "OTP sent successfully to your email address."}

@router.post("/otp/verify", response_model=schemas.Token, summary="Verify OTP and Get Access Token")
def verify_access_and_generate_token(otp_verify: schemas.OtpVerification, db: Session = Depends(get_db)):
    """
    Verifies the OTP and issues a JWT if successful.
    """
    member = crud.get_member_by_email(db, email=otp_verify.email)

    if not member or not member.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized.")

    # Verify the OTP (from the mock cache system)
    if not verify_otp(otp_verify.email, otp_verify.otp):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OTP.")

    # OTP is valid, generate a JWT
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": otp_verify.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

# --- SECURE ENDPOINTS (Requires valid JWT) ---

@router.get("/me", response_model=schemas.CommitteeMember, summary="Get Current Member Info")
def read_member_me(current_member: models.CommitteeMember = Depends(get_current_member)):
    return current_member

@router.get("/members", response_model=List[schemas.CommitteeMember], summary="List All Committee Members (Max 5)")
def list_committee_members(db: Session = Depends(get_db), current_member: models.CommitteeMember = Depends(get_current_member)):
    """Retrieve the authorized committee members list (min 1, max 5)."""
    return crud.get_committee_members(db)

@router.post("/members", response_model=schemas.CommitteeMember, status_code=status.HTTP_201_CREATED, summary="Add a New Committee Member")
def add_committee_member(member: schemas.CommitteeMemberCreate, db: Session = Depends(get_db), current_member: models.CommitteeMember = Depends(get_current_member)):
    """
    Adds a new email/phone to the authorized committee list. Enforces the MAX 5 limit.
    """
    current_members = crud.get_committee_members(db)
    if len(current_members) >= 5:
        raise HTTPException(status_code=403, detail="Maximum of 5 committee members reached.")

    db_member = crud.create_committee_member(db, member=member)
    if db_member is None:
         raise HTTPException(status_code=400, detail="Email or phone number already registered.")

    return db_member


@router.delete("/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove a Committee Member")
def remove_committee_member(member_id: uuid.UUID, db: Session = Depends(get_db), current_member: models.CommitteeMember = Depends(get_current_member)):
    """
    Removes a committee member by ID. Enforces the MIN 1 limit.
    """
    current_members = crud.get_committee_members(db)
    if len(current_members) <= 1:
        raise HTTPException(status_code=403, detail="Cannot delete: Minimum of 1 committee member must remain active.")

    if current_member.id == member_id:
         raise HTTPException(status_code=403, detail="You cannot delete your own active account.")
         
    if not crud.delete_committee_member(db, member_id):
        raise HTTPException(status_code=404, detail="Member not found.")
        
    return