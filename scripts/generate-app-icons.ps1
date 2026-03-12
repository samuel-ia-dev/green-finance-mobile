Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"

function New-Color([int]$a, [int]$r, [int]$g, [int]$b) {
  return [System.Drawing.Color]::FromArgb($a, $r, $g, $b)
}

function New-PointF([double]$x, [double]$y) {
  return [System.Drawing.PointF]::new([float]$x, [float]$y)
}

function Draw-CircuitLine {
  param(
    [System.Drawing.Graphics]$Graphics,
    [float]$X,
    [float]$Y,
    [float]$Width,
    [System.Drawing.Color]$Color
  )

  $pen = [System.Drawing.Pen]::new($Color, 5)
  $Graphics.DrawLine($pen, $X, $Y, $X + $Width, $Y)
  $dotBrush = [System.Drawing.SolidBrush]::new($Color)
  $Graphics.FillEllipse($dotBrush, $X + $Width + 10, $Y - 5, 10, 10)
  $pen.Dispose()
  $dotBrush.Dispose()
}

function Draw-Arrow {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Color]$GlowColor,
    [System.Drawing.Color]$StrokeColor,
    [System.Drawing.PointF[]]$Points
  )

  $glowPen = [System.Drawing.Pen]::new($GlowColor, 26)
  $glowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $strokePen = [System.Drawing.Pen]::new($StrokeColor, 10)
  $strokePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $Graphics.DrawLines($glowPen, $Points)
  $Graphics.DrawLines($strokePen, $Points)
  $glowPen.Dispose()
  $strokePen.Dispose()
}

function Draw-Hand {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Color]$GlowColor,
    [System.Drawing.Color]$StrokeColor
  )

  $glowPen = [System.Drawing.Pen]::new($GlowColor, 30)
  $glowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $glowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $glowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $strokePen = [System.Drawing.Pen]::new($StrokeColor, 10)
  $strokePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $strokePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $strokePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddCurve([System.Drawing.PointF[]]@(
      (New-PointF 215 765),
      (New-PointF 300 705),
      (New-PointF 420 675),
      (New-PointF 575 680),
      (New-PointF 745 705),
      (New-PointF 865 770)
    ), 0.4)
  $Graphics.DrawPath($glowPen, $path)
  $Graphics.DrawPath($strokePen, $path)

  $thumbPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $thumbPath.AddCurve([System.Drawing.PointF[]]@(
      (New-PointF 525 670),
      (New-PointF 470 615),
      (New-PointF 420 600),
      (New-PointF 370 625)
    ), 0.4)
  $Graphics.DrawPath($glowPen, $thumbPath)
  $Graphics.DrawPath($strokePen, $thumbPath)

  $palmFill = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(45, $StrokeColor))
  $palmPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $palmPath.AddClosedCurve([System.Drawing.PointF[]]@(
      (New-PointF 245 768),
      (New-PointF 335 718),
      (New-PointF 495 690),
      (New-PointF 675 703),
      (New-PointF 810 742),
      (New-PointF 855 790),
      (New-PointF 790 828),
      (New-PointF 610 835),
      (New-PointF 390 820),
      (New-PointF 275 798)
    ), 0.35)
  $Graphics.FillPath($palmFill, $palmPath)

  $glowPen.Dispose()
  $strokePen.Dispose()
  $path.Dispose()
  $thumbPath.Dispose()
  $palmFill.Dispose()
  $palmPath.Dispose()
}

function Draw-Coin {
  param(
    [System.Drawing.Graphics]$Graphics
  )

  $coinRect = [System.Drawing.RectangleF]::new(322, 195, 380, 380)
  $outerGlow = [System.Drawing.SolidBrush]::new((New-Color 35 64 190 255))
  $ringGlowPen = [System.Drawing.Pen]::new((New-Color 120 62 198 255), 22)
  $ringGlowPen.Alignment = [System.Drawing.Drawing2D.PenAlignment]::Center
  $ringPen = [System.Drawing.Pen]::new((New-Color 255 156 234 255), 8)
  $innerRingPen = [System.Drawing.Pen]::new((New-Color 255 113 201 255), 4)

  $coinPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $coinPath.AddEllipse($coinRect)
  $Graphics.FillPath($outerGlow, $coinPath)
  $Graphics.DrawEllipse($ringGlowPen, $coinRect)
  $Graphics.DrawEllipse($ringPen, $coinRect)

  $innerRect = [System.Drawing.RectangleF]::new(368, 240, 288, 288)
  $Graphics.DrawEllipse($innerRingPen, $innerRect)

  $highlightPen = [System.Drawing.Pen]::new((New-Color 180 230 250 255), 5)
  $Graphics.DrawArc($highlightPen, 378, 250, 268, 268, 208, 86)

  $fontFamily = [System.Drawing.FontFamily]::GenericSansSerif
  $dollarFont = [System.Drawing.Font]::new($fontFamily, 184, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $dollarGlowBrush = [System.Drawing.SolidBrush]::new((New-Color 110 74 205 255))
  $dollarBrush = [System.Drawing.SolidBrush]::new((New-Color 255 230 248 255))
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center

  $Graphics.DrawString("$", $dollarFont, $dollarGlowBrush, [System.Drawing.RectangleF]::new(334, 232, 356, 300), $format)
  $Graphics.DrawString("$", $dollarFont, $dollarBrush, [System.Drawing.RectangleF]::new(326, 224, 356, 300), $format)

  $ringGlowPen.Dispose()
  $ringPen.Dispose()
  $innerRingPen.Dispose()
  $highlightPen.Dispose()
  $dollarFont.Dispose()
  $dollarGlowBrush.Dispose()
  $dollarBrush.Dispose()
  $format.Dispose()
  $outerGlow.Dispose()
  $coinPath.Dispose()
}

function New-BackgroundBrush {
  param(
    [System.Drawing.RectangleF]$Bounds
  )

  $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    [System.Drawing.PointF]::new($Bounds.Left, $Bounds.Top),
    [System.Drawing.PointF]::new($Bounds.Right, $Bounds.Bottom),
    ((New-Color 255 4 12 35)),
    ((New-Color 255 10 52 112))
  )

  $blend = [System.Drawing.Drawing2D.ColorBlend]::new()
  $blend.Colors = @(
    ((New-Color 255 2 10 30)),
    ((New-Color 255 5 22 58)),
    ((New-Color 255 10 52 112))
  )
  $blend.Positions = @(0.0, 0.58, 1.0)
  $brush.InterpolationColors = $blend
  return $brush
}

