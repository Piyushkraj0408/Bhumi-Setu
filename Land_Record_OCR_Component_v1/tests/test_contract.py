from land_ocr.models import OCRDocumentResult
def test_contract():
    r=OCRDocumentResult(document={"document_id":"x","filename":"x.png","pages":0,"language":[]},processing={"status":"completed"},pages=[])
    assert r.schema_version=="1.0"
