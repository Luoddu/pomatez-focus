[CmdletBinding()]
param(
    [ValidateRange(1024, 1073741824)]
    [Int64]$MaxBlobBytes = 10485760,

    [ValidateRange(1, 10485760)]
    [Int64]$MaxAllowedBinaryBytes = 2097152,

    [AllowNull()]
    [AllowEmptyCollection()]
    [String[]]$WorkingTreePaths
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

$criticalContextPaths = @(
    "AGENTS.md",
    "CLAUDE.md",
    "CONTEXT_DIGEST.md",
    "IMPLEMENTATION_ROADMAP.md",
    "SYSTEM_MAPS.md",
    "decisions/ADR-0002-mvp-device-topology.md",
    "START_HERE.md"
)
$contextIndexRelativePath = ".context_digest_collect.json"

function Invoke-GitLines {
    param(
        [Parameter(Mandatory = $true)][String[]]$Arguments,
        [Switch]$AllowFailure
    )

    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $output = @(& git @Arguments 2>&1)
        $gitExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($gitExitCode -ne 0 -and -not $AllowFailure) {
        throw ("git {0} failed: {1}" -f ($Arguments -join " "), ($output -join "`n"))
    }
    return [PSCustomObject]@{
        ExitCode = $gitExitCode
        Lines = @($output | ForEach-Object { [String]$_ })
    }
}

function Get-GitBlobBytes {
    param([Parameter(Mandatory = $true)][ValidatePattern('^[0-9a-fA-F]{40,64}$')][String]$BlobId)

    $gitCommand = Get-Command git -ErrorAction Stop
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = New-Object System.Diagnostics.ProcessStartInfo
    $process.StartInfo.FileName = $gitCommand.Source
    $process.StartInfo.Arguments = "cat-file blob $BlobId"
    $process.StartInfo.WorkingDirectory = (Get-Location).Path
    $process.StartInfo.UseShellExecute = $false
    $process.StartInfo.CreateNoWindow = $true
    $process.StartInfo.RedirectStandardOutput = $true
    $process.StartInfo.RedirectStandardError = $true
    $memory = New-Object System.IO.MemoryStream
    try {
        if (-not $process.Start()) {
            throw "Could not start git cat-file."
        }
        $process.StandardOutput.BaseStream.CopyTo($memory)
        $errorText = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        if ($process.ExitCode -ne 0) {
            throw ("git cat-file failed: {0}" -f $errorText.Trim())
        }
        return ,([Byte[]]$memory.ToArray())
    }
    finally {
        $memory.Dispose()
        $process.Dispose()
    }
}

function Get-Sha256Hex {
    param([Parameter(Mandatory = $true)][AllowEmptyCollection()][Byte[]]$Bytes)

    $sha256 = [Security.Cryptography.SHA256]::Create()
    try {
        return ([BitConverter]::ToString($sha256.ComputeHash($Bytes))).Replace("-", "").ToLowerInvariant()
    }
    finally {
        $sha256.Dispose()
    }
}

function Get-ProspectiveCriticalBlobBytes {
    param([Parameter(Mandatory = $true)][String]$Path)

    # The Git index is the complete prospective commit tree: unchanged paths
    # are present with their HEAD blob, while staged deletions are absent.
    $blobResult = Invoke-GitLines -Arguments @(
        "rev-parse", "--verify", (":" + $Path)
    ) -AllowFailure
    if ($blobResult.ExitCode -ne 0 -or $blobResult.Lines.Count -eq 0) {
        throw ("Critical context file is missing from the prospective commit index: {0}" -f $Path)
    }
    return ,(Get-GitBlobBytes -BlobId $blobResult.Lines[-1].Trim())
}

function Test-CriticalContextIndex {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [String[]]$AllStagedPaths
    )

    $indexAtHead = Invoke-GitLines -Arguments @(
        "rev-parse", "--verify", ("HEAD:" + $contextIndexRelativePath)
    ) -AllowFailure
    $indexIsStaged = $AllStagedPaths -ccontains $contextIndexRelativePath
    $stagedCriticalPaths = @(
        $AllStagedPaths |
            Where-Object { $criticalContextPaths -ccontains ([String]$_) }
    )
    $gateIsEstablished = ($indexAtHead.ExitCode -eq 0 -or $indexIsStaged)
    $gateIsTriggered = ($indexIsStaged -or $stagedCriticalPaths.Count -gt 0)
    if (-not $gateIsEstablished -or -not $gateIsTriggered) {
        return
    }
    if (-not $indexIsStaged) {
        throw (
            "Critical context index must be staged atomically with every critical control-file change: {0}"
        ) -f $contextIndexRelativePath
    }

    $indexBlobResult = Invoke-GitLines -Arguments @(
        "rev-parse", "--verify", (":" + $contextIndexRelativePath)
    ) -AllowFailure
    if ($indexBlobResult.ExitCode -ne 0 -or $indexBlobResult.Lines.Count -eq 0) {
        throw ("Critical context index cannot be deleted: {0}" -f $contextIndexRelativePath)
    }
    $indexBytes = Get-GitBlobBytes -BlobId $indexBlobResult.Lines[-1].Trim()
    if (
        $indexBytes.Length -ge 3 -and
        $indexBytes[0] -eq 0xEF -and
        $indexBytes[1] -eq 0xBB -and
        $indexBytes[2] -eq 0xBF
    ) {
        throw "Critical context index must be strict UTF-8 without a byte-order mark."
    }
    try {
        $indexText = (New-Object Text.UTF8Encoding($false, $true)).GetString($indexBytes)
        $contextIndex = $indexText | ConvertFrom-Json -ErrorAction Stop
    }
    catch {
        throw ("Critical context index must be valid strict UTF-8 JSON: {0}" -f $_.Exception.Message)
    }
    if ($null -eq $contextIndex -or $contextIndex -is [Array]) {
        throw "Critical context index must contain one JSON object."
    }

    $allowedTopLevelProperties = @(
        "schema_version", "purpose", "task_id", "created_at", "hash_contract", "files"
    )
    $actualTopLevelProperties = @($contextIndex.PSObject.Properties.Name)
    $unexpectedTopLevelProperties = @(
        $actualTopLevelProperties |
            Where-Object { $allowedTopLevelProperties -cnotcontains ([String]$_) }
    )
    $missingTopLevelProperties = @(
        $allowedTopLevelProperties |
            Where-Object { $actualTopLevelProperties -cnotcontains ([String]$_) }
    )
    if (
        $actualTopLevelProperties.Count -ne $allowedTopLevelProperties.Count -or
        $unexpectedTopLevelProperties.Count -ne 0 -or
        $missingTopLevelProperties.Count -ne 0
    ) {
        throw "Critical context index must use exactly the approved six-property top-level schema."
    }
    if (
        $contextIndex.schema_version -isnot [Int32] -and
        $contextIndex.schema_version -isnot [Int64]
    ) {
        throw "Critical context index schema_version must be an integer."
    }
    if ([Int64]$contextIndex.schema_version -ne 2) {
        throw "Critical context index schema_version must be 2."
    }
    if (
        [String]$contextIndex.purpose -cne
        "cross-device verification of exactly seven shared control files"
    ) {
        throw "Critical context index purpose does not match the approved contract."
    }
    if ([String]$contextIndex.task_id -cnotmatch '^P[0-9]+-[A-Z][A-Z0-9]{1,7}-[0-9]{3}$') {
        throw "Critical context index task_id is invalid."
    }
    if (
        [String]$contextIndex.hash_contract -cne
        "sha256_first_mb contains the exact prospective Git blob SHA-256 after CRLF-to-LF normalization; every indexed file is smaller than 1 MiB"
    ) {
        throw "Critical context index hash_contract does not match the approved contract."
    }

    $entries = @($contextIndex.files)
    if ($entries.Count -ne $criticalContextPaths.Count) {
        throw ("Critical context index must contain exactly {0} file entries." -f $criticalContextPaths.Count)
    }
    $seenPaths = New-Object System.Collections.Generic.List[String]
    foreach ($entry in $entries) {
        if ($null -eq $entry -or $entry -is [Array]) {
            throw "Each critical context index file entry must be one JSON object."
        }
        $allowedEntryProperties = @("path", "size", "sha256_first_mb")
        $actualEntryProperties = @($entry.PSObject.Properties.Name)
        $unexpectedEntryProperties = @(
            $actualEntryProperties |
                Where-Object { $allowedEntryProperties -cnotcontains ([String]$_) }
        )
        $missingEntryProperties = @(
            $allowedEntryProperties |
                Where-Object { $actualEntryProperties -cnotcontains ([String]$_) }
        )
        if (
            $actualEntryProperties.Count -ne $allowedEntryProperties.Count -or
            $unexpectedEntryProperties.Count -ne 0 -or
            $missingEntryProperties.Count -ne 0
        ) {
            throw "Each critical context index file entry must use exactly path, size, and sha256_first_mb."
        }

        $path = [String]$entry.path
        if ($criticalContextPaths -cnotcontains $path) {
            throw ("Critical context index contains an unapproved path: {0}" -f $path)
        }
        if ($seenPaths.Contains($path)) {
            throw ("Critical context index contains a duplicate path: {0}" -f $path)
        }
        $seenPaths.Add($path)

        $expectedHash = [String]$entry.sha256_first_mb
        if ($expectedHash -cnotmatch '^[0-9a-f]{64}$') {
            throw ("Critical context index contains an invalid SHA-256 value: {0}" -f $path)
        }
        try {
            if ($entry.size -isnot [Int32] -and $entry.size -isnot [Int64]) {
                throw "size must be an integer"
            }
            $expectedSize = [Int64]$entry.size
        }
        catch {
            throw ("Critical context index contains an invalid size: {0}" -f $path)
        }
        if ($expectedSize -lt 0) {
            throw ("Critical context index contains a negative size: {0}" -f $path)
        }

        $prospectiveBytes = Get-ProspectiveCriticalBlobBytes -Path $path
        if ($prospectiveBytes.Length -ge 1048576) {
            throw ("Critical context file is 1 MiB or larger: {0}" -f $path)
        }
        $actualHash = Get-Sha256Hex -Bytes $prospectiveBytes
        if ($expectedSize -ne $prospectiveBytes.Length -or $expectedHash -cne $actualHash) {
            throw (
                "Critical context index does not match the prospective commit blob: {0}"
            ) -f $path
        }
    }
    foreach ($criticalPath in $criticalContextPaths) {
        if (-not $seenPaths.Contains($criticalPath)) {
            throw ("Critical context index is missing a required path: {0}" -f $criticalPath)
        }
    }
}

