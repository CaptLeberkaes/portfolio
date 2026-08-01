<#
.SYNOPSIS
  Bereitet ein einzelnes Foto fuer die Website auf.

  Erzeugt aus einer Quelldatei zwei Bilder in
  EndurensohnTours_forServer/assets/img:
    <name>.jpg        -> Breite 1800 px  (Vollbild)
    <name>-thumb.jpg  -> Breite  900 px  (Galerie / Vorschau)

  Das Bild wird NUR verkleinert, niemals beschnitten - das
  Seitenverhaeltnis des Originals bleibt exakt erhalten. Bilder,
  die schmaler als die Zielbreite sind, werden nicht hochskaliert.

  ALLE Metadaten (EXIF, GPS-Standort, Kameramodell, Aufnahmezeit,
  Copyright-Felder ...) werden entfernt: Es werden nur die Pixel in
  ein frisches, leeres Bitmap gezeichnet und dieses gespeichert -
  die Metadaten des Originals wandern nie mit ins Ergebnis.

.EXAMPLE
  # Vollstaendig interaktiv (fragt nach Datei und Name):
  .\bild-vorbereiten.ps1

.EXAMPLE
  # Datei direkt angeben, nur noch nach dem Namen fragen:
  .\bild-vorbereiten.ps1 -Source "C:\Fotos\DSC1234.jpg"

.EXAMPLE
  # Ganz ohne Rueckfragen:
  .\bild-vorbereiten.ps1 -Source "C:\Fotos\DSC1234.jpg" -Name balkan-pass
#>

param(
  [string]$Source,
  [string]$Name,
  [string]$OutDir     = (Join-Path $PSScriptRoot "EndurensohnTours_forServer\assets\img"),
  [int]   $FullWidth  = 1800,
  [int]   $ThumbWidth = 900,
  [int]   $Quality    = 82
)

Add-Type -AssemblyName System.Drawing

# --- 1) Quelldatei bestimmen -------------------------------------------------
if (-not $Source) {
  $Source = Read-Host "Pfad zum Foto (Datei hierher ziehen und Enter)"
}
$Source = $Source.Trim().Trim('"')
if (-not (Test-Path -LiteralPath $Source)) {
  Write-Error "Datei nicht gefunden: $Source"
  exit 1
}

# --- 2) Zielnamen bestimmen + aufraeumen -------------------------------------
if (-not $Name) {
  $default = [IO.Path]::GetFileNameWithoutExtension($Source)
  $Name = Read-Host "Name fuers Bild (Enter = Dateiname '$default' uebernehmen)"
}
# Leer gelassen? -> aktuellen Dateinamen der Quelle uebernehmen
if ([string]::IsNullOrWhiteSpace($Name)) {
  $Name = [IO.Path]::GetFileNameWithoutExtension($Source)
}
$Name = $Name.Trim().ToLower()
$Name = $Name -replace 'ä','ae' -replace 'ö','oe' -replace 'ü','ue' -replace 'ß','ss'
$Name = $Name -replace '[^a-z0-9\-]+','-' -replace '-+','-' -replace '(^-|-$)',''
if ([string]::IsNullOrWhiteSpace($Name)) {
  Write-Error "Ungueltiger Name (auch der Dateiname ergibt keinen gueltigen Namen)."
  exit 1
}

if (-not (Test-Path $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

$full  = Join-Path $OutDir "$Name.jpg"
$thumb = Join-Path $OutDir "$Name-thumb.jpg"

# --- 3) Ueberschreib-Schutz --------------------------------------------------
foreach ($f in @($full, $thumb)) {
  if (Test-Path $f) {
    $ans = Read-Host "$([IO.Path]::GetFileName($f)) existiert bereits. Ueberschreiben? (j/N)"
    if ($ans -notmatch '^(j|y)') { Write-Host "Abgebrochen." ; exit }
  }
}

# --- JPEG-Encoder mit Qualitaetsstufe ----------------------------------------
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
             Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)

# --- EXIF-Ausrichtung anwenden (Handyfotos stehen sonst quer) ----------------
function Apply-Exif([System.Drawing.Image]$img) {
  $orientId = 0x0112
  if ($img.PropertyIdList -contains $orientId) {
    switch ($img.GetPropertyItem($orientId).Value[0]) {
      3 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
      6 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone)  }
      8 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
    }
    $img.RemovePropertyItem($orientId)
  }
}

# --- Kernfunktion: auf Zielbreite skalieren und speichern --------------------
function Save-Resized([string]$src, [int]$targetWidth, [string]$dest) {
  $orig = [System.Drawing.Image]::FromFile($src)
  try {
    Apply-Exif $orig
    $w = [Math]::Min($targetWidth, $orig.Width)              # nie hochskalieren
    $h = [int][Math]::Round($orig.Height * ($w / $orig.Width))

    # Frisches, leeres Bitmap -> traegt KEINE Metadaten des Originals.
    # Wir kopieren nur die Pixel hinein, deshalb ist das Ergebnis EXIF-/GPS-frei.
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    try {
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $g.DrawImage($orig, 0, 0, $w, $h)
      $g.Dispose()
      $bmp.Save($dest, $jpegCodec, $encParams)
    } finally { $bmp.Dispose() }
  } finally { $orig.Dispose() }

  $kb = [Math]::Round((Get-Item $dest).Length / 1KB)
  Write-Host ("  {0,-28} {1,5} px   {2,5} KB" -f (Split-Path $dest -Leaf), $w, $kb)
}

# --- Los -----------------------------------------------------------------
Write-Host ""
Write-Host "Verarbeite: $Source"
Save-Resized $Source $FullWidth  $full
Save-Resized $Source $ThumbWidth $thumb

Write-Host ""
Write-Host "Fertig. Einbinden im HTML z. B. mit:" -ForegroundColor Green
Write-Host "  <img src=`"assets/img/$Name.jpg`" alt=`"...`" loading=`"lazy`" />"
