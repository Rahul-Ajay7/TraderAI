import os
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///trading.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()


class Portfolio(Base):
    __tablename__ = "portfolio"
    id = Column(Integer, primary_key=True)
    cash_balance = Column(Float, default=10000.0)
    total_value = Column(Float, default=10000.0)
    peak_value = Column(Float, default=10000.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Holding(Base):
    __tablename__ = "holdings"
    id = Column(Integer, primary_key=True)
    symbol = Column(String, unique=True, index=True)
    quantity = Column(Float, default=0)
    avg_buy_price = Column(Float, default=0)
    current_price = Column(Float, default=0)
    trailing_stop = Column(Float, default=0)


class Trade(Base):
    __tablename__ = "trades"
    id = Column(Integer, primary_key=True)
    symbol = Column(String, index=True)
    action = Column(String)
    quantity = Column(Float)
    price = Column(Float)
    reason = Column(Text)
    strategy = Column(String)
    confidence = Column(Float, default=0.5)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AILog(Base):
    __tablename__ = "ai_log"
    id = Column(Integer, primary_key=True)
    symbol = Column(String)
    prompt = Column(Text, default="")
    response = Column(Text, default="")
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class PriceHistory(Base):
    __tablename__ = "price_history"
    id = Column(Integer, primary_key=True)
    symbol = Column(String, index=True)
    price = Column(Float)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(Portfolio).first():
            capital = float(os.getenv("VIRTUAL_CAPITAL", 10000))
            db.add(Portfolio(cash_balance=capital, total_value=capital, peak_value=capital))
            db.commit()
            print(f"[DB] Portfolio initialized with ₹{capital}")
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
