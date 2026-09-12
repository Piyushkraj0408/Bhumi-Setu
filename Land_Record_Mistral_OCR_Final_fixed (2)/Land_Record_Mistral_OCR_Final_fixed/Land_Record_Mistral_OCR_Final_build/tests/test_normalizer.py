from land_ocr.normalizer import normalize_pages

def test_normalize_blocks():
    raw = {"pages": [{"index": 0, "markdown": "राम", "confidence_scores": {"average_page_confidence_score": 0.9}, "blocks": [{"type": "text", "top_left_x": 1, "top_left_y": 2, "bottom_right_x": 3, "bottom_right_y": 4, "content": "राम", "confidence_scores": {"average_content_confidence_score": 0.95}}]}]}
    p = normalize_pages(raw)[0]
    assert p["page_number"] == 1
    assert p["blocks"][0]["bbox"] == [1,2,3,4]
    assert p["blocks"][0]["confidence"] == 0.95
