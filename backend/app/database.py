from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import tempfile

# Database URL - SQLite for MVP, designed to migrate to PostgreSQL
# Use temp directory to avoid Windows filesystem issues in WSL
temp_dir = tempfile.gettempdir()
db_path = os.path.join(temp_dir, "satellite_analysis.db")
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    f"sqlite:///{db_path}"
)

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
