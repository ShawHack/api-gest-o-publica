from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models import (
    Category,
    CitizenNotification,
    Occurrence,
    OccurrenceHistory,
    ProtectiveMeasure,
    Secretariat,
    User,
)

client: AsyncIOMotorClient | None = None


async def init_db() -> None:
    global client
    client = AsyncIOMotorClient(settings.mongo_uri)
    await init_beanie(
        database=client[settings.mongo_db],
        document_models=[
            Secretariat,
            Category,
            Occurrence,
            OccurrenceHistory,
            CitizenNotification,
            ProtectiveMeasure,
            User,
        ],
    )


async def close_db() -> None:
    global client
    if client:
        client.close()
        client = None
