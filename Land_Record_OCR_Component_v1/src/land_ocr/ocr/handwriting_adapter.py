from .base import OCRAdapter

class HandwritingOCR(OCRAdapter):
    name="handwriting"
    def __init__(self,delegate=None):
        self.delegate=delegate
    def recognize(self,image,language="eng+hin",region_type="handwriting"):
        if self.delegate is None:
            return []
        return self.delegate.recognize(image,language,region_type)
