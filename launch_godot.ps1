#Requires -Version 5.1
<#
    Universal launcher for "Escape From Girls".

    Finds a Godot 4 executable by itself, imports fresh assets when needed and
    starts the game - without asking the user to do anything.

    Search order for the engine:
        1. %GODOT_EXE% environment variable
        2. Portable copies bundled with the game (tools\)
        3. PATH
        4. Steam libraries (all library folders)
        5. Common install locations and drive roots (C:\, D:\, ...)
        6. Scoop / Chocolatey

    If nothing is found the official Godot build is downloaded once into
    tools\godot\ (verified against the release SHA-512 sums).

    Usage:
        powershell -ExecutionPolicy Bypass -File launch_godot.ps1
        powershell -ExecutionPolicy Bypass -File launch_godot.ps1 -Editor
        powershell -ExecutionPolicy Bypass -File launch_godot.ps1 -CheckOnly
#>

[CmdletBinding()]
param(
    [string]$ProjectRoot,
    [switch]$Editor,
    [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'

# Keep non-ASCII paths (e.g. Cyrillic usernames) readable in the console.
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

# --- Pinned engine build used for the automatic download -------------------
$GodotVersion  = '4.7.2'
$GodotChannel  = 'stable'
$ZipName       = 'Godot_v{0}-{1}_win64.exe.zip' -f $GodotVersion, $GodotChannel
$DownloadUrl   = 'https://github.com/godotengine/godot/releases/download/{0}-{1}/{2}' -f $GodotVersion, $GodotChannel, $ZipName
$ChecksumUrl   = 'https://github.com/godotengine/godot/releases/download/{0}-{1}/SHA512-SUMS.txt' -f $GodotVersion, $GodotChannel

$LogPath = Join-Path $env:TEMP 'escape_from_girls_launcher.log'

function Write-Log {
    param([string]$Message)
    $line = '{0}  {1}' -f (Get-Date -Format 'HH:mm:ss'), $Message
    Write-Host $line
    try { Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8 } catch { }
}

function Stop-WithError {
    param([string]$Message)
    Write-Log "ERROR: $Message"
    Write-Log "Full log: $LogPath"
    exit 1
}

if (-not $ProjectRoot) {
    if ($PSCommandPath) { $ProjectRoot = Split-Path -Parent $PSCommandPath }
    elseif ($MyInvocation.MyCommand.Path) { $ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path }
    else { $ProjectRoot = (Get-Location).Path }
}
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$ProjectDir  = Join-Path $ProjectRoot 'godot'

# --- Engine discovery ------------------------------------------------------

function ConvertTo-ArgumentString {
    param([string[]]$Arguments)
    $quoted = foreach ($argument in $Arguments) {
        if ($argument -match '[\s"]') { '"' + ($argument -replace '"', '\"') + '"' } else { $argument }
    }
    return ($quoted -join ' ')
}

function Get-VersionRank {
    param([string]$Path)
    $name = [System.IO.Path]::GetFileName($Path)
    if ($name -match '(\d+)\.(\d+)(?:\.(\d+))?') {
        $patch = '0'
        if ($Matches[3]) { $patch = $Matches[3] }
        return [version]('{0}.{1}.{2}' -f $Matches[1], $Matches[2], $patch)
    }
    return [version]'0.0.0'
}

function Test-GodotExecutable {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
    try {
        $stdout = Join-Path $env:TEMP ('efg_godot_version_{0}.txt' -f $PID)
        $stderr = $stdout + '.err'
        $process = Start-Process -FilePath $Path -ArgumentList '--version' -Wait -PassThru `
            -RedirectStandardOutput $stdout -RedirectStandardError $stderr
        if (-not $process -or $process.ExitCode -ne 0) { return $null }

        $raw = ''
        if (Test-Path -LiteralPath $stdout) { $raw = (Get-Content -LiteralPath $stdout -Raw -ErrorAction SilentlyContinue) }
        Remove-Item -LiteralPath $stdout, $stderr -Force -ErrorAction SilentlyContinue
        $raw = ([string]$raw).Trim()
        if ($raw -match '^(\d+)\.(\d+)(?:\.(\d+))?') {
            $patch = '0'
            if ($Matches[3]) { $patch = $Matches[3] }
            return [pscustomobject]@{
                Path    = $Path
                Version = [version]('{0}.{1}.{2}' -f $Matches[1], $Matches[2], $patch)
                Raw     = $raw
            }
        }
    } catch { }
    return $null
}

function Get-GodotCandidatePaths {
    $candidates = New-Object 'System.Collections.Generic.List[string]'

    # 1. Explicit override
    if ($env:GODOT_EXE) { $candidates.Add($env:GODOT_EXE) }

    # 2. Portable copies shipped with the game
    foreach ($relative in @('tools', 'godot\tools', 'bin')) {
        $directory = Join-Path $ProjectRoot $relative
        if (Test-Path -LiteralPath $directory) {
            Get-ChildItem -LiteralPath $directory -Filter 'Godot*.exe' -File -Recurse -Depth 2 -ErrorAction SilentlyContinue |
                ForEach-Object { $candidates.Add($_.FullName) }
        }
    }

    # 3. PATH
    foreach ($name in @('godot', 'godot4', 'Godot', 'Godot4')) {
        $command = Get-Command $name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($command) { $candidates.Add($command.Source) }
    }

    # 4. Steam libraries (all of them, not just the default one)
    $steamRoots = New-Object 'System.Collections.Generic.List[string]'
    foreach ($key in @('HKCU:\Software\Valve\Steam', 'HKLM:\SOFTWARE\WOW6432Node\Valve\Steam', 'HKLM:\SOFTWARE\Valve\Steam')) {
        try {
            $steamPath = (Get-ItemProperty -LiteralPath $key -ErrorAction Stop).SteamPath
            if ($steamPath) { $steamRoots.Add($steamPath) }
        } catch { }
    }
    foreach ($fallback in @("${env:ProgramFiles(x86)}\Steam", "$env:ProgramFiles\Steam")) {
        if ($fallback -and (Test-Path -LiteralPath $fallback)) { $steamRoots.Add($fallback) }
    }

    $libraryRoots = New-Object 'System.Collections.Generic.List[string]'
    foreach ($root in ($steamRoots | Select-Object -Unique)) {
        $libraryRoots.Add($root)
        $vdf = Join-Path $root 'steamapps\libraryfolders.vdf'
        if (Test-Path -LiteralPath $vdf) {
            foreach ($line in (Get-Content -LiteralPath $vdf -ErrorAction SilentlyContinue)) {
                if ($line -match '"path"\s+"(.+)"') {
                    $libraryRoots.Add(($Matches[1] -replace '\\\\', '\'))
                }
            }
        }
    }
    foreach ($library in ($libraryRoots | Select-Object -Unique)) {
        foreach ($folder in @('Godot Engine', 'Godot')) {
            $godotDirectory = Join-Path $library ('steamapps\common\' + $folder)
            if (Test-Path -LiteralPath $godotDirectory) {
                Get-ChildItem -LiteralPath $godotDirectory -Filter 'Godot*.exe' -File -Recurse -Depth 1 -ErrorAction SilentlyContinue |
                    ForEach-Object { $candidates.Add($_.FullName) }
            }
        }
    }

    # 5. Common install locations
    $commonDirectories = @(
        $env:ProgramFiles,
        ${env:ProgramFiles(x86)},
        (Join-Path $env:LOCALAPPDATA 'Programs'),
        $env:USERPROFILE,
        (Join-Path $env:USERPROFILE 'Downloads'),
        (Join-Path $env:USERPROFILE 'Desktop'),
        'C:\Services', 'C:\Godot', 'C:\Tools', 'C:\Apps', 'C:\Applications'
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

    foreach ($directory in ($commonDirectories | Select-Object -Unique)) {
        Get-ChildItem -LiteralPath $directory -Filter 'Godot*.exe' -File -ErrorAction SilentlyContinue |
            ForEach-Object { $candidates.Add($_.FullName) }
        Get-ChildItem -LiteralPath $directory -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -like 'Godot*' } |
            ForEach-Object {
                Get-ChildItem -LiteralPath $_.FullName -Filter 'Godot*.exe' -File -Recurse -Depth 1 -ErrorAction SilentlyContinue |
                    ForEach-Object { $candidates.Add($_.FullName) }
            }
    }

    # 6. Every fixed drive: root, Godot-like folders and Steam there
    foreach ($drive in [System.IO.DriveInfo]::GetDrives()) {
        if (-not $drive.IsReady -or $drive.DriveType -ne 'Fixed') { continue }
        $root = $drive.RootDirectory.FullName

        Get-ChildItem -LiteralPath $root -Filter 'Godot*.exe' -File -ErrorAction SilentlyContinue |
            ForEach-Object { $candidates.Add($_.FullName) }

        foreach ($folder in @('Godot', 'Godot Engine', 'Services', 'Tools', 'Apps', 'Games')) {
            $directory = Join-Path $root $folder
            if (Test-Path -LiteralPath $directory) {
                Get-ChildItem -LiteralPath $directory -Filter 'Godot*.exe' -File -Recurse -Depth 1 -ErrorAction SilentlyContinue |
                    ForEach-Object { $candidates.Add($_.FullName) }
            }
        }

        $steamDirectory = Join-Path $root 'steam\steamapps\common\Godot Engine'
        if (Test-Path -LiteralPath $steamDirectory) {
            Get-ChildItem -LiteralPath $steamDirectory -Filter 'Godot*.exe' -File -ErrorAction SilentlyContinue |
                ForEach-Object { $candidates.Add($_.FullName) }
        }
    }

    # 7. Scoop / Chocolatey
    foreach ($directory in @(
        (Join-Path $env:USERPROFILE 'scoop\apps\godot\current'),
        (Join-Path $env:USERPROFILE 'scoop\shims'),
        "$env:ProgramData\chocolatey\lib\godot\tools"
    )) {
        if (Test-Path -LiteralPath $directory) {
            Get-ChildItem -LiteralPath $directory -Filter 'Godot*.exe' -File -Recurse -Depth 1 -ErrorAction SilentlyContinue |
                ForEach-Object { $candidates.Add($_.FullName) }
        }
    }

    return $candidates
}

function Find-Godot {
    $candidates = Get-GodotCandidatePaths | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } |
        ForEach-Object { (Resolve-Path -LiteralPath $_).Path } | Select-Object -Unique

    # Prefer regular binaries over console wrappers, then newest version first.
    $ordered = $candidates | Sort-Object -Property `
        @{ Expression = { if ([System.IO.Path]::GetFileName($_) -match 'console\.exe$') { 1 } else { 0 } } },
        @{ Expression = { Get-VersionRank $_ }; Descending = $true }

    $checked = 0
    foreach ($candidate in $ordered) {
        $checked++
        if ($checked -gt 12) { break }
        $info = Test-GodotExecutable $candidate
        if ($info -and $info.Version.Major -ge 4) {
            Write-Log "Found Godot $($info.Version) at $($info.Path)"
            return $info
        }
    }
    return $null
}

# --- One-time automatic download ------------------------------------------

function Install-PortableGodot {
    $toolsDirectory = Join-Path $ProjectRoot 'tools\godot'
    New-Item -ItemType Directory -Force -Path $toolsDirectory | Out-Null
    $zipPath = Join-Path $toolsDirectory 'godot-portable.zip'

    if (-not $CheckOnly) {
        Write-Log "No Godot 4 installation found. Downloading Godot $GodotVersion $GodotChannel (about 60 MB, one time only)..."
    }

    $ProgressPreference = 'SilentlyContinue'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    try {
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $zipPath -UseBasicParsing
        $sums = (Invoke-WebRequest -Uri $ChecksumUrl -UseBasicParsing).Content
    } catch {
        if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue }
        Stop-WithError "Could not download Godot. Check the network connection or install Godot 4 manually. ($($_.Exception.Message))"
    }

    $expectedHash = $null
    foreach ($line in ([string]$sums -split "`n")) {
        if ($line -match ('^([0-9a-fA-F]{128})\s+\*?' + [regex]::Escape($ZipName) + '\s*$')) {
            $expectedHash = $Matches[1].ToLowerInvariant()
            break
        }
    }
    if ($expectedHash) {
        $actualHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA512).Hash.ToLowerInvariant()
        if ($actualHash -ne $expectedHash) {
            Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue
            Stop-WithError 'Downloaded Godot archive failed the SHA-512 check. Aborting for safety.'
        }
        Write-Log 'SHA-512 checksum verified.'
    } else {
        Write-Log 'Warning: no checksum published for this build, skipping verification.'
    }

    try {
        Expand-Archive -LiteralPath $zipPath -DestinationPath $toolsDirectory -Force
    } catch {
        Stop-WithError "Could not unpack Godot: $($_.Exception.Message)"
    }
    Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue

    $executable = Get-ChildItem -LiteralPath $toolsDirectory -Filter 'Godot*.exe' -File -Recurse -Depth 2 -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notmatch 'console' } | Select-Object -First 1
    if (-not $executable) { Stop-WithError 'The downloaded archive did not contain a Godot executable.' }

    Write-Log "Godot installed to $($executable.FullName)"
    return $executable.FullName
}

