Add-Type -AssemblyName System.Drawing
$canvas = New-Object System.Drawing.Bitmap 256,256
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.Clear([System.Drawing.Color]::FromArgb(37,40,32))
$font = New-Object System.Drawing.Font 'Georgia',156,([System.Drawing.FontStyle]::Regular),([System.Drawing.GraphicsUnit]::Pixel)
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(243,241,232))
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
$graphics.DrawString('M',$font,$brush,(New-Object System.Drawing.RectangleF 0,0,256,250),$format)
$icon = [System.Drawing.Icon]::FromHandle($canvas.GetHicon())
$iconStream = [System.IO.File]::Create((Join-Path $PSScriptRoot '..\admin_windows\windows\runner\resources\app_icon.ico'))
$icon.Save($iconStream)
$iconStream.Dispose(); $icon.Dispose(); $graphics.Dispose(); $font.Dispose(); $brush.Dispose(); $canvas.Dispose()
