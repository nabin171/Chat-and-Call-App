import aio_pika
import json
from app.core.config import settings

async def publish_event(event_type: str, payload: dict):
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    async with connection:
        channel = await connection.channel()
        queue_name = "chat_events"
        await channel.declare_queue(queue_name, durable=True)

        message_body = json.dumps({"type": event_type, "payload": payload})
        await channel.default_exchange.publish(
            aio_pika.Message(body=message_body.encode()),
            routing_key=queue_name,
        )