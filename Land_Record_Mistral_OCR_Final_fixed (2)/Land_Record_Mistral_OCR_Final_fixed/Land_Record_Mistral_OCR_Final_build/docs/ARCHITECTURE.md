# Architecture

```text
Local PDF/Image
      |
      v
Input validation
      |
      v
Mistral Files API (purpose=ocr)
      |
      v
Signed file URL
      |
      v
Mistral OCR API (mistral-ocr-latest)
      |
      +--> Markdown text
      +--> structural blocks
      +--> bounding boxes
      +--> confidence scores
      +--> tables/images/metadata
      |
      v
Normalizer
      |
      v
Land-record field extraction
      |
      v
Confidence + review flag
      |
      v
Versioned JSON
```

The Mistral-specific code is isolated in `mistral_client.py`. Downstream normalization and extraction do not depend on the HTTP details of the Mistral API.