# --- Fresh asset detection ------------------------------------------------

function Test-ImportNeeded {
    param([string]$Directory)

    $importedDirectory = Join-Path $Directory '.godot\imported'
    if (-not (Test-Path -LiteralPath $importedDirectory)) { return $true }

    $importedStamp = (Get-Item -LiteralPath $importedDirectory).LastWriteTimeUtc
    $cacheRoot = [System.IO.Path]::Combine($Directory, '.godot')
    $patterns = @('*.png', '*.jpg', '*.jpeg', '*.webp', '*.svg', '*.tga', '*.bmp',
                  '*.ttf', '*.otf', '*.wav', '*.ogg', '*.mp3', '*.glb', '*.gltf',
                  '*.obj', '*.fbx', '*.import')

    $newer = Get-ChildItem -LiteralPath $Directory -Recurse -File -Include $patterns -ErrorAction SilentlyContinue |
        Where-Object { -not $_.FullName.StartsWith($cacheRoot, [System.StringComparison]::OrdinalIgnoreCase) } |
        Where-Object { $_.LastWriteTimeUtc -gt $importedStamp } |
        Select-Object -First 1

    return [bool]$newer
}

function Invoke-AssetImport {
    param([string]$GodotExe, [string]$Directory)

    Write-Log 'Importing assets (first run or new assets detected)...'
    $arguments = ConvertTo-ArgumentString @('--headless', '--path', $Directory, '--import')
    $process = Start-Process -FilePath $GodotExe -ArgumentList $arguments -WorkingDirectory $Directory -Wait -PassThru
    if (-not $process -or $process.ExitCode -ne 0) {
        $code = 'unknown'
        if ($process) { $code = $process.ExitCode }
        Stop-WithError "Asset import failed (exit code $code)."
    }
    Write-Log 'Asset import finished.'
}

