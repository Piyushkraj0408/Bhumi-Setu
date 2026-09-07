import argparse,json
from .config import Settings
from .pipeline import process_document
def main():
    p=argparse.ArgumentParser(); p.add_argument("--input",required=True); p.add_argument("--output",default="ocr_result.json"); p.add_argument("--engine",choices=["tesseract","paddle"])
    a=p.parse_args(); s=Settings()
    if a.engine: s.engine=a.engine
    r=process_document(a.input,s)
    open(a.output,"w",encoding="utf-8").write(json.dumps(r.model_dump(),ensure_ascii=False,indent=2))
    print(f"Saved: {a.output} | status={r.processing['status']} | review_required={r.review_required}")
if __name__=="__main__": main()
