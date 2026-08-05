from pydantic_settings import BaseSettings
class Settings(BaseSettings):
    database_url:str="postgresqdl://user:password@localhost:5432/chatpp"
    secret_key:str="changeme"

    