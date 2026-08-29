import asyncio
import json
import aio_pika
from app.core.config import settings

async def handle_event(message: aio_pika.IncomingMessage):
    async with message.process():
        data = json.loads(message.body.decode())
        event_type = data["type"]
        payload = data["payload"]

        if event_type == "message_sent":
            print(f"[EVENT] New message from user {payload['sender_id']} to user {payload['receiver_id']}: {payload['content']}")
            # This is where you'd trigger a push notification later (Phase 13)

async def main():
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    async with connection:
        channel = await connection.channel()
        queue = await channel.declare_queue("chat_events", durable=True)
        print("Worker started, waiting for events...")
        await queue.consume(handle_event)
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())