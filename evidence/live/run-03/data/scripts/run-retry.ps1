# R03 采集重试包装：浏览器可能被并行代理清理或被页面渲染拖崩，故逐阶段重试直到出现 phase-*.ok 标记
$ErrorActionPreference = 'Continue'
$w = 'D:\zxsy-math-arena-showcase\.work\r03-data'
$env:PYTHONIOENCODING = 'utf-8'
$env:PYTHONUTF8 = '1'
$phases = @('library')
foreach ($ph in $phases) {
    $marker = Join-Path $w "phase-$ph.ok"
    for ($i = 1; $i -le 6; $i++) {
        if (Test-Path $marker) { break }
        $out = Join-Path $w "try-$ph-$i.out.log"
        Write-Output ("[{0}] try {1} phase {2}" -f (Get-Date -Format 'HH:mm:ss'), $i, $ph)
        python "$w\r03_capture.py" $ph *> $out
        $code = $LASTEXITCODE
        if (Test-Path $marker) { Write-Output ("[{0}] phase {1} OK" -f (Get-Date -Format 'HH:mm:ss'), $ph); break }
        Write-Output ("[{0}] phase {1} failed (exit={2}), retry in 10s" -f (Get-Date -Format 'HH:mm:ss'), $ph, $code)
        Start-Sleep -Seconds 10
    }
}
Write-Output ("[{0}] wrapper DONE" -f (Get-Date -Format 'HH:mm:ss'))
