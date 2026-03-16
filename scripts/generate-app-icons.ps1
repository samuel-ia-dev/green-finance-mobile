Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"

function New-Color([int]$a, [int]$r, [int]$g, [int]$b) {
  return [System.Drawing.Color]::FromArgb($a, $r, $g, $b)
}

function New-PointF([double]$x, [double]$y) {
  return [System.Drawing.PointF]::new([float]$x, [float]$y)
}

function New-ScaledPoint {
  param(
    [float]$OffsetX,
    [float]$OffsetY,
    [float]$Scale,
    [double]$X,
    [double]$Y
  )

  return [System.Drawing.PointF]::new(
    [float]($OffsetX + ($Scale * $X)),
    [float]($OffsetY + ($Scale * $Y))
  )
}

function New-RoundedRectPath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $diameter = $Radius * 2
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function Set-HighQualityDrawing {
  param(
    [System.Drawing.Graphics]$Graphics
  )

  $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $Graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
}

function New-OutlinePen {
  param(
    [float]$Width
  )

  $pen = [System.Drawing.Pen]::new((New-Color 255 18 18 18), $Width)
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  return $pen
}

function Draw-Background {
  param(
    [System.Drawing.Graphics]$Graphics,
    [int]$Size
  )

  $Graphics.Clear((New-Color 255 247 244 249))

  $dotBrush = [System.Drawing.SolidBrush]::new((New-Color 64 188 184 192))
  $sparkBrush = [System.Drawing.SolidBrush]::new((New-Color 255 20 20 20))

  foreach ($row in 0..4) {
    foreach ($column in 0..4) {
      $Graphics.FillEllipse($dotBrush, $Size * (0.74 + ($column * 0.035)), $Size * (0.03 + ($row * 0.035)), $Size * 0.012, $Size * 0.012)
    }
  }

  foreach ($row in 0..2) {
    foreach ($column in 0..2) {
      $Graphics.FillEllipse($dotBrush, $Size * (0.02 + ($column * 0.036)), $Size * (0.70 + ($row * 0.036)), $Size * 0.012, $Size * 0.012)
    }
  }

  $sparklePoints = @(
    @(0.07, 0.06),
    @(0.83, 0.12),
    @(0.11, 0.18)
  )

  foreach ($sparkle in $sparklePoints) {
    $x = [float]($Size * $sparkle[0])
    $y = [float]($Size * $sparkle[1])
    $s = [float]($Size * 0.016)
    $Graphics.FillRectangle($sparkBrush, $x + $s, $y, $s, $s)
    $Graphics.FillRectangle($sparkBrush, $x, $y + $s, $s, $s)
    $Graphics.FillRectangle($sparkBrush, $x + ($s * 2), $y + $s, $s, $s)
    $Graphics.FillRectangle($sparkBrush, $x + $s, $y + ($s * 2), $s, $s)
  }

  $dotBrush.Dispose()
  $sparkBrush.Dispose()
}

