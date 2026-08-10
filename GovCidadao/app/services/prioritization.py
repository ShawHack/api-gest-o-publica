from datetime import datetime, timedelta

from app.models import Occurrence, UrgencyLevel

URGENCY_BASE_SCORE = {
    UrgencyLevel.CRITICAL: 100,
    UrgencyLevel.HIGH: 70,
    UrgencyLevel.MEDIUM: 40,
    UrgencyLevel.LOW: 15,
}


async def count_recurrence(
    *,
    category_id: str | None,
    latitude: float,
    longitude: float,
    radius: float = 0.005,
    days: int = 30,
) -> int:
    if category_id is None:
        return 0
    start = datetime.utcnow() - timedelta(days=days)
    return await Occurrence.find(
        Occurrence.category_id == category_id,
        Occurrence.created_at >= start,
        Occurrence.latitude >= latitude - radius,
        Occurrence.latitude <= latitude + radius,
        Occurrence.longitude >= longitude - radius,
        Occurrence.longitude <= longitude + radius,
    ).count()


def calculate_priority_score(
    *,
    urgency: UrgencyLevel,
    recurrence_count: int,
    source_weight: int,
) -> int:
    base = URGENCY_BASE_SCORE[urgency]
    recurrence_bonus = min(recurrence_count * 10, 60)
    return base + recurrence_bonus + source_weight
