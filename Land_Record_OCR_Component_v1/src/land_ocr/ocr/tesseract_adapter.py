import re
import pytesseract
from pytesseract import Output
from .base import OCRAdapter
from ..models import OCRRegion

class TesseractAdapter(OCRAdapter):
    name="tesseract"
    def __init__(self,cmd=None):
        if cmd: pytesseract.pytesseract.tesseract_cmd=cmd
    def recognize(self,image,language="eng+hin",region_type="text"):
        data=pytesseract.image_to_data(image,lang=language,config="--oem 1 --psm 6",output_type=Output.DICT)
        out=[]
        for i,raw in enumerate(data["text"]):
            text=raw.strip()
            if not text: continue
            try: conf=max(0,min(1,float(data["conf"][i])/100))
            except: conf=0
            x,y,w,h=[int(data[k][i]) for k in ("left","top","width","height")]
            lang="hi" if re.search(r"[\u0900-\u097F]",text) else "en"
            out.append(OCRRegion(region_id=f"ocr-{len(out)}",type=region_type,bbox=[x,y,x+w,y+h],
                                 text=text,language=lang,confidence=conf,source_engine=self.name))
        return out
