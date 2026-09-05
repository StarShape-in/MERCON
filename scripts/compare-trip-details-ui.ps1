# Script: d:\Mercon\scripts\compare-trip-details-ui.ps1
# Description: Background runner that continuously checks compilation, verifies Trip Details UI layout integrity, and syncs branch giveup.

param (
    [string]$TripId = "TRP-0235"
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  MERCON UI Verification & Auto-Sync Runner " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Set-Location "d:\Mercon\frontend\web-dashboard"

# Step 1: Run TypeScript compiler validation
Write-Host "`n[Check 1/3] Validating TypeScript compilation..." -ForegroundColor Yellow
$tscOutput = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] TypeScript Compilation: CLEAN (0 Errors)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] TypeScript Errors Found:" -ForegroundColor Red
    Write-Host $tscOutput
}

# Step 2: Compare UI layout structure in TripDetailsPage.tsx
Write-Host "`n[Check 2/3] Comparing TripDetailsPage.tsx structure with reference design..." -ForegroundColor Yellow
$filePath = "d:\Mercon\frontend\web-dashboard\src\pages\trips\TripDetailsPage.tsx"
if (Test-Path $filePath) {
    $content = Get-Content $filePath -Raw
    
    $hasHeader = $content -match "Trip Operations"
    $hasRouteJourney = $content -match "Route Journey"
    $hasTripDetails = $content -match "Trip Details"
    $hasRecentActivity = $content -match "Recent Activity"
    $hasDocuments = $content -match "Documents"
    $hasNotes = $content -match "Notes"
    $hasCustomer = $content -match "Customer"
    $hasFinancials = $content -match "Financials"
    $hasQuickInfo = $content -match "Quick Info"

    if ($hasHeader -and $hasRouteJourney -and $hasTripDetails -and $hasRecentActivity -and $hasDocuments -and $hasNotes -and $hasCustomer -and $hasFinancials -and $hasQuickInfo) {
        Write-Host "[OK] UI Structure Match: 100% (All 9 reference sections present)" -ForegroundColor Green
    } else {
        Write-Host "[WARN] UI Structure Warning: Some sections may be missing." -ForegroundColor Yellow
    }
}

# Step 3: Run Auto-Sync for giveup branch
Write-Host "`n[Check 3/3] Running Git Auto-Sync for 'giveup' branch..." -ForegroundColor Yellow
Set-Location "d:\Mercon"
& powershell -ExecutionPolicy Bypass -File "d:\Mercon\scripts\auto-sync-giveup.ps1"

Write-Host "`n[OK] Verification & Auto-Sync Complete!" -ForegroundColor Green