function Convert-BlobBytesToText {
    param([Parameter(Mandatory = $true)][Byte[]]$Bytes)

    try {
        $offset = 0
        $encodingName = "UTF-8"
        if ($Bytes.Length -ge 3 -and $Bytes[0] -eq 0xEF -and $Bytes[1] -eq 0xBB -and $Bytes[2] -eq 0xBF) {
            $encoding = New-Object System.Text.UTF8Encoding($false, $true)
            $offset = 3
            $encodingName = "UTF-8-BOM"
        }
        elseif ($Bytes.Length -ge 2 -and $Bytes[0] -eq 0xFF -and $Bytes[1] -eq 0xFE) {
            $encoding = New-Object System.Text.UnicodeEncoding($false, $true, $true)
            $offset = 2
            $encodingName = "UTF-16LE"
        }
        elseif ($Bytes.Length -ge 2 -and $Bytes[0] -eq 0xFE -and $Bytes[1] -eq 0xFF) {
            $encoding = New-Object System.Text.UnicodeEncoding($true, $true, $true)
            $offset = 2
            $encodingName = "UTF-16BE"
        }
        else {
            $encoding = New-Object System.Text.UTF8Encoding($false, $true)
        }

        $text = $encoding.GetString($Bytes, $offset, ($Bytes.Length - $offset))
        foreach ($character in $text.ToCharArray()) {
            $code = [Int32]$character
            if (($code -lt 32 -and $code -notin @(9, 10, 13)) -or $code -eq 127) {
                return [PSCustomObject]@{
                    IsText = $false
                    Text = $null
                    Encoding = $encodingName
                    Reason = ("disallowed control character U+{0:X4}" -f $code)
                }
            }
        }

        return [PSCustomObject]@{
            IsText = $true
            Text = $text
            Encoding = $encodingName
            Reason = $null
        }
    }
    catch [System.Text.DecoderFallbackException] {
        return [PSCustomObject]@{
            IsText = $false
            Text = $null
            Encoding = "unknown"
            Reason = "not strict UTF-8 or BOM-marked UTF-16 text"
        }
    }
}

