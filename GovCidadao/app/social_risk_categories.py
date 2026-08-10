"""Categorias de risco / redes sociais — espelho do front (page.tsx).

Garantidas no MongoDB ao subir a API quando já existirem secretarias.
Idempotente: não altera categorias já existentes; só insere ausentes pela chave
normalizada (igual ao import manual).
"""

from __future__ import annotations

import logging
import re
import unicodedata
from typing import Iterable

from app.models import Category, Secretariat

logger = logging.getLogger(__name__)

# Manter sincronizado com SOCIAL_RISK_CATEGORY_TITLES em GovCidadao/frontend/app/page.tsx
SOCIAL_RISK_CATEGORY_TITLES: tuple[str, ...] = (
    "Buracos nas ruas e falta de recapeamento.",
    "Demora em consultas médicas nos postos de saúde.",
    "Falta de médicos ou especialistas na rede pública.",
    "Falta de medicamentos nas farmácias municipais.",
    "Lixo acumulado ou coleta irregular.",
    "Mato alto em terrenos, praças e áreas públicas.",
    "Iluminação pública quebrada ou ruas escuras.",
    "Obras públicas paradas ou demoradas.",
    "Aumento de IPTU ou outras taxas municipais.",
    "Falta de vagas em creches.",
    "Problemas no transporte público (atraso, poucos horários).",
    "Estradas rurais ruins (muito comum em cidades do interior).",
    "Falta de manutenção em praças e parques.",
    "Enchentes ou drenagem ruim em dias de chuva.",
    "Demora para consertar problemas urbanos (poste, buraco, vazamento etc.).",
    "Falta de segurança ou pouca presença da guarda municipal.",
    "Nepotismo ou cargos para aliados políticos.",
    "Falta de transparência nos gastos públicos.",
    "Promessas de campanha não cumpridas.",
    "Prefeitura não responder pedidos da população (protocolos, redes sociais, ouvidoria).",
)


def normalize_text_frontend_compat(value: str) -> str:
    """Aproxima o normalizeText() do formulário TS (Unicode \\w nas palavras)."""
    s = unicodedata.normalize("NFD", value or "")
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = re.sub(r"[^\w\s]", " ", s, flags=re.UNICODE)
    s = re.sub(r"\s+", " ", s)
    return s.lower().strip()


def pick_secretariat_for_risk_category(title: str, secretariats: list[Secretariat]) -> str | None:
    """Mesma ordem das regras de pickSecretariatForRiskCategory no page.tsx."""
    if not secretariats:
        return None
    normalized_title = normalize_text_frontend_compat(title)
    keyword_targets: Iterable[tuple[str, tuple[str, ...]]] = (
        ("saude", ("saude",)),
        ("medic", ("saude",)),
        ("creche", ("educacao",)),
        ("transporte", ("transporte", "mobilidade", "transito")),
        ("seguranca", ("seguranca", "guarda")),
        ("iluminacao", ("iluminacao", "eletrica", "servicos")),
        ("buraco", ("obras", "infra", "servicos", "zeladoria")),
        ("recapeamento", ("obras", "infra", "servicos")),
        ("estradas rurais", ("obras", "infra", "agric", "rural")),
        ("lixo", ("limpeza", "servicos", "meio ambiente")),
        ("mato alto", ("zeladoria", "servicos", "meio ambiente")),
        ("pracas", ("zeladoria", "servicos", "meio ambiente")),
        ("enchentes", ("obras", "infra", "drenagem")),
        ("iptu", ("fazenda", "financas", "tribut")),
        ("nepotismo", ("administracao", "governo", "ouvidoria", "controladoria")),
        ("transparencia", ("administracao", "governo", "ouvidoria", "controladoria")),
        ("promessas", ("governo", "administracao", "ouvidoria")),
        ("prefeitura nao responder", ("ouvidoria", "administracao", "governo")),
    )
    matched_targets: tuple[str, ...] | None = None
    for kw, targets in keyword_targets:
        if kw in normalized_title:
            matched_targets = targets
            break

    def sec_blob(sec: Secretariat) -> str:
        return normalize_text_frontend_compat(f"{sec.name} {sec.sigla}")

    def first_match_sid() -> str | None:
        if not matched_targets:
            return None
        for sec in secretariats:
            blob = sec_blob(sec)
            if any(t in blob for t in matched_targets):
                return str(sec.id)
        return None

    sid = first_match_sid()
    if sid:
        return sid
    return str(secretariats[0].id)


RISK_DESCRIPTION = (
    "Categoria sensível para monitoramento de risco de denúncias em redes sociais."
)


async def ensure_social_risk_categories() -> None:
    """Insere só títulos de risco em falta. Nunca apaga nem altera existentes."""
    try:
        secretariats = await Secretariat.find_all().sort("+name").to_list()
        if not secretariats:
            return

        cats = await Category.find_all().to_list()
        existing_keys = {normalize_text_frontend_compat(c.name) for c in cats}

        for raw_title in SOCIAL_RISK_CATEGORY_TITLES:
            title = raw_title.strip()
            key = normalize_text_frontend_compat(title)
            if key in existing_keys:
                continue
            sid = pick_secretariat_for_risk_category(title, secretariats)
            if not sid:
                continue
            dup = await Category.find_one(Category.secretariat_id == sid, Category.name == title)
            if dup is not None:
                existing_keys.add(key)
                continue
            try:
                await Category(
                    name=title,
                    description=RISK_DESCRIPTION,
                    secretariat_id=sid,
                    sla_days=5,
                ).insert()
                existing_keys.add(key)
            except Exception as exc:
                logger.warning("Falha ao inserir categoria de risco %r: %s", title, exc)
    except Exception:
        logger.exception("ensure_social_risk_categories: ignorando falha para não bloquear a API")

