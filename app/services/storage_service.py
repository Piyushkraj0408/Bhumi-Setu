import os
import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings
from app.services import validation_service
_s3_client = None


def get_s3_client():
    global _s3_client
    if _s3_client is None:
        try:
            _s3_client = boto3.client(
                "s3",
                endpoint_url=settings.s3_endpoint_url,
                aws_access_key_id=settings.s3_access_key,
                aws_secret_access_key=settings.s3_secret_key,
                region_name=settings.s3_region,
            )
        except Exception:
            _s3_client = None
    return _s3_client


def upload_bytes(key: str, data: bytes, content_type: str) -> None:
    client = get_s3_client()
    if client and not settings.use_local_storage_fallback:
        try:
            client.put_object(
                Bucket=settings.s3_bucket_name,
                Key=key,
                Body=data,
                ContentType=content_type,
            )
            return
        except (BotoCoreError, ClientError):
            pass

    # Local storage fallback
    local_path = os.path.join(settings.local_storage_dir, key)
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    with open(local_path, "wb") as f:
        f.write(data)


def get_presigned_download_url(key: str, expires_in: int = 900) -> str:
    client = get_s3_client()
    if client and not settings.use_local_storage_fallback:
        try:
            return client.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.s3_bucket_name, "Key": key},
                ExpiresIn=expires_in,
            )
        except (BotoCoreError, ClientError):
            pass

    # Local storage fallback returns local path / static endpoint
    local_path = os.path.abspath(os.path.join(settings.local_storage_dir, key))
    return f"file:///{local_path.replace(os.sep, '/')}"


def get_bytes(key: str) -> bytes:
    """
    Retrieve a stored file as bytes.

    Uses S3/MinIO when configured.
    Falls back to local storage when S3 is unavailable.
    """

    client = get_s3_client()

    # --------------------------------------------------------
    # S3 / MinIO
    # --------------------------------------------------------

    if client and not settings.use_local_storage_fallback:
        try:
            response = client.get_object(
                Bucket=settings.s3_bucket_name,
                Key=key,
            )

            return response["Body"].read()

        except (BotoCoreError, ClientError):
            pass

    # --------------------------------------------------------
    # Local storage fallback
    # --------------------------------------------------------

    local_path = os.path.join(
        settings.local_storage_dir,
        key,
    )

    if not os.path.exists(local_path):
        raise FileNotFoundError(
            f"Stored file not found: {key}"
        )

    with open(local_path, "rb") as f:
        return f.read()
