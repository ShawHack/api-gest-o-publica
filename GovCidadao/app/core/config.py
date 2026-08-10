from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "GovCidadao API"
    app_version: str = "1.0.0"
    mongo_uri: str = "mongodb://localhost:27017"
    external_mongo_uri: str | None = None
    mongo_db: str = "govcidadao"
    default_sla_days: int = 5
    jwt_secret: str = "govcidadao-dev-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 720
    external_user_db: str = "apicemiterio"
    external_user_collection: str = "users"
    audit_db: str = "apicemiterio"
    audit_collection: str = "auditlogs"
    audit_tenant: str = "prefeitura-garca"

    @field_validator("external_mongo_uri", mode="before")
    @classmethod
    def _empty_external_uri_none(cls, v: object) -> str | None:
        if v is None:
            return None
        if isinstance(v, str) and not v.strip():
            return None
        return v


settings = Settings()
