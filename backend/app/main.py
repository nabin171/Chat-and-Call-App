from fastapi import FastAPI


from fastapi.middleware.cors import CORSMiddleware
from app.routers import users
from app.routers import chat
from app.routers import groups
from app.routers import livekit

app = FastAPI(title="Chat & Call API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://scorecard-expediter-turban.ngrok-free.dev"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "FastAPI backend is running"}

app.include_router(chat.router)
app.include_router(groups.router)
app.include_router(users.router)
app.include_router(livekit.router)
@app.get("/health")
def health():
    return {"status": "ok"}