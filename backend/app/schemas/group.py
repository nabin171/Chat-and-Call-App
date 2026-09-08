from pydantic import BaseModel
from datetime import datetime

class GroupCreate(BaseModel):
    name: str
    member_ids: list[int]

class GroupOut(BaseModel):
    id: int
    name: str
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True

class GroupMessageOut(BaseModel):
    id: int
    group_id: int
    sender_id: int
    content: str
    created_at: datetime

    class Config:
        from_attributes = True