# --- Main ------------------------------------------------------------------

Write-Log '=== Escape From Girls launcher ==='

if (-not (Test-Path -LiteralPath (Join-Path $ProjectDir 'project.godot'))) {
    Stop-WithError "project.godot was not found in $ProjectDir"
}

if ($env:GODOT_EXE -and -not (Test-Path -LiteralPath $env:GODOT_EXE)) {
    Write-Log "Warning: GODOT_EXE points to a missing file ($env:GODOT_EXE), ignoring it."
}

$godot = Find-Godot
if (-not $godot) {
    if ($CheckOnly) {
        Write-Log 'No Godot 4 installation found - a normal launch would download it now.'
        exit 0
    }
    $downloaded = Install-PortableGodot
    $godot = Test-GodotExecutable $downloaded
    if (-not $godot) { Stop-WithError 'The downloaded Godot executable could not be started.' }
}

$importNeeded = -not $Editor -and (Test-ImportNeeded $ProjectDir)

if ($CheckOnly) {
    Write-Log ("Engine      : Godot {0}" -f $godot.Version)
    Write-Log ("Executable  : {0}" -f $godot.Path)
    Write-Log ("Project     : {0}" -f $ProjectDir)
    if ($Editor) {
        Write-Log 'Mode        : editor'
    } else {
        Write-Log ("Mode        : game (asset import needed: {0})" -f $importNeeded)
    }
    exit 0
}

if ($importNeeded) { Invoke-AssetImport -GodotExe $godot.Path -Directory $ProjectDir }

if ($Editor) {
    $arguments = ConvertTo-ArgumentString @('-e', '--path', $ProjectDir)
    Write-Log 'Opening the project in the Godot editor...'
} else {
    $arguments = ConvertTo-ArgumentString @('--path', $ProjectDir)
    Write-Log 'Starting the game...'
}

$started = Start-Process -FilePath $godot.Path -ArgumentList $arguments -WorkingDirectory $ProjectDir -PassThru
if ($started) { Write-Log ("Godot started (PID {0})." -f $started.Id) }
exit 0
