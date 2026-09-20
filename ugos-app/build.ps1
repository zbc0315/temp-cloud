# ---------------------------------------------------------------------------
# Temp Cloud - UGOS Pro application build
#
# Produces the layout that `ugcli pack` expects:
#   rootfs_amd64/bin/tempcloud   static linux/amd64 backend
#   rootfs_common/www/           web UI served by the system web server
#   rootfs_common/icon.png       256x256 application icon
#
# Usage:
#   pwsh -File build.ps1
#   pwsh -File build.ps1 -SyncWeb          # re-seed src/web from the repo's public/ first
#   pwsh -File build.ps1 -GoExe /path/to/go -UgcliExe /path/to/ugcli
#
# Requirements: Go 1.26.x and ugcli. Nothing else - the icon generator and the
# frontend patcher are Go commands under src/cmd.
#
# Toolchain discovery order: -GoExe/-UgcliExe parameter, then the TEMPCLOUD_GO /
# UGCLI environment variables, then PATH.
# ---------------------------------------------------------------------------
[CmdletBinding()]
param(
    # Go 1.26 is a deliberate choice, not an oversight.
    #
    # UGOS Pro ships /etc/systemd/system.conf with
    #     DefaultEnvironment="GODEBUG=tlskyber=0"
    # so every systemd service inherits it. Go 1.27 removed the tlskyber
    # setting, and a *removed* GODEBUG set to a non-default value makes the
    # runtime abort before main() runs:
    #     fatal error: removed GODEBUG "tlskyber" set to old value "0"
    # (https://go.dev/doc/godebug#go-124, https://github.com/golang/go/issues/75316)
    # Go 1.26 is the last release that still accepts the setting, so a binary
    # built with it runs on UGOS Pro with no system modification at all.
    # Prefer a 1.26.x toolchain; other versions may build but will not start.
    [string]$GoExe,
    [string]$UgcliExe,
    [switch]$SyncWeb
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Src = Join-Path $Root "src"

function Step($Message) { Write-Host "`n=== $Message ===" -ForegroundColor Cyan }

function Resolve-Tool {
    param(
        [string]$Explicit,
        [string]$EnvVarName,
        [string]$Command,
        [string]$Hint
    )
    if ($Explicit) {
        if (-not (Test-Path $Explicit)) { throw "path not found: $Explicit" }
        return $Explicit
    }
    if ($EnvVarName) {
        # Dynamic names need the .NET API; $env:$name is not valid PowerShell.
        $fromEnv = [Environment]::GetEnvironmentVariable($EnvVarName)
        if ($fromEnv) {
            if (-not (Test-Path $fromEnv)) {
                throw "`$$EnvVarName points to a missing path: $fromEnv"
            }
            return $fromEnv
        }
    }
    $found = Get-Command $Command -ErrorAction SilentlyContinue
    if ($found) { return $found.Source }
    throw "Cannot find '$Command'. $Hint"
}

$GoExe = Resolve-Tool -Explicit $GoExe -EnvVarName "TEMPCLOUD_GO" -Command "go" `
    -Hint "Install Go 1.26.x and put it on PATH, or pass -GoExe / set TEMPCLOUD_GO."
$UgcliExe = Resolve-Tool -Explicit $UgcliExe -EnvVarName "UGCLI" -Command "ugcli" `
    -Hint "Download ugcli from https://developer.ugnas.com/en/doc/tools/ugcli.html, or pass -UgcliExe / set UGCLI."

Step "0/7 toolchain"
& $GoExe version
& $UgcliExe --version
$goVersion = (& $GoExe version) -replace '^go version go([0-9]+\.[0-9]+).*', '$1'
if ($goVersion -notlike "1.26*") {
    Write-Host "  WARNING: Go $goVersion is not 1.26.x." -ForegroundColor Yellow
    Write-Host "  Go 1.27+ binaries abort on UGOS Pro because of GODEBUG=tlskyber=0." -ForegroundColor Yellow
    Write-Host "  See the comment above the -GoExe parameter." -ForegroundColor Yellow
}

if ($SyncWeb) {
    Step "1/7 re-seed src/web from the upstream public/ frontend"
    $upstream = Join-Path (Split-Path $Root -Parent) "public"
    if (-not (Test-Path (Join-Path $upstream "app.js"))) {
        throw "upstream frontend not found at $upstream (expected index.html, app.js, styles.css)"
    }
    Push-Location $Src
    try {
        & $GoExe run ./cmd/syncweb -src $upstream -dst (Join-Path $Src "web")
        if ($LASTEXITCODE -ne 0) { throw "syncweb failed" }
    }
    finally { Pop-Location }
} else {
    Step "1/7 web UI (using committed src/web; pass -SyncWeb to re-seed)"
    Get-ChildItem (Join-Path $Src "web") -File | ForEach-Object {
        Write-Host ("  {0}  {1:N0} B" -f $_.Name, $_.Length)
    }
}

Step "2/7 privacy policy -> in-app copy and published copy"
$privacySrc = Join-Path $Root "privacy\privacy.html"
if (-not (Test-Path $privacySrc)) { throw "privacy policy not found: $privacySrc" }

# The UGREEN review rules require the policy shown inside the application to
# stay consistent with the published one, so both are copied from this single
# source and then compared byte for byte.
$privacyInApp = Join-Path $Src "web\privacy.html"
Copy-Item $privacySrc $privacyInApp -Force

# GitHub Pages serves the repository's /docs directory, which is where the
# HTTPS link referenced by project.yaml resolves from.
$repoRoot = Split-Path $Root -Parent
$docsDir = Join-Path $repoRoot "docs"
$privacyPublished = $null
if (Test-Path (Join-Path $repoRoot ".git")) {
    New-Item -ItemType Directory -Force -Path $docsDir | Out-Null
    $privacyPublished = Join-Path $docsDir "privacy.html"
    Copy-Item $privacySrc $privacyPublished -Force
} else {
    Write-Host "  not inside a git checkout; skipping the published copy" -ForegroundColor Yellow
}

$hashInApp = (Get-FileHash $privacyInApp -Algorithm SHA256).Hash
Write-Host ("  in-app    {0}  {1:N0} B  {2}" -f $privacyInApp, (Get-Item $privacyInApp).Length, $hashInApp)
if ($privacyPublished) {
    $hashPublished = (Get-FileHash $privacyPublished -Algorithm SHA256).Hash
    Write-Host ("  published {0}  {1:N0} B  {2}" -f $privacyPublished, (Get-Item $privacyPublished).Length, $hashPublished)
    if ($hashInApp -ne $hashPublished) { throw "privacy policy copies differ; they must be identical" }
    Write-Host "  both copies identical" -ForegroundColor Green
}

Step "3/7 gofmt + go vet"
Push-Location $Src
try {
    $unformatted = & $GoExe fmt ./...
    if ($unformatted) { Write-Host "reformatted: $unformatted" }
    & $GoExe vet ./...
    if ($LASTEXITCODE -ne 0) { throw "go vet failed" }
}
finally { Pop-Location }

Step "4/7 build linux/amd64 backend"
$env:GOOS = "linux"; $env:GOARCH = "amd64"; $env:CGO_ENABLED = "0"
$binDir = Join-Path $Root "rootfs_amd64\bin"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null
$binPath = Join-Path $binDir "tempcloud"
Push-Location $Src
try {
    & $GoExe build -trimpath -ldflags "-s -w" -o $binPath .
    if ($LASTEXITCODE -ne 0) { throw "go build failed" }
}
finally { Pop-Location }
Remove-Item Env:GOOS, Env:GOARCH, Env:CGO_ENABLED -ErrorAction SilentlyContinue
Write-Host ("  {0}  {1:N1} KiB" -f $binPath, ((Get-Item $binPath).Length / 1KB))

Step "5/7 sync web UI into rootfs_common/www"
$www = Join-Path $Root "rootfs_common\www"
if (Test-Path $www) { Remove-Item $www -Recurse -Force }
New-Item -ItemType Directory -Force -Path $www | Out-Null
Copy-Item (Join-Path $Src "web\*") $www -Recurse -Force
Get-ChildItem $www -Recurse -File | ForEach-Object {
    Write-Host ("  {0}  {1:N0} B" -f $_.Name, $_.Length)
}

Step "6/7 generate application icon"
Push-Location $Src
try {
    & $GoExe run ./cmd/makeicon -out (Join-Path $Root "rootfs_common\icon.png")
    if ($LASTEXITCODE -ne 0) { throw "icon generation failed" }
}
finally { Pop-Location }

Step "7/7 ugcli check"
Push-Location $Root
try {
    & $UgcliExe check
    if ($LASTEXITCODE -ne 0) { throw "ugcli check failed" }
}
finally { Pop-Location }

Write-Host "`nBuild finished." -ForegroundColor Green
Write-Host "Pack on Linux (UPK packaging must run on Linux to keep Unix permission bits):"
Write-Host "  cp -r `"$Root`" ~/ugbuild && cd ~/ugbuild/$(Split-Path $Root -Leaf)"
Write-Host "  find . -type d -exec chmod 0755 {} + && find . -type f -exec chmod 0644 {} +"
Write-Host "  chmod 0755 rootfs_amd64/bin/tempcloud"
Write-Host "  ugcli pack --arch amd64 --build 1"
