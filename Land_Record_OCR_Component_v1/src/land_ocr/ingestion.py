from pathlib import Path
import fitz
import numpy as np
from PIL import Image

SUPPORTED = {".pdf",".jpg",".jpeg",".png",".tif",".tiff"}

def validate_input(path: Path):
    if path.suffix.lower() not in SUPPORTED:
        raise ValueError(f"Unsupported file type: {path.suffix}")

def pil_to_bgr(image):
    rgb = np.array(image.convert("RGB"))
    return rgb[:, :, ::-1].copy()

def load_pages(path: Path, dpi=300, max_pages=200):
    validate_input(path)
    if path.suffix.lower() == ".pdf":
        result = []
        doc = fitz.open(path)
        try:
            for i, page in enumerate(doc):
                if i >= max_pages: break
                pix = page.get_pixmap(dpi=dpi, alpha=False)
                arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
                if pix.n == 4: arr = arr[:, :, :3]
                result.append(arr[:, :, ::-1].copy())
        finally:
            doc.close()
        return result
    result = []
    with Image.open(path) as img:
        for i in range(getattr(img, "n_frames", 1)):
            if i >= max_pages: break
            img.seek(i)
            result.append(pil_to_bgr(img.copy()))
    return result
