param([string]$InputDeck = 'SIH2026_IPsec_Sentinel_Final.pptx')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$output = Join-Path $root 'rendered_slides'
New-Item -ItemType Directory -Force $output | Out-Null
$app = New-Object -ComObject PowerPoint.Application
try {
  $deck = $app.Presentations.Open((Join-Path $root $InputDeck), $true, $false, $false)
  $issues = @()
  foreach ($slide in $deck.Slides) {
    $slide.Export((Join-Path $output ('slide_{0:D2}.png' -f $slide.SlideIndex)), 'PNG', 1920, 1080)
    foreach ($shape in $slide.Shapes) {
      if ($shape.HasTextFrame -and $shape.TextFrame.HasText) {
        $bound = $shape.TextFrame2.TextRange.BoundHeight
        if ($bound -gt ($shape.Height + 3)) {
          $issues += [PSCustomObject]@{slide=$slide.SlideIndex;shape=$shape.Name;boxHeight=$shape.Height;textHeight=$bound;text=$shape.TextFrame.TextRange.Text}
        }
      }
    }
  }
  ConvertTo-Json -InputObject @($issues) -Depth 4 | Set-Content (Join-Path $PSScriptRoot 'evidence/text_bounds.json')
  $deck.Close()
} finally { $app.Quit() }
Write-Output "Rendered 14 slides. Text overflow candidates: $($issues.Count)"
