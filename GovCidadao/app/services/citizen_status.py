"""Mensagens amigáveis e notificações para o cidadão (Boca no Trombone)."""
from __future__ import annotations

from app.models import OccurrenceStatus

CITIZEN_STATUS_MESSAGES: dict[OccurrenceStatus, str] = {
    OccurrenceStatus.OPEN: (
        "📨 Sua solicitação foi recebida com sucesso.\n\n"
        "A Prefeitura de Garça já encaminhou sua manifestação para análise do setor responsável.\n\n"
        "Em breve teremos novas atualizações."
    ),
    OccurrenceStatus.IN_PROGRESS: (
        "🚧 Seu atendimento está em andamento.\n\n"
        "Nossa equipe já está trabalhando para resolver a situação informada.\n\n"
        "A Prefeitura de Garça agradece sua colaboração."
    ),
    OccurrenceStatus.RESOLVED: (
        "✅ O problema informado foi resolvido.\n\n"
        "Obrigado por colaborar com a melhoria da nossa cidade.\n\n"
        "A Prefeitura de Garça leva sua participação a sério e conta com você para continuar "
        "identificando situações que precisam de atenção."
    ),
    OccurrenceStatus.CANCELED: (
        "Sua solicitação foi cancelada. Em caso de dúvida, entre em contato com a Prefeitura de Garça."
    ),
}

CITIZEN_STATUS_LABELS: dict[OccurrenceStatus, str] = {
    OccurrenceStatus.OPEN: "Ativa",
    OccurrenceStatus.IN_PROGRESS: "Em Execução",
    OccurrenceStatus.RESOLVED: "Encerrada",
    OccurrenceStatus.CANCELED: "Cancelada",
}

PUSH_STATUS_TITLES: dict[OccurrenceStatus, str] = {
    OccurrenceStatus.OPEN: "📨 Reclamação recebida",
    OccurrenceStatus.IN_PROGRESS: "🚧 Solicitação em atendimento",
    OccurrenceStatus.RESOLVED: "✅ Solicitação concluída",
    OccurrenceStatus.CANCELED: "Atualização na sua solicitação",
}

PUSH_STATUS_BODIES: dict[OccurrenceStatus, str] = {
    OccurrenceStatus.OPEN: (
        "Sua reclamação foi recebida e encaminhada ao setor responsável."
    ),
    OccurrenceStatus.IN_PROGRESS: "Sua solicitação está em atendimento.",
    OccurrenceStatus.RESOLVED: "Sua solicitação foi concluída. Obrigado por ajudar a melhorar Garça.",
    OccurrenceStatus.CANCELED: "Houve uma atualização no status da sua solicitação.",
}


def citizen_message_for_status(status: OccurrenceStatus) -> str:
    return CITIZEN_STATUS_MESSAGES.get(
        status,
        "A Prefeitura de Garça mantém você informado sobre sua solicitação.",
    )


def citizen_label_for_status(status: OccurrenceStatus) -> str:
    return CITIZEN_STATUS_LABELS.get(status, status.value)


def format_protocol(external_id: str) -> str:
    short = (external_id or "").replace("-", "").upper()[:8]
    return f"#{short}" if short else "#—"
