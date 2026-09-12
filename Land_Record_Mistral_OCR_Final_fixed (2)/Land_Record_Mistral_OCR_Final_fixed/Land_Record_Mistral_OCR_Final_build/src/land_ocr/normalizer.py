from typing import Any

def _bbox(block: dict[str, Any]):
    keys = ("top_left_x", "top_left_y", "bottom_right_x", "bottom_right_y")
    if all(k in block for k in keys):
        return [block[k] for k in keys]
    return None

def normalize_pages(raw: dict[str, Any]) -> list[dict[str, Any]]:
    pages = []
    for p in raw.get("pages", []):
        blocks = []
        for b in p.get("blocks") or []:
            cs = b.get("confidence_scores") or {}
            blocks.append({
                "type": b.get("type"),
                "bbox": _bbox(b),
                "text": b.get("content", ""),
                "confidence": cs.get("average_content_confidence_score"),
                "min_confidence": cs.get("minimum_content_confidence_score"),
                "block_type_confidence": cs.get("block_type_confidence_score"),
            })
        pcs = p.get("confidence_scores") or {}
        pages.append({
            "page_number": int(p.get("index", 0)) + 1,
            "text": p.get("markdown", "") or "",
            "confidence": pcs.get("average_page_confidence_score"),
            "min_confidence": pcs.get("minimum_page_confidence_score"),
            "blocks": blocks,
            "tables": p.get("tables", []),
            "images": p.get("images", []),
            "dimensions": p.get("dimensions", {}),
            "header": p.get("header"),
            "footer": p.get("footer"),
        })
    return pages
