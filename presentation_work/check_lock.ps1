$a = [System.Runtime.InteropServices.Marshal]::GetActiveObject('PowerPoint.Application')
foreach ($d in $a.Presentations) { Write-Output ($d.FullName + ' | ReadOnly=' + $d.ReadOnly + ' | Saved=' + $d.Saved) }
