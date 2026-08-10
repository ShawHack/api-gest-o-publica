"""E-mails institucionais ao cidadão (SMTP opcional via variáveis de ambiente)."""
from __future__ import annotations

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.models import Occurrence, OccurrenceStatus
from app.services.citizen_status import (
    citizen_label_for_status,
    citizen_message_for_status,
    format_protocol,
)

logger = logging.getLogger(__name__)

GARCA_BASE_URL = os.getenv("GARCA_CIDADAO_PUBLIC_URL", "https://api.garca.sp.gov.br/garca-cidadao").rstrip(
    "/"
)
SMTP_HOST = os.getenv("GOV_SMTP_HOST", os.getenv("SMTP_HOST", "")).strip()
SMTP_PORT = int(os.getenv("GOV_SMTP_PORT", os.getenv("SMTP_PORT", "587")))
SMTP_USER = os.getenv("GOV_SMTP_USER", os.getenv("SMTP_USER", "")).strip()
SMTP_PASS = os.getenv("GOV_SMTP_PASS", os.getenv("SMTP_PASS", "")).strip()
SMTP_FROM = os.getenv(
    "GOV_SMTP_FROM",
    os.getenv("SMTP_FROM", "Prefeitura de Garça <noreply@garca.sp.gov.br>"),
).strip()
SMTP_ENABLED = os.getenv("GOV_SMTP_ENABLED", "true").lower() in ("1", "true", "yes")


def _tracking_link(occurrence: Occurrence) -> str:
    return f"{GARCA_BASE_URL}?tab=minhas&occurrence={occurrence.id}"


def _html_wrap(title: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>{title}</title></head>
<body style="font-family:Segoe UI,Arial,sans-serif;background:#f4f6f8;margin:0;padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <tr><td style="background:linear-gradient(135deg,#0d47a1,#1565c0);padding:28px 24px;color:#fff;">
      <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.9;">Prefeitura Municipal de Garça</div>
      <div style="font-size:22px;font-weight:700;margin-top:8px;">Garça Cidadão · Boca no Trombone</div>
    </td></tr>
    <tr><td style="padding:28px 24px;color:#1a1a1a;line-height:1.6;">{body_html}</td></tr>
    <tr><td style="padding:16px 24px 24px;font-size:12px;color:#666;border-top:1px solid #eee;">
      A Prefeitura de Garça leva sua manifestação a sério e manterá você informado sobre todas as atualizações.
    </td></tr>
  </table>
</body></html>"""


def _send_raw(to: str, subject: str, html: str) -> bool:
    if not SMTP_ENABLED or not SMTP_HOST or not to:
        logger.info("citizen_email skipped (smtp disabled or no recipient): %s", subject)
        return False
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to
    msg.attach(MIMEText(html, "html", "utf-8"))
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as server:
            server.starttls()
            if SMTP_USER and SMTP_PASS:
                server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, [to], msg.as_string())
        return True
    except Exception:
        logger.exception("citizen_email failed: %s -> %s", subject, to)
        return False


async def notify_occurrence_created(
    occurrence: Occurrence,
    *,
    secretariat_name: str,
    category_name: str,
) -> None:
    to = (occurrence.reporter_contact or "").strip()
    if not to or "@" not in to:
        return
    protocol = format_protocol(occurrence.external_id)
    created = occurrence.created_at.strftime("%d/%m/%Y %H:%M")
    link = _tracking_link(occurrence)
    body = f"""
      <p style="font-size:16px;"><strong>✅ Sua reclamação foi registrada com sucesso.</strong></p>
      <p>A Prefeitura de Garça leva sua manifestação a sério e sua solicitação já foi encaminhada ao setor responsável.</p>
      <table style="width:100%;margin:20px 0;font-size:14px;">
        <tr><td style="color:#666;padding:4px 0;">Protocolo</td><td><strong>{protocol}</strong></td></tr>
        <tr><td style="color:#666;padding:4px 0;">Data</td><td>{created}</td></tr>
        <tr><td style="color:#666;padding:4px 0;">Categoria</td><td>{category_name or "—"}</td></tr>
        <tr><td style="color:#666;padding:4px 0;">Secretaria</td><td>{secretariat_name or "—"}</td></tr>
        <tr><td style="color:#666;padding:4px 0;">Status</td><td>Ativa</td></tr>
      </table>
      <p><a href="{link}" style="display:inline-block;background:#1565c0;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Acompanhar solicitação</a></p>
    """
    html = _html_wrap("Reclamação registrada", body)
    _send_raw(to, f"[Garça Cidadão] Reclamação registrada {protocol}", html)


async def notify_status_change(
    occurrence: Occurrence,
    new_status: OccurrenceStatus,
    *,
    is_reopen: bool = False,
) -> None:
    to = (occurrence.reporter_contact or "").strip()
    if not to or "@" not in to:
        return
    protocol = format_protocol(occurrence.external_id)
    label = citizen_label_for_status(new_status)
    msg = citizen_message_for_status(new_status).replace("\n", "<br>")
    link = _tracking_link(occurrence)
    extra = "<p><em>Sua solicitação foi reaberta para novo atendimento.</em></p>" if is_reopen else ""
    subject_action = "Reaberta" if is_reopen else label
    body = f"""
      <p style="font-size:16px;"><strong>Atualização na sua solicitação {protocol}</strong></p>
      {extra}
      <p><strong>Status:</strong> {label}</p>
      <p>{msg}</p>
      <p><a href="{link}" style="display:inline-block;background:#1565c0;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Ver detalhes</a></p>
    """
    html = _html_wrap(f"Atualização — {subject_action}", body)
    _send_raw(to, f"[Garça Cidadão] {protocol} — {subject_action}", html)
