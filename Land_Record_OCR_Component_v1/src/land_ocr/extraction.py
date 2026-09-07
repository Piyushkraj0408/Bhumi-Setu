import re
from .models import ExtractedField, FieldEvidence

ALIASES={
"owner_name":["owner name","owner","नाम","स्वामी","भूमि स्वामी"],
"relative_name":["father name","husband name","father","husband","पिता","पति"],
"survey_number":["survey number","survey no","सर्वे नंबर","सर्वे संख्या"],
"khasra_number":["khasra number","khasra no","खसरा","खसरा संख्या"],
"khata_number":["khata number","khata no","खाता","खाता संख्या"],
"plot_number":["plot number","plot no","प्लॉट","प्लॉट संख्या"],
"area":["area","रकबा","क्षेत्रफल"],
"village":["village","गांव","ग्राम"],"tehsil":["tehsil","तहसील"],
"district":["district","जिला"],"state":["state","राज्य"],
"land_classification":["land classification","classification","भूमि वर्गीकरण"],
"ownership_type":["ownership type","स्वामित्व"],
"mutation_number":["mutation number","mutation no","म्यूटेशन","नामांतरण"],
"registration_number":["registration number","registration no","पंजीकरण"],
"record_year":["record year","year","वर्ष"]}

def clean(s): return re.sub(r"\s+"," ",s).strip()
def extract_fields(regions,page):
    text=clean(" ".join(r.text for r in regions if r.text)); out={}
    for field,aliases in ALIASES.items():
        for i,r in enumerate(regions):
            if any(a.lower() in r.text.lower() for a in aliases):
                value=r.text.split(":",1)[1].strip() if ":" in r.text else (regions[i+1].text if i+1<len(regions) else "")
                if value:
                    c=regions[i+1].confidence if ":" not in r.text and i+1<len(regions) else r.confidence
                    out[field]=ExtractedField(value=clean(value),ocr_confidence=c,
                        extraction_confidence=.82,final_confidence=c*.82,
                        evidence=[FieldEvidence(page=page,bbox=r.bbox,text=value)])
                    break
    m=re.search(r"श्री?\s*([\u0900-\u097F ]+?)\s+(पुत्र|पुत्री|पति|पत्नी)\s+श्री?\s*([\u0900-\u097F ]+?)(?=\s+(?:खसरा|सर्वे|रकबा|खाता)|$)",text)
    if m:
        vals={"owner_name":clean(m.group(1)),"relation":"son_of" if m.group(2)=="पुत्र" else m.group(2),"relative_name":clean(m.group(3))}
        for k,v in vals.items():
            out[k]=ExtractedField(value=v,ocr_confidence=.85,extraction_confidence=.90,final_confidence=.765,
                                  evidence=[FieldEvidence(page=page,text=m.group(0))])
    m=re.search(r"(?:खसरा\s*(?:संख्या|नं\.?|no\.?)?|khasra\s*(?:number|no\.?)?)\s*[:\-]?\s*([A-Za-z0-9/\-]+)",text,re.I)
    if m: out["khasra_number"]=ExtractedField(value=m.group(1),ocr_confidence=.88,extraction_confidence=.92,final_confidence=.81,evidence=[FieldEvidence(page=page,text=m.group(0))])
    m=re.search(r"(?:रकबा|area)\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(हेक्टेयर|hectare|ha|एकड़|acre)?",text,re.I)
    if m: out["area"]=ExtractedField(value={"value":float(m.group(1).replace(",",".")),"unit":(m.group(2) or "unknown").lower()},
                                     ocr_confidence=.75,extraction_confidence=.82,final_confidence=.615,
                                     evidence=[FieldEvidence(page=page,text=m.group(0))])
    m=re.search(r"(?:approved by|approved|अनुमोदित|स्वीकृत)\s*[:\-]?\s*([A-Za-z\u0900-\u097F .]+)",text,re.I)
    if m: out["approving_person"]=ExtractedField(value=clean(m.group(1)),ocr_confidence=.70,extraction_confidence=.70,final_confidence=.49,evidence=[FieldEvidence(page=page,text=m.group(0))])
    return out
