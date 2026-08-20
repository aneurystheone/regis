# Lighthouse Audit Script for REGIS PWA
# Runs performance audit and saves report

param(
    [string]$Url = "http://localhost:3000",
    [string]$OutputDir = "lighthouse-reports"
)

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  REGIS Lighthouse Audit Tool  " -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if lighthouse is installed
$lighthouse = Get-Command lighthouse -ErrorAction SilentlyContinue
if (-not $lighthouse) {
    Write-Host "Lighthouse not found. Installing globally..." -ForegroundColor Yellow
    npm install -g lighthouse
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install Lighthouse" -ForegroundColor Red
        exit 1
    }
}

# Create output directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# Generate timestamp for report
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$reportPath = Join-Path $OutputDir "lighthouse-report_$timestamp.html"

Write-Host "Running Lighthouse audit on: $Url" -ForegroundColor Green
Write-Host "Report will be saved to: $reportPath" -ForegroundColor Gray
Write-Host ""
Write-Host "This may take 30-60 seconds..." -ForegroundColor Yellow
Write-Host ""

# Run Lighthouse
lighthouse $Url --output html --output-path $reportPath --only-categories=performance, pwa, accessibility, best-practices --chrome-flags="--headless"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Audit complete!" -ForegroundColor Green
    Write-Host "Report saved: $reportPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Open the HTML report in your browser" -ForegroundColor White
    Write-Host "  2. Check scores against Phase I Exit Criteria:" -ForegroundColor White
    Write-Host "     - Performance: Must be 95+" -ForegroundColor White
    Write-Host "     - PWA: Should be 100" -ForegroundColor White
    Write-Host "  3. If Performance below 90, fix Opportunities section" -ForegroundColor White
    Write-Host "  4. If PWA below 100, fix PWA Optimized checklist" -ForegroundColor White
    Write-Host "  5. Document results in docs/EMERGENCY_PLAN.md" -ForegroundColor White
    Write-Host ""
    
    # Try to open report
    Start-Process $reportPath
}
else {
    Write-Host ""
    Write-Host "Audit failed!" -ForegroundColor Red
    Write-Host "  Make sure dev server is running on $Url" -ForegroundColor Yellow
    Write-Host "  Try running manually: lighthouse $Url --view" -ForegroundColor White
    exit 1
}
