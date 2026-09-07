import numpy as np
from .base import OCRAdapter
from ..models import OCRRegion

class PaddleOCRAdapter(OCRAdapter):
    name="paddleocr"
    def __init__(self,lang="hi"):
        try:
            from paddleocr import PaddleOCR
        except ImportError as e:
            raise RuntimeError("Install requirements-paddle.txt and a compatible PaddlePaddle runtime.") from e
        self.ocr=PaddleOCR(lang=lang)
    def recognize(self,image,language="eng+hin",region_type="text"):
        out=[]
        for page in self.ocr.predict(image):
            data=getattr(page,"json",None)
            data=data() if callable(data) else data
            if isinstance(data,dict): data=data.get("res",data)
            if not isinstance(data,dict): continue
            texts=data.get("rec_texts") or data.get("texts") or []
            scores=data.get("rec_scores") or data.get("scores") or []
            boxes=data.get("rec_boxes") or data.get("dt_polys") or []
            for text,score,box in zip(texts,scores,boxes):
                b=np.asarray(box).astype(int)
                out.append(OCRRegion(region_id=f"ocr-{len(out)}",type=region_type,
                    bbox=[int(b[:,0].min()),int(b[:,1].min()),int(b[:,0].max()),int(b[:,1].max())],
                    text=str(text),language="hi" if any("\u0900"<=c<="\u097F" for c in str(text)) else "en",
                    confidence=float(score),source_engine=self.name))
        return out
