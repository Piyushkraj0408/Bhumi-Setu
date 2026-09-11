# Updated land-record extraction.py

This replacement consumes the Mistral OCR JSON structure already produced by the backend.

It supports both:
- canonical pages: `payload["pages"]`
- raw Mistral pages: `payload["raw_ocr"]["pages"]`

It extracts structured land-record fields from text blocks and Mistral markdown tables while preserving page, bounding-box and OCR-confidence evidence.

Validated against `land_record2.pdf` Mistral output.

Expected fields for that sample:
- owner_name = अजय सिंह
- relative_name = गोला सिंह
- relation = पिता/पति
- village = आशोपुर
- police_station = दानापुर
- district = पटना
- thana_number = 34
- khata_number = 19
- khasra_number = 156
- area.value = 5.75
- area.unit = डि०

## Integration

Replace your backend's existing `extraction.py` with this file. The public function remains:

```python
from extraction import extract_fields
fields = extract_fields(payload["pages"])
```

If your pipeline subsequently overwrites `ocr_confidence` or `evidence`, preserve the values returned by `extract_fields`; otherwise the evidence from the Mistral blocks will be lost.
