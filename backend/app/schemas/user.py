from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    username: str

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)
