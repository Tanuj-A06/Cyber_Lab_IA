from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Format PostgreSQL URL for SQLAlchemy compatibility
db_url = settings.DATABASE_URL.strip()
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# NeonDB PostgreSQL engine with connection pooling and pre-ping check
engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_recycle=300,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """
    FastAPI dependency yielding an isolated database session per request.
    Ensures safe transaction lifecycles and connection cleanup.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
