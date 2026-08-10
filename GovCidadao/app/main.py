from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db import close_db, init_db
from app.services.audit_service import close_audit_db, init_audit_db, record_security, audit_fire
from app.routers.auth import router as auth_router
from app.routers.catalog import router as catalog_router
from app.routers.occurrences import router as occurrences_router
from app.routers.notifications import router as notifications_router
from app.routers.users import router as users_router
from app.routers.lgpd import router as lgpd_router
from app.seed import seed_catalog_if_empty, seed_default_users_if_empty
from app.social_risk_categories import ensure_social_risk_categories


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    await init_audit_db()
    await seed_catalog_if_empty()
    await seed_default_users_if_empty()
    await ensure_social_risk_categories()
    yield
    await close_audit_db()
    await close_db()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API inicial do GovCidadao para gestão integrada de ocorrências municipais.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3010",
        "http://127.0.0.1:3010",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(catalog_router)
app.include_router(occurrences_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(notifications_router)
app.include_router(lgpd_router)

_SKIP_SECURITY_AUDIT = frozenset({"/auth/login", "/auth/register", "/lgpd/me/delete"})


@app.exception_handler(HTTPException)
async def audit_http_exception_handler(request: Request, exc: HTTPException):
    path = request.url.path.rstrip("/") or "/"
    if exc.status_code in (401, 403) and path not in _SKIP_SECURITY_AUDIT:
        action = "gov.auth.invalid_token" if exc.status_code == 401 else "gov.authz.denied"
        audit_fire(
            record_security(
                request,
                action=action,
                resource_type="session",
                metadata={"detail": str(exc.detail), "statusCode": exc.status_code},
            )
        )
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok", "service": settings.app_name}