function Get-StagedBlobId {
    param([Parameter(Mandatory = $true)][String]$Path)

    $result = Invoke-GitLines -Arguments @("rev-parse", "--verify", (":" + $Path))
    return $result.Lines[-1].Trim()
}

function Get-ExactBinaryAllowlist {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("Staged", "WorkingTree")]
        [String]$Source,

        [Parameter(Mandatory = $true)]
        [String]$RepositoryRoot
    )

    if ($Source -ceq "WorkingTree") {
        $attributePath = Join-Path $RepositoryRoot ".gitattributes"
        if (-not (Test-Path -LiteralPath $attributePath -PathType Leaf)) {
            return @()
        }
        $attributeBytes = [IO.File]::ReadAllBytes($attributePath)
    }
    else {
        $attributeResult = Invoke-GitLines -Arguments @("rev-parse", "--verify", ":.gitattributes") -AllowFailure
        if ($attributeResult.ExitCode -ne 0) {
            return @()
        }

        $attributeBlob = $attributeResult.Lines[-1].Trim()
        $attributeBytes = Get-GitBlobBytes -BlobId $attributeBlob
    }

    $decoded = Convert-BlobBytesToText -Bytes $attributeBytes
    if (-not $decoded.IsText) {
        throw ".gitattributes must be UTF-8 or BOM-marked UTF-16 text."
    }

    $allowed = New-Object System.Collections.Generic.List[String]
    foreach ($line in @($decoded.Text.Replace("`r`n", "`n").Replace("`r", "`n") -split "`n")) {
        $trimmed = $line.Trim()
        if ([String]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#")) {
            continue
        }
        if ($trimmed -notmatch '(?:^|\s)chengxing-binary-allow(?:\s|$)') {
            continue
        }

        $tokens = @($trimmed -split '\s+')
        $pattern = $tokens[0].Replace("\", "/")
        if ($pattern.StartsWith("/") -or $pattern -match '[*?\[\]\\]' -or $pattern.Contains("..") -or $pattern.Contains(":")) {
            throw ("Binary allowlist entries must use an exact repository-relative path, not a pattern: {0}" -f $pattern)
        }
        if ($tokens -notcontains "chengxing-binary-allow") {
            throw ("Binary allowlist attribute must be explicitly set, not assigned: {0}" -f $pattern)
        }
        if (-not $allowed.Contains($pattern)) {
            $allowed.Add($pattern)
        }
    }
    return @($allowed)
}

