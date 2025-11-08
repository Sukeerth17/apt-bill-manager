import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from ..app.config import settings

# Create the engine instance using the URL from config
engine = create_engine(
    settings.DATABASE_URL, 
    pool_pre_ping=True
)

# Create a session class for database interactions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for your database models
Base = declarative_base()

# Dependency to get a database session for each request
def get_db():
    """Provides a database session that is closed after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()