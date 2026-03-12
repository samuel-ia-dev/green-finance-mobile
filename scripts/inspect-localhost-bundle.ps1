$url = "http://127.0.0.1:19011/node_modules/expo/AppEntry.bundle?platform=web&dev=true&hot=false&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable"
$output = Join-Path $PSScriptRoot "..\\bundle-19011.js"

Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $output

$content = Get-Content $output -Raw

Write-Output ("bundle_size=" + $content.Length)
Write-Output ("has_classificacao_livre=" + $content.Contains("Classificação Livre"))
Write-Output ("has_classificacao=" + $content.Contains("classificação"))
Write-Output ("has_pg=" + $content.Contains("PG"))
Write-Output ("has_cash_outline=" + $content.Contains("cash-outline"))
Write-Output ("has_checkmark_circle=" + $content.Contains("checkmark-circle"))
