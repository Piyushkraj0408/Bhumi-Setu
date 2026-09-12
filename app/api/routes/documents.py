import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pymongo.database import Database

from app.core.database import get_db
from app.core.permissions import require_permission
from app.core.scope import build_scoped_id_query, merge_scope_filter
from app.api.deps import get_current_user
from app.models.mongo_models import MongoUser, DocumentStatus
from app.schemas.document import (
    DocumentOut,
    DocumentVersionOut,
    ProcessingJobOut,
    DocumentUploadResponse,
)
from app.services import document_service, storage_service

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post(
    "",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("UPLOAD_DOCUMENT"))],
)
def upload_document(
    file: UploadFile = File(...),
    doc_type: str | None = Form(None),
    scope_type: str | None = Form(None),
    scope_id: str | None = Form(None),
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    document_doc, job_doc = document_service.upload_document(
        db,
        file=file,
        uploader_id=current_user.id,
        doc_type=doc_type,
        scope_type=scope_type,
        scope_id=scope_id,
    )
    return DocumentUploadResponse(
        document=DocumentOut(
            id=uuid.UUID(document_doc["id"]),
            original_filename=document_doc["original_filename"],
            mime_type=document_doc["mime_type"],
            doc_type=document_doc.get("doc_type"),
            status=document_doc["status"],
            scope_type=document_doc.get("scope_type"),
            scope_id=document_doc.get("scope_id"),
            created_at=document_doc["created_at"],
            uploaded_at=document_doc.get("uploaded_at") or document_doc["created_at"],
        ),
        job=ProcessingJobOut(
            id=uuid.UUID(job_doc["id"]),
            document_id=uuid.UUID(job_doc["document_id"]),
            status=job_doc["status"],
            error=job_doc.get("error"),
            created_at=job_doc["created_at"],
            updated_at=job_doc["updated_at"],
        ),
    )


@router.get(
    "",
    response_model=list[DocumentOut],
    dependencies=[Depends(require_permission("VIEW_RECORD"))],
)
def list_documents(
    status_filter: str | None = None,
    scope_id: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    base_query: dict = {"status": {"$ne": DocumentStatus.deleted.value}}
    if status_filter:
        base_query["status"] = status_filter
    if scope_id:
        base_query["scope_id"] = scope_id

    # Enforce data scoping at query layer
    scoped_query = merge_scope_filter(base_query, current_user)

    docs = list(db.documents.find(scoped_query).skip(skip).limit(limit))
    return [
        DocumentOut(
            id=uuid.UUID(str(d.get("_id", d.get("id")))),
            original_filename=d["original_filename"],
            mime_type=d["mime_type"],
            doc_type=d.get("doc_type"),
            status=d["status"],
            scope_type=d.get("scope_type"),
            scope_id=d.get("scope_id"),
            created_at=d["created_at"],
            uploaded_at=d.get("uploaded_at") or d.get("created_at"),
        )
        for d in docs
    ]


@router.get(
    "/{document_id}",
    response_model=DocumentOut,
    dependencies=[Depends(require_permission("VIEW_RECORD"))],
)
def get_document(
    document_id: uuid.UUID,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    doc_id_str = str(document_id)
    # Anti-IDOR: Scoped query ensures record exists AND is within user jurisdiction
    scoped_query = build_scoped_id_query(
        doc_id_str, current_user, {"status": {"$ne": DocumentStatus.deleted.value}}
    )
    d = db.documents.find_one(scoped_query)
    if not d:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )
    return DocumentOut(
        id=uuid.UUID(str(d.get("_id", d.get("id")))),
        original_filename=d["original_filename"],
        mime_type=d["mime_type"],
        doc_type=d.get("doc_type"),
        status=d["status"],
        scope_type=d.get("scope_type"),
        scope_id=d.get("scope_id"),
        created_at=d["created_at"],
        uploaded_at=d.get("uploaded_at") or d.get("created_at"),
    )


@router.get(
    "/{document_id}/ocr",
    dependencies=[Depends(require_permission("VIEW_RECORD"))],
)
def get_document_ocr(
    document_id: uuid.UUID,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    doc_id_str = str(document_id)
    scoped_query = build_scoped_id_query(doc_id_str, current_user)
    doc = db.documents.find_one(scoped_query)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")

    return {
        "document_id": doc_id_str,
        "status": doc.get("status"),
        "ocr": doc.get("ocr") or {},
        "metadata": doc.get("metadata") or {},
    }


@router.get(
    "/{document_id}/versions",
    response_model=list[DocumentVersionOut],
    dependencies=[Depends(require_permission("VIEW_RECORD"))],
)
def list_versions(
    document_id: uuid.UUID,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    doc_id_str = str(document_id)
    scoped_query = build_scoped_id_query(doc_id_str, current_user)
    doc = db.documents.find_one(scoped_query)
    if not doc:
        return []
    versions = doc.get("versions", [])
    return [
        DocumentVersionOut(
            id=uuid.UUID(str(v["id"])),
            version_type=v["version_type"],
            created_at=v["created_at"],
        )
        for v in versions
    ]


@router.get(
    "/{document_id}/download",
    dependencies=[Depends(require_permission("VIEW_RECORD"))],
)
def download_document(
    document_id: uuid.UUID,
    version_type: str | None = None,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    doc_id_str = str(document_id)
    scoped_query = build_scoped_id_query(
        doc_id_str, current_user, {"status": {"$ne": DocumentStatus.deleted.value}}
    )
    document = db.documents.find_one(scoped_query)
    if not document:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")

    storage_key = document.get("storage_key")
    if version_type:
        versions = document.get("versions", [])
        matched = [v for v in versions if v.get("version_type") == version_type]
        if not matched:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Version not found")
        storage_key = matched[-1].get("storage_key")

    url = storage_service.get_presigned_download_url(storage_key)
    return {"download_url": url, "expires_in_seconds": 900}


@router.get(
    "/{document_id}/jobs/{job_id}/status",
    response_model=ProcessingJobOut,
    dependencies=[Depends(require_permission("VIEW_RECORD"))],
)
def get_job_status(
    document_id: uuid.UUID,
    job_id: uuid.UUID,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    doc_id_str = str(document_id)
    job_id_str = str(job_id)
    scoped_query = build_scoped_id_query(doc_id_str, current_user)
    doc = db.documents.find_one(scoped_query)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")

    job = db.processing_jobs.find_one({"id": job_id_str, "document_id": doc_id_str})
    if not job:
        for j in doc.get("jobs", []):
            if j.get("id") == job_id_str:
                job = j
                break
    if not job:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")

    return ProcessingJobOut(
        id=uuid.UUID(str(job["id"])),
        document_id=uuid.UUID(str(job["document_id"])),
        status=job["status"],
        error=job.get("error"),
        created_at=job["created_at"],
        updated_at=job.get("updated_at", job["created_at"]),
    )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("EDIT_RECORD"))],
)
def delete_document(
    document_id: uuid.UUID,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    doc_id_str = str(document_id)
    scoped_query = build_scoped_id_query(doc_id_str, current_user)
    doc = db.documents.find_one(scoped_query)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    
    document_service.soft_delete_document(db, doc_id_str)

    # Record Audit Log
    now = datetime.now(timezone.utc)
    db.audit_logs.insert_one({
        "event_id": f"EVT-DEL-{uuid.uuid4()}",
        "user_id": str(current_user.id),
        "user_email": current_user.email,
        "role": current_user.role,
        "action": "EDIT_RECORD",
        "sub_action": "DELETE_DOCUMENT",
        "record_id": doc_id_str,
        "document_id": doc_id_str,
        "timestamp": now,
    })

