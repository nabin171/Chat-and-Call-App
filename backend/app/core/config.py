from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://user:password@localhost:5432/chatapp"
    secret_key: str = "changeme"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    redis_url: str = "redis://localhost:6379"
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"
    livekit_url: str = ""
    livekit_api_key: str = ""
    livekit_api_secret: str = ""
    frontend_url: str = "http://localhost:3000"

    # Brevo SMTP relay. Leave smtp_user/smtp_password empty to fall back
    # to printing reset links in the server log instead of emailing them.
    smtp_host: str = "smtp-relay.brevo.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    mail_from: str = ""
    mail_from_name: str = "Chat & Call"

    class Config:
        env_file = ".env"

settings = Settings()