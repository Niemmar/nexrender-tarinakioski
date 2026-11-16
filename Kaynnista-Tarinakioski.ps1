
$ErrorActionPreference = "Stop"

$projectDir = $PSScriptRoot
$appDir = Join-Path $projectDir "tarinakioski-lomake"
$serverFile = Join-Path $appDir "server\index.js"
$frontendFile = Join-Path $appDir "dist\index.html"
$logDir = Join-Path $projectDir "logs"

$url = "http://127.0.0.1:3001"
$healthUrl = "$url/api/health"

function Test-Tarinakioski {
    try {
        $response = Invoke-RestMethod `
            -Uri $healthUrl `
            -TimeoutSec 2 `
            -ErrorAction Stop

        return (
            $response.ok -eq $true -and
            $response.service -eq "tarinakioski"
        )
    }
    catch {
        return $false
    }
}

try {
    if (-not (Test-Path $serverFile)) {
        throw "Server file not found: $serverFile"
    }

    if (-not (Test-Path $frontendFile)) {
        throw "Production build missing. Run npm run build."
    }

    $node = Get-Command node.exe -ErrorAction Stop

    if (Test-Tarinakioski) {
        Write-Host "Tarinakioski is already running."
    }
    else {
        Write-Host "Starting Tarinakioski..."

        New-Item -ItemType Directory `
            -Path $logDir -Force | Out-Null

        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

        $stdoutLog = Join-Path $logDir "server-$timestamp.log"
        $stderrLog = Join-Path $logDir "server-$timestamp-error.log"

        Start-Process `
            -FilePath $node.Source `
            -ArgumentList "server/index.js" `
            -WorkingDirectory $appDir `
            -WindowStyle Hidden `
            -RedirectStandardOutput $stdoutLog `
            -RedirectStandardError $stderrLog | Out-Null

        $started = $false

        for ($i = 0; $i -lt 40; $i++) {
            if (Test-Tarinakioski) {
                $started = $true
                break
            }

            Start-Sleep -Milliseconds 500
        }

        if (-not $started) {
            throw "Server did not start. Check logs: $logDir"
        }
    }

    Write-Host "Opening Tarinakioski..."
    Start-Process $url

    exit 0
}
catch {
    Write-Host ""
    Write-Host "Tarinakioski startup failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
