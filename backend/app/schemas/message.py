from pydantic import BaseModel
from datetime import datetime

class MessageOut(BaseModel):
    sender_id: int
    receiver_id: int
    content: str
    created_at: datetime

    class Config:
        from_attributes = True