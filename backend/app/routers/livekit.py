from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from livekit import api
from app.db.database import get_db
from app.core.config import settings
from app.core.deps import get_current_user
from app.models.user import User
from app.models.group import GroupMember

router = APIRouter(prefix="/livekit", tags=["livekit"])


@router.get("/token/{group_id}")
def get_group_call_token(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id, GroupMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    room_name = f"group-{group_id}"

    token = api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret) \
        .with_identity(str(current_user.id)) \
        .with_name(current_user.username) \
        .with_grants(api.VideoGrants(
            room_join=True,
            room=room_name,
        ))

    return {
        "token": token.to_jwt(),
        "url": settings.livekit_url,
        "room": room_name,
    } 