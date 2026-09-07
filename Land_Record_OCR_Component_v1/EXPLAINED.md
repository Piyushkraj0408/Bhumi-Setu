# Implementation Explained

## Replaceable OCR
`OCRService` accepts three interfaces:
- PrintedTextOCR
- HandwritingOCR
- StampTextOCR

Each returns the same `OCRRegion` structure. Downstream modules therefore do not know whether recognition came from Tesseract, PaddleOCR, or a future model.

## Quality
The baseline calculates resolution/DPI, blur, skew, noise, brightness, contrast, page-damage proxy, handwriting probability proxy and orientation.

These are routing signals. They are intentionally replaceable with learned quality models later.

## Preprocessing
The original image is never overwritten. The working image is transformed conditionally using orientation correction, deskew, denoising, CLAHE contrast enhancement and adaptive thresholding.

## Layout
The baseline uses OpenCV morphology for table-like regions and conservative circular/elliptical stamp detection. A learned layout detector can replace this module later.

## Extraction
Hindi and English aliases plus regex/pattern rules extract:
owner, relation, relative name, survey/khasra/khata/plot numbers, area, village, tehsil, district, state, classification, ownership type, mutation, registration and year.

## Confidence
OCR confidence and extraction confidence are retained separately. Final confidence also applies a page-quality factor. Thresholds are configuration-driven.

## Backend
The result is derived evidence, not the authoritative land record. The parent backend owns persistence, business rules and final verification.

## Production next steps
1. Build representative corpus.
2. Benchmark Tesseract vs PaddleOCR.
3. Benchmark Hindi/English handwriting.
4. Replace heuristic layout with validated document-layout model where required.
5. Calibrate confidence.
6. Add asynchronous job queue.
7. Integrate with parent backend.
