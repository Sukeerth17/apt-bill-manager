import pyotp
import time
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from ..config import settings
from .. import schemas

# --- JWT Configuration ---
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token")

# --- MOCK OTP STORAGE (Wiped on server restart) ---
OTP_CACHE = {} 
OTP_LIFETIME_SECONDS = 300 # 5 minutes

def generate_otp(identifier: str) -> str:
    """Generates a 6-digit OTP and stores it in the cache."""
    hotp = pyotp.HOTP(SECRET_KEY[:16], digits=6)
    otp_code = hotp.at(int(time.time()))
    
    OTP_CACHE[identifier] = {
        "code": otp_code,
        "expires_at": time.time() + OTP_LIFETIME_SECONDS
    }
    print(f"Generated OTP for {identifier}: {otp_code}")
    return otp_code

def verify_otp(identifier: str, otp_code: str) -> bool:
    """Verifies the submitted OTP against the cache."""
    if identifier not in OTP_CACHE:
        return False
        
    cached_data = OTP_CACHE[identifier]
    
    if time.time() > cached_data["expires_at"]:
        del OTP_CACHE[identifier]
        return False
        
    if cached_data["code"] == otp_code:
        del OTP_CACHE[identifier] 
        return True
        
    return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Creates a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt