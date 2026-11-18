param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Name
)

$ErrorActionPreference = "Stop"
$root = "C:/Users/ccalm/Desktop/ccalm-system"
$nameFile = Join-Path $root "scripts/ekqy/.name.txt"
$rawFile = Join-Path $root "scripts/ekqy/.raw.json"

# 写入要导入的患者姓名
Set-Content -Path $nameFile -Value $Name -Encoding utf8

# 1) 从 e看牙 抓取该患者数据
ego-browser nodejs -e "await import('file:///C:/Users/ccalm/Desktop/ccalm-system/scripts/ekqy/scrape.mjs')"
if (-not (Test-Path $rawFile)) {
  throw "抓取失败：没有生成 $rawFile"
}

# 2) 写入本地开发库
Push-Location (Join-Path $root "ccalm-api")
try {
  node scripts/import-ekqy.mjs
}
finally {
  Pop-Location
}
