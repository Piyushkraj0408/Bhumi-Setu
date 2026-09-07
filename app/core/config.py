import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./land_records.db")
    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    mongodb_db_name: str = os.getenv("MONGODB_DB_NAME", "land_records")

    secret_key: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production-091823746182")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    s3_endpoint_url: str = os.getenv("S3_ENDPOINT_URL", "http://localhost:9000")
    s3_access_key: str = os.getenv("S3_ACCESS_KEY", "minioadmin")
    s3_secret_key: str = os.getenv("S3_SECRET_KEY", "minioadmin")
    s3_bucket_name: str = os.getenv("S3_BUCKET_NAME", "land-records-documents")
    s3_region: str = os.getenv("S3_REGION", "us-east-1")
    use_local_storage_fallback: bool = True
    local_storage_dir: str = "./storage"

    ocr_service_url: str = os.getenv(
    "OCR_SERVICE_URL",
    "http://127.0.0.1:8001"
    )

    ocr_timeout_seconds: float = float(
        os.getenv("OCR_TIMEOUT_SECONDS", "300")
    )

    ocr_review_threshold: float = float(
        os.getenv("OCR_REVIEW_THRESHOLD", "0.70")
    )

    ocr_accept_threshold: float = float(
        os.getenv("OCR_ACCEPT_THRESHOLD", "0.90")
    )

    allowed_origins: str = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    )

    @property
    def cors_origins(self) -> list[str]:
        origins = [o.strip() for o in self.allowed_origins.split(",") if o.strip()]
        if "*" in origins:
            raise ValueError(
                "Insecure CORS configuration: Wildcard '*' is strictly prohibited in ALLOWED_ORIGINS when allow_credentials=True."
            )
        return origins

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()



