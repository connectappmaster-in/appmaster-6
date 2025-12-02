# AppMaster Device Update Agent
# This script collects Windows Update information and sends it to AppMaster
# It also polls for and executes pending remote actions

# === CONFIGURATION ===
$API_ENDPOINT = "https://zxtpfrgsfuiwdppgiliv.supabase.co/functions/v1/ingest-device-updates"
$API_KEY = "6q^:I`0Zt!)acO1LrD1%LLFam4FDWn"  # Your device agent API key

# === FUNCTIONS ===

function Get-PendingUpdates {
    try {
        Write-Host "  Checking pending updates..." -ForegroundColor Gray
        $updateSession = New-Object -ComObject Microsoft.Update.Session
        $updateSearcher = $updateSession.CreateUpdateSearcher()
        $searchResult = $updateSearcher.Search("IsInstalled=0 and Type='Software'")
        
        $updates = @()
        foreach ($update in $searchResult.Updates) {
            $kbNumber = "Unknown"
            if ($update.KBArticleIDs.Count -gt 0) {
                $kbNumber = "KB" + $update.KBArticleIDs[0]
            }
            
            $severity = "Unknown"
            if ($update.MsrcSeverity) {
                $severity = $update.MsrcSeverity
            }
            
            $updates += @{
                kb_number = $kbNumber
                title = $update.Title
                severity = $severity
                size_mb = [math]::Round($update.MaxDownloadSize / 1MB, 2)
            }
        }
        Write-Host "  Found $($updates.Count) pending updates" -ForegroundColor Gray
        return $updates
    }
    catch {
        Write-Warning "Error getting pending updates: $_"
        return @()
    }
}

function Get-InstalledUpdates {
    try {
        Write-Host "  Checking installed updates..." -ForegroundColor Gray
        $updates = @()
        $hotfixes = Get-HotFix | Select-Object -First 50 | Sort-Object InstalledOn -Descending
        
        foreach ($hotfix in $hotfixes) {
            if ($hotfix.HotFixID -and $hotfix.InstalledOn) {
                $updates += @{
                    kb_number = $hotfix.HotFixID
                    title = $hotfix.Description
                    installed_date = $hotfix.InstalledOn.ToString("yyyy-MM-ddTHH:mm:ss")
                }
            }
        }
        Write-Host "  Found $($updates.Count) recently installed updates" -ForegroundColor Gray
        return $updates
    }
    catch {
        Write-Warning "Error getting installed updates: $_"
        return @()
    }
}

function Get-FailedUpdates {
    try {
        Write-Host "  Checking failed updates..." -ForegroundColor Gray
        $updates = @()
        $events = Get-WinEvent -FilterHashtable @{
            LogName = 'System'
            ProviderName = 'Microsoft-Windows-WindowsUpdateClient'
            ID = 20
        } -MaxEvents 10 -ErrorAction SilentlyContinue
        
        foreach ($event in $events) {
            if ($event.Message -match 'KB(\d+)') {
                $kbNumber = "KB" + $Matches[1]
                $updates += @{
                    kb_number = $kbNumber
                    title = "Failed update"
                    error_code = $event.Id.ToString()
                }
            }
        }
        Write-Host "  Found $($updates.Count) failed updates" -ForegroundColor Gray
        return $updates
    }
    catch {
        Write-Warning "Error getting failed updates: $_"
        return @()
    }
}

