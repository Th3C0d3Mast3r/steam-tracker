from dataclasses import dataclass
from typing import Optional

@dataclass
class Game:
    appid: int
    name: str
    url: str
    image: str
    price: Optional[float]
    original_price: Optional[float]
    discount: int
    currency: str

@dataclass
class PriceRecord:
    appid: int
    price: float
    timestamp: str

@dataclass
class TrackedGame:
    appid: int
    name: str
    url: str
    image: str
    target_price: float
    current_price: Optional[float]
    currency: str
