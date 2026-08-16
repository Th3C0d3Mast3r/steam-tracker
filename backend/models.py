from typing import Optional
from pydantic import BaseModel

class Game(BaseModel):
    appid: int
    name: str
    url: str
    image: str
    price: Optional[float] = None
    original_price: Optional[float] = None
    discount: int = 0
    currency: str = "INR"
    release_date: Optional[str] = None
    review_summary: Optional[str] = None

class PriceRecord(BaseModel):
    appid: int
    price: Optional[float] = None
    original_price: Optional[float] = None
    discount: int = 0
    timestamp: str

class TrackedGame(BaseModel):
    appid: int
    name: str
    url: str
    image: str
    target_price: float
    current_price: Optional[float] = None
    original_price: Optional[float] = None
    discount: int = 0
    currency: str = "INR"
    release_date: Optional[str] = None
    review_summary: Optional[str] = None

