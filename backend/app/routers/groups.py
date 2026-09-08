from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.group import Group, GroupMember, GroupMessage
from app.models.user import User
from app.schemas.group import GroupCreate, GroupOut, GroupMessageOut
from app.core.deps import get_current_user

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("/", response_model=GroupOut)
def create_group(group: GroupCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_group = Group(name=group.name, created_by=current_user.id)
    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    all_member_ids = set(group.member_ids + [current_user.id])
    for user_id in all_member_ids:
        db.add(GroupMember(group_id=new_group.id, user_id=user_id))
    db.commit()

    return new_group


@router.get("/", response_model=list[GroupOut])
def list_my_groups(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    memberships = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()
    group_ids = [m.group_id for m in memberships]
    return db.query(Group).filter(Group.id.in_(group_ids)).all()


@router.get("/{group_id}/messages", response_model=list[GroupMessageOut])
def get_group_messages(group_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id, GroupMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    return (
        db.query(GroupMessage)
        .filter(GroupMessage.group_id == group_id)
        .order_by(GroupMessage.created_at.asc())
        .all()
    )


@router.post("/{group_id}/members/{user_id}")
def add_member(group_id: int, user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group_id, GroupMember.user_id == user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already in group")

    db.add(GroupMember(group_id=group_id, user_id=user_id))
    db.commit()
    return {"status": "added"}