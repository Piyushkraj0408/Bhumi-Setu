param(
  [Parameter(Mandatory=$true)][string]$Input,
  [string]$Output = ""
)
$env:PYTHONPATH = "src"
if ($Output -eq "") {
  $base = [System.IO.Path]::GetFileNameWithoutExtension($Input)
  $Output = "output\$base.json"
}
python -m land_ocr.cli --input $Input --output $Output
