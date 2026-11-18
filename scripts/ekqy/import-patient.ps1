param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Name
)

$ErrorActionPreference = "Continue"
$PSNativeCommandUseErrorActionPreference = $false

$root = "C:/Users/ccalm/Desktop/ccalm-system"
$nameFile = Join-Path $root "scripts/ekqy/.name.txt"
$rawFile = Join-Path $root "scripts/ekqy/.raw.json"

[System.IO.File]::WriteAllText(
  $nameFile,
  $Name,
  (New-Object System.Text.UTF8Encoding($false))
)
Remove-Item $rawFile -Force -ErrorAction SilentlyContinue

ego-browser nodejs -e "await import('file:///C:/Users/ccalm/Desktop/ccalm-system/scripts/ekqy/scrape.mjs')"

if (-not (Test-Path $rawFile)) {
  throw "抓取失败：没有生成 $rawFile"
}
$raw = Get-Content $rawFile -Raw -Encoding UTF8 | ConvertFrom-Json
if ($raw.name -ne $Name) {
  throw "抓取到的患者是 $($raw.name)，不是 $Name"
}

Push-Location (Join-Path $root "ccalm-api")
try {
  node scripts/import-ekqy.mjs
}
finally {
  Pop-Location
}
