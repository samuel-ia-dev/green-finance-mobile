Add-Type -AssemblyName System.Drawing

$bitmap = New-Object System.Drawing.Bitmap 256, 256
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$background = [System.Drawing.ColorTranslator]::FromHtml("#0B1020")
$accent = [System.Drawing.ColorTranslator]::FromHtml("#16A34A")
$graphics.Clear($background)
$brush = New-Object System.Drawing.SolidBrush $accent
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.FillEllipse($brush, 48, 48, 160, 160)

$targets = @(
  "assets/icon.png",
  "assets/adaptive-icon.png",
  "assets/favicon.png",
  "assets/splash.png"
)

foreach ($target in $targets) {
  $bitmap.Save((Join-Path (Get-Location) $target), [System.Drawing.Imaging.ImageFormat]::Png)
}

$brush.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