function Test-IsExactlyAllowedBinary {
    param(
        [Parameter(Mandatory = $true)][String]$Path,
        [Parameter(Mandatory = $true)][AllowEmptyCollection()][String[]]$AllowedPaths
    )

    foreach ($allowedPath in $AllowedPaths) {
        if ($Path -ceq $allowedPath) {
            return $true
        }
    }
    return $false
}

function Test-AllowedBinarySignature {
    param(
        [Parameter(Mandatory = $true)][String]$Path,
        [Parameter(Mandatory = $true)][Byte[]]$Bytes
    )

    $extension = [IO.Path]::GetExtension($Path).ToLowerInvariant()
    switch ($extension) {
        ".png" {
            return ($Bytes.Length -ge 8 -and $Bytes[0] -eq 0x89 -and $Bytes[1] -eq 0x50 -and $Bytes[2] -eq 0x4E -and $Bytes[3] -eq 0x47 -and $Bytes[4] -eq 0x0D -and $Bytes[5] -eq 0x0A -and $Bytes[6] -eq 0x1A -and $Bytes[7] -eq 0x0A)
        }
        { $_ -in @(".jpg", ".jpeg") } {
            return ($Bytes.Length -ge 3 -and $Bytes[0] -eq 0xFF -and $Bytes[1] -eq 0xD8 -and $Bytes[2] -eq 0xFF)
        }
        ".gif" {
            if ($Bytes.Length -lt 6) { return $false }
            $header = [Text.Encoding]::ASCII.GetString($Bytes, 0, 6)
            return ($header -in @("GIF87a", "GIF89a"))
        }
        ".webp" {
            return ($Bytes.Length -ge 12 -and [Text.Encoding]::ASCII.GetString($Bytes, 0, 4) -eq "RIFF" -and [Text.Encoding]::ASCII.GetString($Bytes, 8, 4) -eq "WEBP")
        }
        ".ico" {
            return ($Bytes.Length -ge 4 -and $Bytes[0] -eq 0 -and $Bytes[1] -eq 0 -and $Bytes[2] -eq 1 -and $Bytes[3] -eq 0)
        }
        default {
            return $false
        }
    }
}

function Test-SafeEnvironmentTemplate {
    param([Parameter(Mandatory = $true)][String]$Path)
    return $Path -match '(?i)(^|/)\.env\.(example|sample|template)$'
}

