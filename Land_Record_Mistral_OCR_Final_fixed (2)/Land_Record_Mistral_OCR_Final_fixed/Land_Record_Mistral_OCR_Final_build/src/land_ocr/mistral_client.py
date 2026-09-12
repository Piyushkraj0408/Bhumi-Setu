import requests
from pathlib import Path
from typing import Any

BASE_URL = "https://api.mistral.ai/v1"

class MistralOCRError(RuntimeError):
    pass

class MistralOCRClient:
    def __init__(self, api_key: str, model: str = "mistral-ocr-latest", timeout: int = 180):
        if not api_key:
            raise ValueError("MISTRAL_API_KEY is not set. Put it in .env")
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.headers = {"Authorization": f"Bearer {api_key}"}

    def _raise_for_api_error(self, response: requests.Response):
        if response.ok:
            return
        try:
            detail = response.json()
        except Exception:
            detail = response.text
        raise MistralOCRError(f"Mistral API error {response.status_code}: {detail}")

    def upload_file(self, path: Path) -> dict[str, Any]:
        with path.open("rb") as f:
            files = {"file": (path.name, f, "application/octet-stream")}
            data = {"purpose": "ocr", "visibility": "user"}
            r = requests.post(f"{BASE_URL}/files", headers=self.headers, files=files, data=data, timeout=self.timeout)
        self._raise_for_api_error(r)
        return r.json()

    def get_signed_url(self, file_id: str) -> str:
        r = requests.get(f"{BASE_URL}/files/{file_id}/url", headers=self.headers, params={"expiry": 24}, timeout=self.timeout)
        self._raise_for_api_error(r)
        return r.json()["url"]

    def process_document(self, document_url: str, *, include_blocks=True, confidence_granularity="block",
                         table_format="markdown", extract_header=False, extract_footer=False) -> dict[str, Any]:
        payload = {
            "model": self.model,
            "document": {"type": "document_url", "document_url": document_url},
            "include_blocks": include_blocks,
            "confidence_scores_granularity": confidence_granularity,
            "extract_header": extract_header,
            "extract_footer": extract_footer,
        }
        if table_format:
            payload["table_format"] = table_format
        r = requests.post(f"{BASE_URL}/ocr", headers={**self.headers, "Content-Type": "application/json"},
                          json=payload, timeout=self.timeout)
        self._raise_for_api_error(r)
        return r.json()

    def ocr_file(self, path: Path, **kwargs) -> tuple[dict[str, Any], dict[str, Any]]:
        upload = self.upload_file(path)
        signed_url = self.get_signed_url(upload["id"])
        response = self.process_document(signed_url, **kwargs)
        return response, upload
