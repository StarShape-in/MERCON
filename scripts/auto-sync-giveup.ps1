# PowerShell Auto-Sync Runner for MERCON 'giveup' branch
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -eq "giveup") {
    Write-Host "[Auto-Sync] Syncing 'giveup' branch..."
    git fetch origin giveup
    git pull --rebase origin giveup
    git push origin giveup
    Write-Host "[Auto-Sync] Successfully synced and pushed 'giveup' branch!"
} else {
    Write-Host "[Auto-Sync] Currently on branch '$branch'. Switch to 'giveup' to auto-sync."
}
