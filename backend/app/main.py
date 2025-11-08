from fastapi import FastAPI
from .database import engine, Base
from .routers import auth, bill
from .config import settings

# Initialize the database and create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Apt Bill Manager API",
    description="Zero-Cost, secure bill generation with FastAPI, Postgres, and Telegram.",
    version="1.0.0"
)

# --- Include Routers ---
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication & Committee"])
app.include_router(bill.router, prefix="/api/v1/bill", tags=["Bill Generation & Notifications"])


@app.get("/api/v1/status", tags=["Status"])
def read_root():
    """Check API health status and configuration."""
    return {
        "status": "ok", 
        "service": "Apt Bill Manager API",
        "cost_per_unit": settings.BILL_COST_PER_UNIT
    }