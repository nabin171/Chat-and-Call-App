from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from app.db.database import get_db
from app.core.config import settings
from app.core.websocket_manager import manager
from app.models.message import Message
from app.models.user import User
from sqlalchemy import or_, and_
from app.core.deps import get_current_user
from app.schemas.message import MessageOut

router = APIRouter()

@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id = int(payload.get("sub"))
    except JWTError:
        await websocket.close(code=1008)
        return

    await manager.connect(user_id, websocket)

    try:
        while True:
            data = await websocket.receive_json()
            receiver_id = data["receiver_id"]
            content = data["content"]

            new_message = Message(sender_id=user_id, receiver_id=receiver_id, content=content)
            db.add(new_message)
            db.commit()
            db.refresh(new_message)

            payload_out = {
                "sender_id": user_id,
                "receiver_id": receiver_id,
                "content": content,
                "created_at": new_message.created_at.isoformat(),
            }

            await manager.send_personal_message(payload_out, receiver_id)
            await manager.send_personal_message(payload_out, user_id)

    except WebSocketDisconnect:
        manager.disconnect(user_id)

@router.get("/messages/{other_user_id}", response_model=list[MessageOut])
def get_conversation(
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    messages = (
        db.query(Message)
        .filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == other_user_id),
                and_(Message.sender_id == other_user_id, Message.receiver_id == current_user.id),
            )
        )
        .order_by(Message.created_at.asc())
        .all()
    )
    return messages