function Draw-Buildings {
  param(
    [System.Drawing.Graphics]$Graphics,
    [float]$OffsetX,
    [float]$OffsetY,
    [float]$Scale,
    [float]$Stroke
  )

  $outlinePen = New-OutlinePen $Stroke
  $windowBrush = [System.Drawing.SolidBrush]::new((New-Color 255 55 55 55))
  $leftBrush = [System.Drawing.SolidBrush]::new((New-Color 255 231 208 255))
  $mainBrush = [System.Drawing.SolidBrush]::new((New-Color 255 250 250 250))
  $houseBrush = [System.Drawing.SolidBrush]::new((New-Color 255 246 240 211))
  $roofBrush = [System.Drawing.SolidBrush]::new((New-Color 255 247 222 54))

  $leftPath = New-RoundedRectPath `
    -X ([float]($OffsetX + ($Scale * 0.34))) `
    -Y ([float]($OffsetY + ($Scale * 0.16))) `
    -Width ([float]($Scale * 0.08)) `
    -Height ([float]($Scale * 0.23)) `
    -Radius ([float]($Scale * 0.014))
  $Graphics.FillPath($leftBrush, $leftPath)
  $Graphics.DrawPath($outlinePen, $leftPath)

  $mainPath = New-RoundedRectPath `
    -X ([float]($OffsetX + ($Scale * 0.43))) `
    -Y ([float]($OffsetY + ($Scale * 0.09))) `
    -Width ([float]($Scale * 0.14)) `
    -Height ([float]($Scale * 0.30)) `
    -Radius ([float]($Scale * 0.014))
  $Graphics.FillPath($mainBrush, $mainPath)
  $Graphics.DrawPath($outlinePen, $mainPath)

  foreach ($row in 0..4) {
    foreach ($column in 0..2) {
      $Graphics.FillRectangle(
        $windowBrush,
        $OffsetX + ($Scale * (0.458 + ($column * 0.032))),
        $OffsetY + ($Scale * (0.13 + ($row * 0.05))),
        $Scale * 0.012,
        $Scale * 0.018
      )
    }
  }

  $houseBody = New-RoundedRectPath `
    -X ([float]($OffsetX + ($Scale * 0.64))) `
    -Y ([float]($OffsetY + ($Scale * 0.28))) `
    -Width ([float]($Scale * 0.16)) `
    -Height ([float]($Scale * 0.12)) `
    -Radius ([float]($Scale * 0.012))
  $Graphics.FillPath($houseBrush, $houseBody)
  $Graphics.DrawPath($outlinePen, $houseBody)

  $roofPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $roofPath.AddPolygon([System.Drawing.PointF[]]@(
      (New-ScaledPoint $OffsetX $OffsetY $Scale 0.62 0.29),
      (New-ScaledPoint $OffsetX $OffsetY $Scale 0.72 0.19),
      (New-ScaledPoint $OffsetX $OffsetY $Scale 0.82 0.29)
    ))
  $Graphics.FillPath($roofBrush, $roofPath)
  $Graphics.DrawPath($outlinePen, $roofPath)

  $Graphics.DrawLine(
    $outlinePen,
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.72 0.31),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.72 0.40)
  )

  $leftPath.Dispose()
  $mainPath.Dispose()
  $houseBody.Dispose()
  $roofPath.Dispose()
  $outlinePen.Dispose()
  $windowBrush.Dispose()
  $leftBrush.Dispose()
  $mainBrush.Dispose()
  $houseBrush.Dispose()
  $roofBrush.Dispose()
}

function Draw-MoneyBag {
  param(
    [System.Drawing.Graphics]$Graphics,
    [float]$OffsetX,
    [float]$OffsetY,
    [float]$Scale,
    [float]$Stroke
  )

  $outlinePen = New-OutlinePen $Stroke
  $bagBrush = [System.Drawing.SolidBrush]::new((New-Color 255 246 219 37))
  $bandBrush = [System.Drawing.SolidBrush]::new((New-Color 255 217 189 23))
  $crownBrush = [System.Drawing.SolidBrush]::new((New-Color 255 255 208 26))
  $symbolBrush = [System.Drawing.SolidBrush]::new((New-Color 255 18 18 18))

  $bagPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $bagPath.AddClosedCurve([System.Drawing.PointF[]]@(
      (New-ScaledPoint $OffsetX $OffsetY $Scale 0.10 0.42),
      (New-ScaledPoint $OffsetX $OffsetY $Scale 0.08 0.32),
      (New-ScaledPoint $OffsetX $OffsetY $Scale 0.14 0.21),
      (New-ScaledPoint $OffsetX $OffsetY $Scale 0.34 0.21),
      (New-ScaledPoint $OffsetX $OffsetY $Scale 0.41 0.32),
      (New-ScaledPoint $OffsetX $OffsetY $Scale 0.38 0.42)
    ), 0.28)
  $Graphics.FillPath($bagBrush, $bagPath)
  $Graphics.DrawPath($outlinePen, $bagPath)

  $bandPath = New-RoundedRectPath `
    -X ([float]($OffsetX + ($Scale * 0.17))) `
    -Y ([float]($OffsetY + ($Scale * 0.19))) `
    -Width ([float]($Scale * 0.15)) `
    -Height ([float]($Scale * 0.04)) `
    -Radius ([float]($Scale * 0.012))
  $Graphics.FillPath($bandBrush, $bandPath)
  $Graphics.DrawPath($outlinePen, $bandPath)

  $crownPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $crownPath.AddPolygon([System.Drawing.PointF[]]@(
      (New-ScaledPoint $OffsetX $OffsetY $Scale 0.12 0.17),
      (New-ScaledPoint $OffsetX $OffsetY $Scale 0.15 0.07),
      (New-ScaledPoint $OffsetX $OffsetY $Scale 0.21 0.13),
      (New-ScaledPoint $OffsetX $OffsetY $Scale 0.25 0.03),
      (New-ScaledPoint $OffsetX $OffsetY $Scale 0.29 0.13),
      (New-ScaledPoint $OffsetX $OffsetY $Scale 0.35 0.07),
      (New-ScaledPoint $OffsetX $OffsetY $Scale 0.38 0.17),
      (New-ScaledPoint $OffsetX $OffsetY $Scale 0.12 0.17)
    ))
  $Graphics.FillPath($crownBrush, $crownPath)
  $Graphics.DrawPath($outlinePen, $crownPath)

  $crownBase = New-RoundedRectPath `
    -X ([float]($OffsetX + ($Scale * 0.12))) `
    -Y ([float]($OffsetY + ($Scale * 0.16))) `
    -Width ([float]($Scale * 0.26)) `
    -Height ([float]($Scale * 0.035)) `
    -Radius ([float]($Scale * 0.01))
  $Graphics.FillPath($crownBrush, $crownBase)
  $Graphics.DrawPath($outlinePen, $crownBase)

  $font = [System.Drawing.Font]::new([System.Drawing.FontFamily]::GenericSansSerif, $Scale * 0.14, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $stringFormat = [System.Drawing.StringFormat]::new()
  $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
  $stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center

  $Graphics.DrawString(
    "$",
    $font,
    $symbolBrush,
    [System.Drawing.RectangleF]::new(
      [float]($OffsetX + ($Scale * 0.10)),
      [float]($OffsetY + ($Scale * 0.23)),
      [float]($Scale * 0.30),
      [float]($Scale * 0.18)
    ),
    $stringFormat
  )

  $bagPath.Dispose()
  $bandPath.Dispose()
  $crownPath.Dispose()
  $crownBase.Dispose()
  $outlinePen.Dispose()
  $bagBrush.Dispose()
  $bandBrush.Dispose()
  $crownBrush.Dispose()
  $symbolBrush.Dispose()
  $font.Dispose()
  $stringFormat.Dispose()
}

function Draw-Hand {
  param(
    [System.Drawing.Graphics]$Graphics,
    [float]$OffsetX,
    [float]$OffsetY,
    [float]$Scale,
    [float]$Stroke
  )

  $outlinePen = New-OutlinePen $Stroke
  $detailPen = New-OutlinePen ([float]($Stroke * 0.45))
  $handBrush = [System.Drawing.SolidBrush]::new((New-Color 255 250 250 250))
  $sleeveBrush = [System.Drawing.SolidBrush]::new((New-Color 255 236 208 255))

  $sleevePath = New-RoundedRectPath `
    -X ([float]($OffsetX + ($Scale * 0.03))) `
    -Y ([float]($OffsetY + ($Scale * 0.63))) `
    -Width ([float]($Scale * 0.14)) `
    -Height ([float]($Scale * 0.24)) `
    -Radius ([float]($Scale * 0.03))
  $Graphics.FillPath($sleeveBrush, $sleevePath)
  $Graphics.DrawPath($outlinePen, $sleevePath)

  $handPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $handPath.AddBezier(
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.14 0.68),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.30 0.64),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.49 0.65),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.62 0.66)
  )
  $handPath.AddBezier(
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.62 0.66),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.73 0.66),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.82 0.59),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.89 0.53)
  )
  $handPath.AddBezier(
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.89 0.53),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.94 0.51),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.97 0.56),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.93 0.61)
  )
  $handPath.AddBezier(
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.93 0.61),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.89 0.68),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.78 0.74),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.62 0.78)
  )
  $handPath.AddBezier(
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.62 0.78),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.43 0.82),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.24 0.81),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.14 0.79)
  )
  $handPath.CloseFigure()

  $Graphics.FillPath($handBrush, $handPath)
  $Graphics.DrawPath($outlinePen, $handPath)

  $Graphics.DrawBezier(
    $detailPen,
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.24 0.69),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.38 0.69),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.49 0.69),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.59 0.68)
  )

  $Graphics.DrawLine(
    $detailPen,
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.17 0.64),
    (New-ScaledPoint $OffsetX $OffsetY $Scale 0.17 0.84)
  )

  $sleevePath.Dispose()
  $handPath.Dispose()
  $outlinePen.Dispose()
  $detailPen.Dispose()
  $handBrush.Dispose()
  $sleeveBrush.Dispose()
}

