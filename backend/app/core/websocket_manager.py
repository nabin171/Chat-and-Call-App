from fastapi import WebSocket
from typing import Dict

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        self.active_connections.pop(user_id, None)

    async def send_personal_message(self, message: dict, user_id: int):
        connection = self.active_connections.get(user_id)
        if connection:
            await connection.send_json(message)

    async def send_to_group(self, message: dict, user_ids: list[int], exclude_user_id: int = None):
        for user_id in user_ids:
            if user_id == exclude_user_id:
                continue
            connection = self.active_connections.get(user_id)
            if connection:
                await connection.send_json(message)

manager = ConnectionManager()