function Execute-RemoteAction {
    param (
        [Parameter(Mandatory=$true)]
        [hashtable]$Action
    )
    
    $result = @{
        action_id = $Action.id
        status = "completed"
        exit_code = 0
        output = ""
        error = $null
    }
    
    try {
        Write-Host "  Executing action: $($Action.action_type)" -ForegroundColor Cyan
        
        switch ($Action.action_type) {
            "run_command" {
                $command = $Action.action_payload.command
                if ($command) {
                    Write-Host "    Command: $command" -ForegroundColor Gray
                    $output = Invoke-Expression $command 2>&1 | Out-String
                    $result.output = $output
                    $result.exit_code = $LASTEXITCODE
                    if ($null -eq $result.exit_code) { $result.exit_code = 0 }
                }
            }
            
            "reboot" {
                Write-Host "    Scheduling reboot in 60 seconds..." -ForegroundColor Yellow
                $result.output = "Reboot scheduled"
                shutdown /r /t 60 /c "AppMaster remote reboot requested"
            }
            
            "shutdown" {
                Write-Host "    Scheduling shutdown in 60 seconds..." -ForegroundColor Yellow
                $result.output = "Shutdown scheduled"
                shutdown /s /t 60 /c "AppMaster remote shutdown requested"
            }
            
            "lock" {
                Write-Host "    Locking workstation..." -ForegroundColor Yellow
                rundll32.exe user32.dll,LockWorkStation
                $result.output = "Workstation locked"
            }
            
            "scan_updates" {
                Write-Host "    Triggering Windows Update scan..." -ForegroundColor Yellow
                $updateSession = New-Object -ComObject Microsoft.Update.Session
                $updateSearcher = $updateSession.CreateUpdateSearcher()
                $searchResult = $updateSearcher.Search("IsInstalled=0")
                $result.output = "Scan completed. Found $($searchResult.Updates.Count) updates."
            }
            
            "install_updates" {
                Write-Host "    Installing Windows Updates..." -ForegroundColor Yellow
                $updateSession = New-Object -ComObject Microsoft.Update.Session
                $updateSearcher = $updateSession.CreateUpdateSearcher()
                $searchResult = $updateSearcher.Search("IsInstalled=0")
                
                if ($searchResult.Updates.Count -eq 0) {
                    $result.output = "No updates to install"
                } else {
                    $updatesToInstall = New-Object -ComObject Microsoft.Update.UpdateColl
                    foreach ($update in $searchResult.Updates) {
                        if ($update.IsDownloaded) {
                            $updatesToInstall.Add($update) | Out-Null
                        }
                    }
                    
                    if ($updatesToInstall.Count -gt 0) {
                        $installer = $updateSession.CreateUpdateInstaller()
                        $installer.Updates = $updatesToInstall
                        $installResult = $installer.Install()
                        $result.output = "Installation completed. Result code: $($installResult.ResultCode)"
                        $result.exit_code = $installResult.ResultCode
                    } else {
                        # Download first
                        $downloader = $updateSession.CreateUpdateDownloader()
                        $downloader.Updates = $searchResult.Updates
                        $downloadResult = $downloader.Download()
                        $result.output = "Updates downloaded. Restart agent to install."
                    }
                }
            }
            
            "push_wallpaper" {
                $wallpaperUrl = $Action.action_payload.wallpaper_url
                if ($wallpaperUrl) {
                    Write-Host "    Setting wallpaper from: $wallpaperUrl" -ForegroundColor Yellow
                    $wallpaperPath = "$env:TEMP\appmaster_wallpaper.jpg"
                    Invoke-WebRequest -Uri $wallpaperUrl -OutFile $wallpaperPath -UseBasicParsing
                    
                    # Set wallpaper using SystemParametersInfo
                    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Wallpaper {
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
"@
                    [Wallpaper]::SystemParametersInfo(0x0014, 0, $wallpaperPath, 0x01 -bor 0x02) | Out-Null
                    $result.output = "Wallpaper set successfully"
                }
            }
            
            default {
                $result.output = "Unknown action type: $($Action.action_type)"
                $result.status = "failed"
            }
        }
        
        Write-Host "    Action completed successfully" -ForegroundColor Green
    }
    catch {
        $result.status = "failed"
        $result.error = $_.Exception.Message
        $result.exit_code = 1
        Write-Host "    Action failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    return $result
}

# === MAIN SCRIPT ===

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " AppMaster Device Update Agent" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Started at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# Collect device information
Write-Host "[1/4] Collecting device information..." -ForegroundColor Yellow
try {
    $computerInfo = Get-ComputerInfo
    $hostname = $env:COMPUTERNAME
    $serialNumber = (Get-CimInstance Win32_BIOS).SerialNumber
    $osVersion = $computerInfo.OSDisplayVersion
    $osBuild = $computerInfo.OSBuildNumber
    $lastBootTime = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToString("yyyy-MM-ddTHH:mm:ss")
    $ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" } | Select-Object -First 1).IPAddress

    Write-Host "  Hostname: $hostname" -ForegroundColor Gray
    Write-Host "  Serial Number: $serialNumber" -ForegroundColor Gray
    Write-Host "  OS Version: $osVersion (Build $osBuild)" -ForegroundColor Gray
    Write-Host "  IP Address: $ipAddress" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "ERROR: Failed to collect device information: $_" -ForegroundColor Red
    exit 1
}

# Collect update information
Write-Host "[2/4] Scanning for updates..." -ForegroundColor Yellow
$pendingUpdates = Get-PendingUpdates
$installedUpdates = Get-InstalledUpdates
$failedUpdates = Get-FailedUpdates

Write-Host ""
Write-Host "Update Summary:" -ForegroundColor White
Write-Host "  Pending: $($pendingUpdates.Count)" -ForegroundColor $(if ($pendingUpdates.Count -gt 0) { "Yellow" } else { "Green" })
Write-Host "  Installed: $($installedUpdates.Count)" -ForegroundColor Green
Write-Host "  Failed: $($failedUpdates.Count)" -ForegroundColor $(if ($failedUpdates.Count -gt 0) { "Red" } else { "Green" })
Write-Host ""

# Build payload
$payload = @{
    hostname = $hostname
    serial_number = $serialNumber
    os_version = $osVersion
    os_build = $osBuild
    last_boot_time = $lastBootTime
    ip_address = $ipAddress
    pending_updates = $pendingUpdates
    installed_updates = $installedUpdates
    failed_updates = $failedUpdates
    action_results = @()
}

# Send to AppMaster
Write-Host "[3/4] Sending data to AppMaster..." -ForegroundColor Yellow
Write-Host "  Endpoint: $API_ENDPOINT" -ForegroundColor Gray

try {
    $headers = @{
        "Authorization" = "Bearer $API_KEY"
        "Content-Type" = "application/json"
    }
    
    $jsonPayload = $payload | ConvertTo-Json -Depth 10
    $response = Invoke-RestMethod -Uri $API_ENDPOINT -Method Post -Headers $headers -Body $jsonPayload -TimeoutSec 30
    
    Write-Host ""
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "  Device ID: $($response.device_id)" -ForegroundColor Gray
    Write-Host "  Hostname: $($response.hostname)" -ForegroundColor Gray
    Write-Host "  Compliance: $($response.compliance_status)" -ForegroundColor $(if ($response.compliance_status -eq "compliant") { "Green" } else { "Red" })
    Write-Host "  Updates Processed: $($response.updates_processed)" -ForegroundColor Gray
    Write-Host ""
    
    # Check for pending actions
    if ($response.pending_actions -and $response.pending_actions.Count -gt 0) {
        Write-Host "[4/4] Processing $($response.pending_actions.Count) pending action(s)..." -ForegroundColor Yellow
        
        $actionResults = @()
        foreach ($action in $response.pending_actions) {
            $actionResult = Execute-RemoteAction -Action $action
            $actionResults += $actionResult
        }
        
        # Send action results back
        if ($actionResults.Count -gt 0) {
            Write-Host ""
            Write-Host "  Reporting action results..." -ForegroundColor Gray
            
            $resultPayload = @{
                hostname = $hostname
                os_version = $osVersion
                pending_updates = @()
                installed_updates = @()
                action_results = $actionResults
            }
            
            $resultJson = $resultPayload | ConvertTo-Json -Depth 10
            Invoke-RestMethod -Uri $API_ENDPOINT -Method Post -Headers $headers -Body $resultJson -TimeoutSec 30 | Out-Null
            
            Write-Host "  Action results reported successfully" -ForegroundColor Green
        }
    } else {
        Write-Host "[4/4] No pending actions" -ForegroundColor Gray
    }
}
catch {
    Write-Host ""
    Write-Host "ERROR: Failed to send data to AppMaster" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check if your API key is correct" -ForegroundColor Gray
    Write-Host "  2. Verify internet connectivity" -ForegroundColor Gray
    Write-Host "  3. Ensure PowerShell is running as Administrator" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
exit 0