function Draw-Scene {
  param(
    [System.Drawing.Graphics]$Graphics,
    [int]$Size,
    [bool]$TransparentBackground = $false
  )

  if ($TransparentBackground) {
    $Graphics.Clear([System.Drawing.Color]::Transparent)
  } else {
    Draw-Background $Graphics $Size
  }

  $sceneScale = [float]($Size * ($(if ($TransparentBackground) { 0.76 } else { 0.90 })))
  $offsetX = [float](($Size - $sceneScale) / 2)
  $offsetY = [float](($Size - $sceneScale) / 2)
  $stroke = [float]($sceneScale * 0.026)

  Draw-Buildings -Graphics $Graphics -OffsetX $offsetX -OffsetY $offsetY -Scale $sceneScale -Stroke $stroke
  Draw-MoneyBag -Graphics $Graphics -OffsetX $offsetX -OffsetY $offsetY -Scale $sceneScale -Stroke $stroke
  Draw-Hand -Graphics $Graphics -OffsetX $offsetX -OffsetY $offsetY -Scale $sceneScale -Stroke $stroke
}

function Save-Icon {
  param(
    [string]$Path,
    [int]$Size,
    [bool]$TransparentBackground = $false
  )

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  Set-HighQualityDrawing $graphics
  Draw-Scene -Graphics $graphics -Size $Size -TransparentBackground $TransparentBackground
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

  $graphics.Dispose()
  $bitmap.Dispose()
}

$assetsPath = Join-Path $PSScriptRoot "..\assets"

Save-Icon -Path (Join-Path $assetsPath "icon.png") -Size 1024
Save-Icon -Path (Join-Path $assetsPath "adaptive-icon.png") -Size 1024 -TransparentBackground $true
Save-Icon -Path (Join-Path $assetsPath "favicon.png") -Size 256
