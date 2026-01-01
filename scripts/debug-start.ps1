
$ErrorActionPreference = "Continue"
$LogFile = "$PSScriptRoot\..\debug-start.log"
$Port = 1420
$Url = "http://localhost:$Port"

# Initialize logging
Start-Transcript -Path $LogFile -Force

Write-Host "[Start-Script] Checking environment for EasyFormatter UI..."

# Function to check port availability
function Test-PortAvailability {
    param([int]$Port)
    Write-Host "[Start-Script] Checking port $Port..."
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        Write-Host "[Start-Script] Port $Port is currently in use by PID: $($conns.OwningProcess)"
        return $conns
    }
    return $null
}

# Function to validate if the process is our Vite server
function Test-IsViteServer {
    try {
        $resp = Invoke-WebRequest -Uri $Url -TimeoutSec 2 -UseBasicParsing -Method Head
        if ($resp.StatusCode -eq 200) {
            # Try to fetch root to see if it's vite
            $content = (Invoke-WebRequest -Uri $Url -TimeoutSec 2 -UseBasicParsing).Content
            if ($content -match '@vite/client' -or $content -match 'vite') {
                return $true
            }
        }
    } catch {
        Write-Host "[Start-Script] Port is listening but HTTP check failed: $_"
    }
    return $false
}

# Main Logic
$existingConn = Test-PortAvailability -Port $Port

if ($existingConn) {
    $isVite = Test-IsViteServer
    
    if ($isVite) {
        Write-Host "[Start-Script] Found existing Vite instance. Reusing it."
        Stop-Transcript
        exit 0
    } else {
        Write-Warning "[Start-Script] Port $Port is blocked by an unknown process (PID: $($existingConn.OwningProcess)). Killing it..."
        try {
            Stop-Process -Id $existingConn.OwningProcess -Force -ErrorAction Stop
            Start-Sleep -Seconds 1
            
            # Double check
            if (Test-PortAvailability -Port $Port) {
                Write-Error "[Start-Script] Failed to release port $Port. Please manually kill the process."
                exit 1
            }
            Write-Host "[Start-Script] Port released successfully."
        } catch {
            Write-Error "[Start-Script] Error killing process: $_"
            exit 1
        }
    }
}

Write-Host "[Start-Script] Starting Vite server..."
Write-Host "[Start-Script] Running: npm run dev --prefix ui"

# Run npm run dev
# We use cmd /c to ensure proper execution and signal handling
# We explicitly check for exit code
try {
    # Using specific command to allow output streaming
    # Note: This will block until npm exits. This is INTENTIONAL for Tauri dev command.
    # Tauri will poll the URL in parallel.
    cmd /c "npm run dev --prefix ui"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "[Start-Script] Vite exited with error code: $LASTEXITCODE"
        exit $LASTEXITCODE
    }
} catch {
    Write-Error "[Start-Script] Critical error starting Vite: $_"
    exit 1
}

Stop-Transcript
