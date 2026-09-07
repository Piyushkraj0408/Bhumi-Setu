import uuid
from datetime import datetime

from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: uuid.UUID
    original_filename: str
    mime_type: str
    doc_type: str | None
    status: str
    scope_type: str | None
    scope_id: str | None
    created_at: datetime
    uploaded_at: datetime | None = None

    class Config:
        from_attributes = True


class DocumentVersionOut(BaseModel):
    id: uuid.UUID
    version_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class ProcessingJobOut(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    status: str
    error: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentUploadResponse(BaseModel):
    document: DocumentOut
    job: ProcessingJobOut
