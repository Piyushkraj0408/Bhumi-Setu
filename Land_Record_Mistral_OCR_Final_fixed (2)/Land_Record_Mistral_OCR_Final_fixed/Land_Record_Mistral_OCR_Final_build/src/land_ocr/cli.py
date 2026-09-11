import argparse, json
from .pipeline import process_to_json

def main():
    parser = argparse.ArgumentParser(description="Hindi/English land-record OCR using Mistral OCR API")
    parser.add_argument("--input", required=True, help="PDF/JPG/JPEG/PNG/TIFF input")
    parser.add_argument("--output", default=None, help="Output JSON path")
    args = parser.parse_args()
    output = args.output or f"output/{args.input.split('/')[-1].rsplit('.', 1)[0]}.json"
    result = process_to_json(args.input, output)
    print(f"Status: {result['processing']['status']}")
    print(f"Pages: {result['document']['pages']}")
    print(f"JSON: {output}")

if __name__ == "__main__":
    main()
