from land_ocr.extraction import extract_fields
from land_ocr.models import OCRRegion
def test_hindi():
    rs=[OCRRegion(region_id="1",text="श्री राम प्रसाद पुत्र श्री श्याम प्रसाद",confidence=.95),
        OCRRegion(region_id="2",text="खसरा संख्या 124/2",confidence=.96),
        OCRRegion(region_id="3",text="रकबा 0.45 हेक्टेयर",confidence=.8)]
    f=extract_fields(rs,1)
    assert f["owner_name"].value=="राम प्रसाद"
    assert f["relative_name"].value=="श्याम प्रसाद"
    assert f["khasra_number"].value=="124/2"
    assert f["area"].value["value"]==.45
