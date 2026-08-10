from datetime import datetime, timedelta

from app.models import (
    Occurrence,
    OccurrenceStatus,
    ProtectiveLevel,
    ProtectiveMeasure,
    UrgencyLevel,
)


def _create_measure(
    *,
    occurrence_id: str | None,
    level: ProtectiveLevel,
    trigger: str,
    action: str,
    notified_roles: str,
) -> ProtectiveMeasure:
    return ProtectiveMeasure(
        occurrence_id=occurrence_id,
        level=level,
        trigger=trigger,
        action=action,
        notified_roles=notified_roles,
    )


async def evaluate_protective_measures(occurrence: Occurrence) -> None:
    now = datetime.utcnow()
    measures: list[ProtectiveMeasure] = []

    if occurrence.assigned_team is None and (now - occurrence.created_at) > timedelta(hours=24):
        measures.append(
            _create_measure(
                occurrence_id=str(occurrence.id),
                level=ProtectiveLevel.HIGH,
                trigger="Escalonamento automático por 24h sem responsável",
                action="Escalonar para nível hierárquico superior",
                notified_roles="secretario,coordenador",
            )
        )

    if occurrence.due_at and occurrence.status != OccurrenceStatus.RESOLVED and occurrence.due_at < now:
        measures.append(
            _create_measure(
                occurrence_id=str(occurrence.id),
                level=ProtectiveLevel.HIGH,
                trigger="SLA vencido",
                action="Marcar prioridade máxima e incluir no relatório diário",
                notified_roles="secretario,coordenador",
            )
        )

    if occurrence.category_id is not None:
        recurrence_count = await Occurrence.find(
            Occurrence.category_id == occurrence.category_id,
            Occurrence.created_at >= now - timedelta(days=30),
            Occurrence.latitude >= occurrence.latitude - 0.01,
            Occurrence.latitude <= occurrence.latitude + 0.01,
            Occurrence.longitude >= occurrence.longitude - 0.01,
            Occurrence.longitude <= occurrence.longitude + 0.01,
        ).count()
        if recurrence_count >= 3:
            measures.append(
                _create_measure(
                    occurrence_id=str(occurrence.id),
                    level=ProtectiveLevel.MEDIUM,
                    trigger="Reincidência: 3+ ocorrências em 30 dias",
                    action="Criar vistoria técnica preventiva",
                    notified_roles="coordenador,tecnico",
                )
            )

    critical_cluster_count = await Occurrence.find(
        Occurrence.urgency == UrgencyLevel.CRITICAL,
        Occurrence.created_at >= now - timedelta(hours=1),
        Occurrence.latitude >= occurrence.latitude - 0.02,
        Occurrence.latitude <= occurrence.latitude + 0.02,
        Occurrence.longitude >= occurrence.longitude - 0.02,
        Occurrence.longitude <= occurrence.longitude + 0.02,
    ).count()
    if critical_cluster_count >= 5:
        measures.append(
            _create_measure(
                occurrence_id=str(occurrence.id),
                level=ProtectiveLevel.CRITICAL,
                trigger="Cluster de emergência: 5+ críticas em 1h",
                action="Acionar protocolo de emergência municipal",
                notified_roles="prefeito,secretario,defesa_civil",
            )
        )

    if measures:
        await ProtectiveMeasure.insert_many(measures)