function Test-LearningDocumentBytes {
    param(
        [Parameter(Mandatory = $true)][AllowEmptyCollection()][Byte[]]$Bytes,
        [Parameter(Mandatory = $true)][String]$RepositoryRoot,
        [Parameter(Mandatory = $true)][String]$SourceLabel
    )

    if (
        $Bytes.Length -ge 3 -and
        $Bytes[0] -eq 0xEF -and
        $Bytes[1] -eq 0xBB -and
        $Bytes[2] -eq 0xBF
    ) {
        throw "Learning.md must be strict UTF-8 without a byte-order mark."
    }
    try {
        $learningText = (New-Object Text.UTF8Encoding($false, $true)).GetString($Bytes)
    }
    catch [Text.DecoderFallbackException] {
        throw "Learning.md must be strict UTF-8."
    }

    $validator = Join-Path $RepositoryRoot "scripts/validate-learning.ps1"
    if (-not (Test-Path -LiteralPath $validator -PathType Leaf)) {
        throw "scripts/validate-learning.ps1 is required when Learning.md is verified."
    }
    $evidenceSource = if ($SourceLabel.StartsWith("staged", [StringComparison]::Ordinal)) {
        "Staged"
    }
    else {
        "WorkingTree"
    }
    & $validator -Content $learningText -SourceLabel $SourceLabel -RepositoryRoot $RepositoryRoot -EvidenceSource $evidenceSource
}

function Test-RequiresBinaryPolicy {
    param([Parameter(Mandatory = $true)][String]$Path)

    # These formats are binary, containers, or executable payloads even when a
    # staged probe happens to contain only bytes that decode as UTF-8 text.
    $extension = [IO.Path]::GetExtension($Path).ToLowerInvariant()
    return $extension -in @(
        ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico",
        ".pdf",
        ".doc", ".docx", ".docm", ".dot", ".dotx", ".dotm",
        ".xls", ".xlsx", ".xlsm", ".xlsb", ".xlt", ".xltx", ".xltm",
        ".ppt", ".pptx", ".pptm", ".pot", ".potx", ".potm", ".pps", ".ppsx", ".ppsm",
        ".odt", ".ods", ".odp", ".vsd", ".vsdx", ".onepkg",
        ".zip", ".7z", ".rar", ".tar", ".gz", ".tgz", ".bz2", ".xz", ".cab",
        ".exe", ".dll", ".msi", ".com", ".scr"
    )
}

function Test-CandidateContent {
    param(
        [Parameter(Mandatory = $true)][String]$Path,
        [Parameter(Mandatory = $true)][AllowEmptyCollection()][Byte[]]$Bytes,
        [Parameter(Mandatory = $true)][AllowEmptyCollection()][String[]]$AllowedBinaryPaths,
        [Parameter(Mandatory = $true)][Object[]]$BlockedPathPatterns,
        [Parameter(Mandatory = $true)][Object[]]$SecretPatterns,
        [Parameter(Mandatory = $true)][ValidateSet("staged", "working-tree")][String]$SourceLabel
    )

    if ($Path.IndexOf("`n") -ge 0 -or $Path.IndexOf("`r") -ge 0) {
        throw ("Blocked unsafe file name containing a newline: {0}" -f $Path)
    }

    foreach ($rule in $BlockedPathPatterns) {
        if ((Test-SafeEnvironmentTemplate -Path $Path) -and $rule.Name -eq "environment secret") {
            continue
        }
        if ($Path -match $rule.Pattern) {
            throw ("Blocked {0} path ({1}): {2}" -f $SourceLabel, $rule.Name, $Path)
        }
    }

    [Int64]$blobSize = $Bytes.Length
    if ($blobSize -gt $MaxBlobBytes) {
        throw ("Blocked large {0} blob: {1} bytes in {2}; limit is {3} bytes." -f $SourceLabel, $blobSize, $Path, $MaxBlobBytes)
    }

    $requiresBinaryPolicy = Test-RequiresBinaryPolicy -Path $Path
    $decoded = Convert-BlobBytesToText -Bytes $Bytes
    if ($requiresBinaryPolicy -or -not $decoded.IsText) {
        $binaryReason = if ($requiresBinaryPolicy) {
            ("extension {0} requires binary policy" -f [IO.Path]::GetExtension($Path).ToLowerInvariant())
        }
        else {
            $decoded.Reason
        }
        if (-not (Test-IsExactlyAllowedBinary -Path $Path -AllowedPaths $AllowedBinaryPaths)) {
            throw ("Blocked {0} blob requiring binary policy or using unsupported encoding without an exact .gitattributes allowlist entry: {1} ({2})" -f $SourceLabel, $Path, $binaryReason)
        }
        if ($blobSize -gt $MaxAllowedBinaryBytes) {
            throw ("Blocked allowlisted binary larger than {0} bytes: {1}" -f $MaxAllowedBinaryBytes, $Path)
        }
        if (-not (Test-AllowedBinarySignature -Path $Path -Bytes $Bytes)) {
            throw ("Blocked allowlisted binary with an unsupported extension or invalid magic signature: {0}" -f $Path)
        }
        return
    }

    foreach ($rule in $SecretPatterns) {
        if ([Text.RegularExpressions.Regex]::IsMatch($decoded.Text, $rule.Pattern)) {
            throw ("Blocked possible secret ({0}) in {1} file: {2} [{3}]" -f $rule.Name, $SourceLabel, $Path, $decoded.Encoding)
        }
    }
}