function Draw-Scene {
  param(
    [System.Drawing.Graphics]$Graphics,
    [int]$Size,
    [bool]$TransparentBackground = $false
  )

  $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $Graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  if (-not $TransparentBackground) {
    $backgroundBrush = New-BackgroundBrush ([System.Drawing.RectangleF]::new(0, 0, $Size, $Size))
    $Graphics.FillRectangle($backgroundBrush, 0, 0, $Size, $Size)
    $backgroundBrush.Dispose()

    $starBrush = [System.Drawing.SolidBrush]::new((New-Color 55 92 185 255))
    $random = [System.Random]::new(42)
    foreach ($i in 0..54) {
      $x = $random.Next(40, $Size - 40)
      $y = $random.Next(40, $Size - 40)
      $w = $random.Next(6, 18)
      $Graphics.FillRectangle($starBrush, $x, $y, $w, 2)
    }
    $starBrush.Dispose()
  }

  $arrowGlow = New-Color 70 58 194 255
  $arrowStroke = New-Color 255 134 236 255
  Draw-Arrow $Graphics $arrowGlow $arrowStroke @(
    (New-PointF 170 345),
    (New-PointF 72 418),
    (New-PointF 170 492)
  )
  Draw-Arrow $Graphics $arrowGlow $arrowStroke @(
    (New-PointF 850 345),
    (New-PointF 952 418),
    (New-PointF 850 492)
  )

  Draw-Coin $Graphics
  Draw-Hand $Graphics (New-Color 55 80 195 255) (New-Color 255 154 234 255)

  $sparkBrush = [System.Drawing.SolidBrush]::new((New-Color 160 191 241 255))
  foreach ($point in @(
      (New-PointF 500 150),
      (New-PointF 300 312),
      (New-PointF 728 314),
      (New-PointF 548 625),
      (New-PointF 252 712),
      (New-PointF 794 676)
    )) {
    $Graphics.FillEllipse($sparkBrush, $point.X, $point.Y, 10, 10)
  }
  $sparkBrush.Dispose()
}

function Save-Png {
  param(
    [string]$Path,
    [int]$Size,
    [bool]$TransparentBackground = $false
  )

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  if ($TransparentBackground) {
    $graphics.Clear([System.Drawing.Color]::Transparent)
  }

  Draw-Scene $graphics $Size $TransparentBackground
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

  $graphics.Dispose()
  $bitmap.Dispose()
}

function Save-Favicon {
  param(
    [string]$Path
  )

  $size = 256
  $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

  $backgroundBrush = New-BackgroundBrush ([System.Drawing.RectangleF]::new(0, 0, $size, $size))
  $graphics.FillRectangle($backgroundBrush, 0, 0, $size, $size)
  $backgroundBrush.Dispose()

  Draw-Arrow $graphics (New-Color 50 58 194 255) (New-Color 255 134 236 255) @(
    (New-PointF 62 86),
    (New-PointF 24 128),
    (New-PointF 62 170)
  )
  Draw-Arrow $graphics (New-Color 50 58 194 255) (New-Color 255 134 236 255) @(
    (New-PointF 194 86),
    (New-PointF 232 128),
    (New-PointF 194 170)
  )

  $glowPen = [System.Drawing.Pen]::new((New-Color 110 62 198 255), 8)
  $ringPen = [System.Drawing.Pen]::new((New-Color 255 156 234 255), 4)
  $innerRingPen = [System.Drawing.Pen]::new((New-Color 255 113 201 255), 2)
  $graphics.DrawEllipse($glowPen, 64, 50, 128, 128)
  $graphics.DrawEllipse($ringPen, 64, 50, 128, 128)
  $graphics.DrawEllipse($innerRingPen, 80, 66, 96, 96)

  $font = [System.Drawing.Font]::new([System.Drawing.FontFamily]::GenericSansSerif, 72, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $brush = [System.Drawing.SolidBrush]::new((New-Color 255 230 248 255))
  $graphics.DrawString("$", $font, $brush, [System.Drawing.RectangleF]::new(76, 68, 104, 92), $format)

  $glowPen.Dispose()
  $ringPen.Dispose()
  $innerRingPen.Dispose()
  $font.Dispose()
  $format.Dispose()
  $brush.Dispose()
  $graphics.Dispose()
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

$assetsPath = Join-Path $PSScriptRoot "..\assets"

Save-Png -Path (Join-Path $assetsPath "icon.png") -Size 1024
Save-Favicon -Path (Join-Path $assetsPath "favicon.png")
Save-Png -Path (Join-Path $assetsPath "adaptive-icon.png") -Size 1024 -TransparentBackground $true
