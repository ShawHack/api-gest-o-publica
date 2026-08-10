from app.models import Category, Secretariat, User, UserRole
from app.security import get_password_hash

DEFAULT_STRUCTURE = {
    "Infraestrutura e Obras": [
        ("Pavimentacao e Vias", 5),
        ("Drenagem e Aguas Pluviais", 3),
        ("Obras Publicas", 2),
        ("Sinalizacao Viaria", 4),
    ],
    "Meio Ambiente": [
        ("Arborizacao Urbana", 5),
        ("Residuos Solidos", 2),
        ("Poluicao Ambiental", 3),
        ("Areas Verdes e Parques", 7),
    ],
    "Saude": [
        ("Vigilancia Sanitaria", 1),
        ("Controle de Vetores", 2),
        ("Saneamento Basico", 1),
        ("Postos de Saude", 3),
    ],
}


async def seed_catalog_if_empty() -> None:
    existing = await Secretariat.find_one()
    if existing is not None:
        return

    for secretariat_name, categories in DEFAULT_STRUCTURE.items():
        slug = secretariat_name.lower().replace(" ", ".")
        secretariat = Secretariat(
            name=secretariat_name,
            phone="(00) 0000-0000",
            email=f"{slug}@prefeitura.local",
            address=f"Sede da Secretaria de {secretariat_name}",
        )
        await secretariat.insert()
        for category_name, sla_days in categories:
            category = Category(
                name=category_name,
                secretariat_id=str(secretariat.id),
                sla_days=sla_days,
            )
            await category.insert()


async def seed_default_users_if_empty() -> None:
    default_secretariat = await Secretariat.find_one()
    default_secretariat_id = str(default_secretariat.id) if default_secretariat else None

    defaults = [
        {
            "name": "Administrador Geral",
            "email": "admin@gov.local",
            "role": UserRole.ADMIN,
            "secretariat_id": None,
        },
        {
            "name": "Secretario Municipal",
            "email": "secretario@gov.local",
            "role": UserRole.SECRETARY,
            "secretariat_id": default_secretariat_id,
        },
        {
            "name": "Usuario Cidadao",
            "email": "cidadao@gov.local",
            "role": UserRole.CITIZEN,
            "secretariat_id": None,
        },
    ]

    for item in defaults:
        user = await User.find_one(User.email == item["email"])
        if user is None:
            user = User(
                name=item["name"],
                email=item["email"],
                password_hash=get_password_hash("123456"),
                role=item["role"],
                secretariat_id=item["secretariat_id"],
                is_active=True,
            )
            await user.insert()
            continue

        user.name = item["name"]
        user.role = item["role"]
        user.secretariat_id = item["secretariat_id"]
        user.is_active = True
        # Garante credenciais padrao de demo mesmo apos mudancas de algoritmo de hash.
        user.password_hash = get_password_hash("123456")
        await user.save()
