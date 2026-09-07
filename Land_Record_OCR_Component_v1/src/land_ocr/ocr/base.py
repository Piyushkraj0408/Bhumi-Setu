from abc import ABC, abstractmethod

class OCRAdapter(ABC):
    name="base"
    @abstractmethod
    def recognize(self,image,language="eng+hin",region_type="text"): ...

class OCRService:
    def __init__(self, printed, handwriting=None, stamp=None):
        self.printed=printed
        self.handwriting=handwriting or printed
        self.stamp=stamp or printed
    def recognize(self,image,language="eng+hin",handwriting_present=False):
        out=self.printed.recognize(image,language,"text")
        if handwriting_present:
            out.extend(self.handwriting.recognize(image,language,"handwriting"))
        return out
    def recognize_stamp(self,image,language="eng+hin"):
        return self.stamp.recognize(image,language,"stamp_text")
