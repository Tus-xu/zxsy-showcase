# Re-run all three independent verification scripts.
# Usage (from the repository workspace root):
#   powershell -NoProfile -ExecutionPolicy Bypass -File qa/student-showcase/math/scripts/run_all.ps1
#   pwsh -File qa/student-showcase/math/scripts/run_all.ps1            (PowerShell 7+ if installed)
#   ... -Python "C:\path\to\python.exe"                                (any Python 3.x)
# Requires Python 3.x with standard library only (math, fractions, itertools, collections, random).

param([string]$Python = "")

if (-not $Python) {
    $bundled = "C:\Users\徐超\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe"
    if (Get-Command python -ErrorAction SilentlyContinue) {
        $Python = "python"
    } elseif (Test-Path $bundled) {
        $Python = $bundled
    } else {
        Write-Error "Python 3 not found; pass -Python <path>"
        exit 1
    }
}

$env:PYTHONIOENCODING = "utf-8"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$failed = $false
foreach ($s in @("q1_hyperbola.py", "q2_prism.py", "q3_draw.py")) {
    Write-Output ("`n" + ("=" * 72))
    Write-Output "RUN $s  ($Python)"
    Write-Output ("=" * 72)
    & $Python (Join-Path $here $s)
    if ($LASTEXITCODE -ne 0) {
        Write-Error "script failed: $s (exit $LASTEXITCODE)"
        $failed = $true
    }
}
if ($failed) { exit 1 }
Write-Output "`nALL VERIFICATION SCRIPTS PASSED"