$originalLocation = Get-Location
try {
    $scriptRepositoryCandidate = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
    Set-Location -LiteralPath $scriptRepositoryCandidate
    $insideResult = Invoke-GitLines -Arguments @("rev-parse", "--is-inside-work-tree")
    if ($insideResult.Lines[-1].Trim() -ne "true") {
        throw "Not inside a Git work tree."
    }
    $rootResult = Invoke-GitLines -Arguments @("rev-parse", "--show-toplevel")
    $repositoryRoot = [IO.Path]::GetFullPath($rootResult.Lines[-1].Trim())
    Set-Location -LiteralPath $repositoryRoot

    # Keep this script ASCII-only for Windows PowerShell 5.1. Decode the two
    # exact UTF-8 private reference names at runtime instead of embedding them.
    $strictUtf8 = New-Object Text.UTF8Encoding($false, $true)
    $privateReferenceDirectory = $strictUtf8.GetString([Convert]::FromBase64String("TmV4b3JhIOS9nOaImOaMh+aMpeWupA=="))
    $privateReferenceFile = $strictUtf8.GetString([Convert]::FromBase64String("5ZGo6Zi/5qWa55qE56Ca5pCt5bu655qE5oCd6Lev5ZKM5YW35L2T57uG6IqC5Y+C6ICDLm1k"))
    $blockedPathPatterns = @(
        @{ Name = "private reference directory"; Pattern = '(?i)(?:^|/)' + [Text.RegularExpressions.Regex]::Escape($privateReferenceDirectory) + '(?:/|$)' },
        @{ Name = "private reference file"; Pattern = '(?i)(?:^|/)' + [Text.RegularExpressions.Regex]::Escape($privateReferenceFile) + '$' },
        @{ Name = "environment secret"; Pattern = '(?i)(^|/)\.env(?:\..+)?$' },
        @{ Name = "secret directory"; Pattern = '(?i)(^|/)(\.secrets?|secrets?\.local)(/|$)' },
        @{ Name = "private credential"; Pattern = '(?i)(^|/)(id_rsa|id_ed25519|credentials\.local)(\.|$)' },
        @{ Name = "private key or keystore"; Pattern = '(?i)\.(pem|key|pfx|p12|jks|kdbx)$' },
        @{ Name = "SQLite rollback journal"; Pattern = '(?i)\.(db|sqlite|sqlite3)-journal$' },
        @{ Name = "live database"; Pattern = '(?i)\.(db|sqlite|sqlite3)(-wal|-shm)?$' },
        @{ Name = "database journal"; Pattern = '(?i)\.(wal|shm)$' },
        @{ Name = "runtime directory"; Pattern = '(?i)(^|/)(runtime|var|cache|caches|temp|tmp|logs?|models?|worker-jobs?)(/|$)' },
        @{ Name = "dependency or build directory"; Pattern = '(?i)(^|/)(node_modules|\.venv|venv|env|__pycache__|dist|build|target)(/|$)' },
        @{ Name = "Git bundle backup"; Pattern = '(?i)\.(bundle|bundle\.manifest\.json)$' },
        @{ Name = "machine-local component map"; Pattern = '(?i)(^|/)components\.local\.ya?ml$' }
    )

    $secretPatterns = @(
        @{ Name = "private-key block"; Pattern = '-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----' },
        @{ Name = "AWS access key"; Pattern = '(?<![A-Z0-9])AKIA[0-9A-Z]{16}(?![A-Z0-9])' },
        @{ Name = "GitHub token"; Pattern = '(?<![A-Za-z0-9])gh[pousr]_[A-Za-z0-9]{30,}' },
        @{ Name = "OpenAI-style token"; Pattern = '(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{20,}' },
        @{ Name = "bearer credential"; Pattern = '(?im)^\s*Authorization\s*:\s*Bearer\s+[A-Za-z0-9._~+/=-]{20,}\s*$' },
        @{ Name = "cookie credential"; Pattern = '(?im)^\s*Cookie\s*:\s*[A-Za-z0-9._~+/=; -]{20,}\s*$' },
        @{ Name = "credential assignment"; Pattern = '(?im)^\s*["'']?(?:api[_ -]?key|access[_ -]?token|auth[_ -]?token|password|passwd|client[_ -]?secret|secret[_ -]?access[_ -]?key)["'']?\s*[:=]\s*["'']?(?!(?:example|sample|dummy|placeholder|redacted|changeme|null|none)(?:["'']?\s*$))[A-Za-z0-9+/=_-]{20,}["'']?\s*$' },
        @{ Name = "JSON credential property"; Pattern = '(?im)["''](?:api[_ -]?key|access[_ -]?token|auth[_ -]?token|password|passwd|client[_ -]?secret|secret[_ -]?access[_ -]?key)["'']\s*:\s*["'']?(?!(?:example|sample|dummy|placeholder|redacted|changeme|null|none)["'']?\s*[,}])[A-Za-z0-9+/=_-]{20,}["'']?' },
        @{ Name = "credential in URL"; Pattern = '(?i)\b[a-z][a-z0-9+.-]*://[^\s/:@]{2,}:[^\s/@]{8,}@' }
    )

    $workingTreeMode = $PSBoundParameters.ContainsKey("WorkingTreePaths")
    if ($workingTreeMode) {
        if ($null -eq $WorkingTreePaths -or @($WorkingTreePaths).Count -eq 0) {
            throw "Working-tree verification requires at least one explicit path."
        }

        $rootPrefix = $repositoryRoot.TrimEnd("\", "/") + [IO.Path]::DirectorySeparatorChar
        $normalizedPaths = New-Object System.Collections.Generic.List[String]
        $workingTreeContent = New-Object System.Collections.Generic.List[Object]
        foreach ($rawPath in @($WorkingTreePaths)) {
            $path = ([String]$rawPath).Trim().Replace("\", "/")
            if ([String]::IsNullOrWhiteSpace($path) -or $path -in @(".", "./", "..", "../")) {
                throw "Each working-tree path must name one explicit file."
            }
            foreach ($character in $path.ToCharArray()) {
                $code = [Int32]$character
                if ($code -lt 32 -or $code -eq 127) {
                    throw ("Control characters are forbidden in working-tree paths: {0}" -f $rawPath)
                }
            }
            if ([IO.Path]::IsPathRooted([String]$rawPath) -or $path.Contains(":")) {
                throw ("Absolute paths and Git pathspec magic are forbidden: {0}" -f $rawPath)
            }
            if ($path -match '[*?\[\]]' -or $path.EndsWith("/")) {
                throw ("Wildcards and directory paths are forbidden: {0}" -f $rawPath)
            }

            $fullPath = [IO.Path]::GetFullPath((Join-Path $repositoryRoot $path))
            if (-not $fullPath.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
                throw ("Path escapes the repository: {0}" -f $rawPath)
            }
            $canonical = $fullPath.Substring($rootPrefix.Length).Replace("\", "/")
            if ($canonical -cne $path) {
                throw ("Path must be canonical and cannot contain dot segments or repeated separators: {0}" -f $rawPath)
            }
            if (Test-Path -LiteralPath $fullPath -PathType Container) {
                throw ("Directory verification is forbidden; list files individually: {0}" -f $rawPath)
            }
            if (-not $normalizedPaths.Contains($path)) {
                $normalizedPaths.Add($path)
            }
            if (Test-Path -LiteralPath $fullPath -PathType Leaf) {
                $item = Get-Item -LiteralPath $fullPath -Force
                if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
                    throw ("Blocked working-tree symbolic link or reparse-point file: {0}" -f $path)
                }
                $workingTreeContent.Add([PSCustomObject]@{
                    Path = $path
                    FullPath = $fullPath
                })
            }
            else {
                $tracked = Invoke-GitLines -Arguments @("ls-files", "--error-unmatch", "--", $path) -AllowFailure
                if ($tracked.ExitCode -ne 0) {
                    throw ("Path is neither a working-tree file nor a tracked deletion: {0}" -f $path)
                }
            }
        }

        $attributeSource = if ($normalizedPaths.Contains(".gitattributes")) { "WorkingTree" } else { "Staged" }
        $allowedBinaryPaths = @(Get-ExactBinaryAllowlist -Source $attributeSource -RepositoryRoot $repositoryRoot)
        foreach ($candidate in $workingTreeContent) {
            $bytes = [IO.File]::ReadAllBytes($candidate.FullPath)
            if ($candidate.Path -ceq "Learning.md") {
                Test-LearningDocumentBytes -Bytes $bytes -RepositoryRoot $repositoryRoot -SourceLabel "working-tree Learning.md"
            }
            Test-CandidateContent -Path $candidate.Path -Bytes $bytes -AllowedBinaryPaths $allowedBinaryPaths -BlockedPathPatterns $blockedPathPatterns -SecretPatterns $secretPatterns -SourceLabel "working-tree"
        }

        Write-Host ("Working-tree preflight passed: {0} explicit path(s), {1} content path(s), {2} exact binary allowlist path(s)." -f $normalizedPaths.Count, $workingTreeContent.Count, $allowedBinaryPaths.Count)
        return
    }

    $allStagedResult = Invoke-GitLines -Arguments @(
        "-c", "core.quotepath=false", "diff", "--cached", "--no-renames", "--name-only", "--"
    )
    $allStaged = @($allStagedResult.Lines | Where-Object { $_ -ne "" })
    if ($allStaged.Count -eq 0) {
        throw "No staged changes were found."
    }
    $normalizedAllStaged = @(
        $allStaged |
            ForEach-Object { ([String]$_).Replace("\", "/") }
    )
    Test-CriticalContextIndex -AllStagedPaths $normalizedAllStaged

    $contentResult = Invoke-GitLines -Arguments @(
        "-c", "core.quotepath=false", "diff", "--cached", "--no-renames", "--name-only", "--diff-filter=ACMRT", "--"
    )
    $contentPaths = @($contentResult.Lines | Where-Object { $_ -ne "" })
    $normalizedContentPaths = @($contentPaths | ForEach-Object { ([String]$_).Replace("\", "/") })
    if (
        $normalizedAllStaged -ccontains "Learning.md" -and
        $normalizedContentPaths -cnotcontains "Learning.md"
    ) {
        throw "Learning.md cannot be deleted or renamed; accepted Learning history is append-only."
    }
    $allowedBinaryPaths = @(Get-ExactBinaryAllowlist -Source "Staged" -RepositoryRoot $repositoryRoot)

    foreach ($rawPath in $contentPaths) {
        $path = $rawPath.Replace("\", "/")

        $stageResult = Invoke-GitLines -Arguments @("ls-files", "--stage", "--", $rawPath)
        $stageLine = $stageResult.Lines | Select-Object -First 1
        if ($stageLine -match '^120000\s') {
            throw ("Blocked Git symbolic link entry: {0}" -f $path)
        }
        if ($stageLine -match '^160000\s') {
            throw ("Blocked Git submodule entry; components require separate repositories and lock records: {0}" -f $path)
        }

        $blobId = Get-StagedBlobId -Path $rawPath
        $blobBytes = Get-GitBlobBytes -BlobId $blobId
        if ($path -ceq "Learning.md") {
            Test-LearningDocumentBytes -Bytes $blobBytes -RepositoryRoot $repositoryRoot -SourceLabel "staged Learning.md"
        }
        Test-CandidateContent -Path $path -Bytes $blobBytes -AllowedBinaryPaths $allowedBinaryPaths -BlockedPathPatterns $blockedPathPatterns -SecretPatterns $secretPatterns -SourceLabel "staged"
    }

    Write-Host ("Staged verification passed: {0} changed path(s), {1} content path(s), {2} exact binary allowlist path(s)." -f $allStaged.Count, $contentPaths.Count, $allowedBinaryPaths.Count)
    return
}
catch {
    throw ("STAGED VERIFICATION FAILED: {0}" -f $_.Exception.Message)
}
finally {
    Set-Location -LiteralPath $originalLocation
}
