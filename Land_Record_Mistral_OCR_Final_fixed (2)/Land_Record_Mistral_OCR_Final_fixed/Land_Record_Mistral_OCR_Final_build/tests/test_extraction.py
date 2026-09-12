from land_ocr.extraction import extract_fields

def test_hindi_extraction():
    pages = [{"index": 0, "markdown": "नाम: राम प्रसाद\nपिता: श्याम प्रसाद\nखसरा संख्या: 124/2\nरकबा: 0.45 हेक्टेयर\nग्राम: रामपुर"}]
    x = extract_fields(pages)
    assert x["owner_name"]["value"] == "राम प्रसाद"
    assert x["relative_name"]["value"] == "श्याम प्रसाद"
    assert x["relation"]["value"] == "पिता"
    assert x["khasra_number"]["value"] == "124/2"
    assert x["area"]["value"] == {"value":"0.45","unit":"हेक्टेयर"}
    assert x["village"]["value"] == "रामपुर"
