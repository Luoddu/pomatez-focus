[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^P[0-9]+-[A-Z][A-Z0-9]{1,7}-[0-9]{3}$')]
    [String]$TaskId,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z0-9/][A-Za-z0-9._/@:-]{0,127}$')]
    [String]$AgentId,

    [Parameter(Mandatory = $true)]
    [ValidateSet("feat", "fix", "docs", "test", "refactor", "perf", "build", "ci", "chore", "revert")]
    [String]$Type,

    [ValidatePattern('^[a-z0-9][a-z0-9._/-]{0,40}$')]
    [String]$Scope,

    [Parameter(Mandatory = $true)]
    [String]$Summary,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [String[]]$Paths,

    [String]$Body,
    [String[]]$Evidence,
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [String[]]$Validation,
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [String]$LearningReview,
    [Switch]$Checkpoint,

    [String]$LearningSourceRef,
    [String[]]$LearningDispositions = @(),

    [String]$RoadmapPath
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
    param([Parameter(Mandatory = $true)][String[]]$Arguments, [Switch]$AllowFailure)

    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $output = @(& git @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw ("git {0} failed: {1}" -f ($Arguments -join " "), ($output -join "`n"))
    }
    return [PSCustomObject]@{
        ExitCode = $exitCode
        Lines = @($output | ForEach-Object { [String]$_ })
    }
}

function Normalize-ExplicitPath {
    param(
        [Parameter(Mandatory = $true)][String]$Candidate,
        [Parameter(Mandatory = $true)][String]$RepositoryRoot
    )

    $value = $Candidate.Trim().Replace("\", "/")
    if ([String]::IsNullOrWhiteSpace($value) -or $value -in @(".", "./", "..", "../")) {
        throw "Each -Paths value must name one explicit file, not a directory or repository-wide path."
    }
    foreach ($character in $value.ToCharArray()) {
        $code = [Int32]$character
        if ($code -lt 32 -or $code -eq 127) {
            throw ("Control characters are forbidden in explicit paths: {0}" -f $Candidate)
        }
    }
    if ([IO.Path]::IsPathRooted($Candidate) -or $value.Contains(":")) {
        throw ("Absolute paths and Git pathspec magic are forbidden: {0}" -f $Candidate)
    }
    if ($value -match '[*?\[\]]' -or $value.EndsWith("/")) {
        throw ("Wildcards and directory paths are forbidden: {0}" -f $Candidate)
    }

    $full = [IO.Path]::GetFullPath((Join-Path $RepositoryRoot $value))
    $rootPrefix = $RepositoryRoot.TrimEnd("\", "/") + [IO.Path]::DirectorySeparatorChar
    if (-not $full.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw ("Path escapes the repository: {0}" -f $Candidate)
    }
    $canonical = $full.Substring($rootPrefix.Length).Replace("\", "/")
    if ($canonical -cne $value) {
        throw ("Path must be canonical and cannot contain dot segments or repeated separators: {0}" -f $Candidate)
    }
    if (Test-Path -LiteralPath $full -PathType Container) {
        throw ("Directory staging is forbidden; list files individually: {0}" -f $Candidate)
    }
    return $value
}

$temporaryMessage = $null
$indexSnapshot = $null
$indexPath = $null
$indexSnapshotCaptured = $false
$indexOriginallyExisted = $false
$commitCompleted = $false
$originalLocation = Get-Location
try {
    if ($Summary.IndexOf("`n") -ge 0 -or $Summary.IndexOf("`r") -ge 0) {
        throw "Summary must be a single line."
    }
    if ($Summary.Trim().Length -lt 3 -or $Summary.Trim().Length -gt 80) {
        throw "Summary must contain 3 to 80 characters."
    }
    if ($LearningReview.IndexOf("`n") -ge 0 -or $LearningReview.IndexOf("`r") -ge 0) {
        throw "LearningReview must be a single line."
    }
    $cleanLearningReview = $LearningReview.Trim()
    if ($cleanLearningReview.Length -lt 12 -or $cleanLearningReview.Length -gt 500) {
        throw "LearningReview must contain 12 to 500 characters."
    }

    $scriptRepositoryCandidate = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
    Set-Location -LiteralPath $scriptRepositoryCandidate
    $rootResult = Invoke-GitLines -Arguments @("rev-parse", "--show-toplevel")
    $repositoryRoot = $rootResult.Lines[-1].Trim()
    if ([String]::IsNullOrWhiteSpace($repositoryRoot)) {
        throw "Could not resolve the Git repository root."
    }
    $repositoryRoot = [IO.Path]::GetFullPath($repositoryRoot)
    Set-Location -LiteralPath $repositoryRoot

    $branchResult = Invoke-GitLines -Arguments @("symbolic-ref", "--quiet", "--short", "HEAD") -AllowFailure
    if ($branchResult.ExitCode -ne 0 -or $branchResult.Lines.Count -eq 0) {
        throw "Task commits require a named main or task branch."
    }
    $currentBranch = $branchResult.Lines[-1].Trim()
    $taskIdLower = $TaskId.ToLowerInvariant()
    $taskBranchPattern = '^task/{0}-[a-z0-9][a-z0-9._/-]*$' -f [Text.RegularExpressions.Regex]::Escape($taskIdLower)
    if ($currentBranch -cne "main" -and $currentBranch -notmatch $taskBranchPattern) {
        throw ("Branch must be main or task/{0}-<slug>; found {1}." -f $taskIdLower, $currentBranch)
    }

    $resolvedLearningSourceCommit = $null
    $normalizedLearningDispositions = New-Object System.Collections.Generic.List[String]
    if ([String]::IsNullOrWhiteSpace($LearningSourceRef)) {
        if (@($LearningDispositions | Where-Object { -not [String]::IsNullOrWhiteSpace($_) }).Count -gt 0) {
            throw "LearningDispositions require LearningSourceRef."
        }
    }
    else {
        if ($currentBranch -cne "main") {
            throw "LearningSourceRef is only valid for a /root coordinator integration commit on main."
        }
        $cleanSourceRef = $LearningSourceRef.Trim()
        if (
            $cleanSourceRef.Length -gt 200 -or
            $cleanSourceRef -notmatch '^[A-Za-z0-9][A-Za-z0-9._/-]*$'
        ) {
            throw "LearningSourceRef must be one local commit or ref name without revision operators."
        }
        $sourceProbe = Invoke-GitLines -Arguments @(
            "rev-parse", "--verify", ($cleanSourceRef + "^{commit}")
        ) -AllowFailure
        if ($sourceProbe.ExitCode -ne 0 -or $sourceProbe.Lines.Count -ne 1) {
            throw "LearningSourceRef does not resolve to exactly one local commit."
        }
        $resolvedLearningSourceCommit = $sourceProbe.Lines[-1].Trim().ToLowerInvariant()
        if ($resolvedLearningSourceCommit -notmatch '^[0-9a-f]{40}$') {
            throw "LearningSourceRef did not resolve to a full immutable commit ID."
        }

        foreach ($item in @($LearningDispositions)) {
            if ([String]::IsNullOrWhiteSpace($item)) { continue }
            $cleanItem = $item.Replace("`r", " ").Replace("`n", " ").Trim()
            if ($cleanItem.Length -gt 700) {
                throw "LearningDisposition exceeds 700 characters."
            }
            $normalizedLearningDispositions.Add($cleanItem)
        }
    }

    if ([String]::IsNullOrWhiteSpace($RoadmapPath)) {
        $resolvedRoadmapPath = Join-Path $repositoryRoot "IMPLEMENTATION_ROADMAP.md"
    }
    elseif ([IO.Path]::IsPathRooted($RoadmapPath)) {
        $resolvedRoadmapPath = [IO.Path]::GetFullPath($RoadmapPath)
    }
    else {
        $resolvedRoadmapPath = [IO.Path]::GetFullPath((Join-Path $repositoryRoot $RoadmapPath))
    }
    if (-not (Test-Path -LiteralPath $resolvedRoadmapPath -PathType Leaf)) {
        throw "IMPLEMENTATION_ROADMAP.md is required to validate TaskId. Independent modules must pass -RoadmapPath explicitly."
    }
    $roadmapText = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $resolvedRoadmapPath), (New-Object Text.UTF8Encoding($false, $true)))
    $taskPattern = '(?<![A-Z0-9-]){0}(?![A-Z0-9-])' -f [Text.RegularExpressions.Regex]::Escape($TaskId)
    if (-not [Text.RegularExpressions.Regex]::IsMatch($roadmapText, $taskPattern)) {
        throw ("TaskId is not registered in IMPLEMENTATION_ROADMAP.md: {0}" -f $TaskId)
    }

    if ($currentBranch -ceq "main") {
        $isCoordinator = ($AgentId -ceq "/root" -or $AgentId.StartsWith("/root/", [StringComparison]::Ordinal))
        $headProbe = Invoke-GitLines -Arguments @("rev-parse", "--verify", "HEAD") -AllowFailure
        $remoteProbe = Invoke-GitLines -Arguments @("remote")
        $isControlledBootstrap = (
            $AgentId -ceq "chengxing-bootstrap" -and
            $headProbe.ExitCode -ne 0 -and
            @($remoteProbe.Lines | Where-Object { $_ -ne "" }).Count -eq 0
        )
        if (-not $isCoordinator -and -not $isControlledBootstrap) {
            throw "Only /root coordination agents may commit on main; chengxing-bootstrap is allowed only for the first no-remote module commit."
        }
    }

    $explicitPaths = New-Object System.Collections.Generic.List[String]
    foreach ($candidate in $Paths) {
        $normalized = Normalize-ExplicitPath -Candidate $candidate -RepositoryRoot $repositoryRoot
        if (-not $explicitPaths.Contains($normalized)) {
            $explicitPaths.Add($normalized)
        }
    }
    if ($explicitPaths.Count -eq 0) {
        throw "At least one explicit path is required."
    }

    $contextIndexAtHead = Invoke-GitLines -Arguments @(
        "rev-parse", "--verify", ("HEAD:" + $contextIndexRelativePath)
    ) -AllowFailure
    $contextIndexGateEstablished = (
        $contextIndexAtHead.ExitCode -eq 0 -or
        $explicitPaths.Contains($contextIndexRelativePath)
    )
    $selectedCriticalPaths = @(
        $explicitPaths |
            Where-Object { $criticalContextPaths -ccontains ([String]$_) }
    )
    if (
        $contextIndexGateEstablished -and
        $selectedCriticalPaths.Count -gt 0 -and
        -not $explicitPaths.Contains($contextIndexRelativePath)
    ) {
        throw (
            "Critical control files and {0} must be committed atomically. " +
            "Refresh the index after all critical-file edits, then include it in -Paths. Selected critical file(s): {1}"
        ) -f $contextIndexRelativePath, ($selectedCriticalPaths -join ", ")
    }

    foreach ($path in $explicitPaths) {
        $fullPath = Join-Path $repositoryRoot $path
        if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
            $tracked = Invoke-GitLines -Arguments @("ls-files", "--error-unmatch", "--", $path) -AllowFailure
            if ($tracked.ExitCode -ne 0) {
                throw ("Path is neither a file nor a tracked deletion: {0}" -f $path)
            }
        }
    }

    $alreadyStagedResult = Invoke-GitLines -Arguments @(
        "-c", "core.quotepath=false", "diff", "--cached", "--no-renames", "--name-only", "--"
    )
    $alreadyStaged = @($alreadyStagedResult.Lines | Where-Object { $_ -ne "" } | ForEach-Object { $_.Replace("\", "/") })
    foreach ($path in $alreadyStaged) {
        if (-not $explicitPaths.Contains($path)) {
            throw ("Unrelated path is already staged: {0}. Unstage it before using task-commit.ps1." -f $path)
        }
    }

    $verifyScript = Join-Path $repositoryRoot "scripts/verify-staged.ps1"
    if (-not (Test-Path -LiteralPath $verifyScript -PathType Leaf)) {
        throw "scripts/verify-staged.ps1 is missing."
    }

    $indexPathResult = Invoke-GitLines -Arguments @("rev-parse", "--git-path", "index")
    $indexPath = $indexPathResult.Lines[-1].Trim()
    if (-not [IO.Path]::IsPathRooted($indexPath)) {
        $indexPath = [IO.Path]::GetFullPath((Join-Path $repositoryRoot $indexPath))
    }
    if (Test-Path -LiteralPath ($indexPath + ".lock")) {
        throw "The Git index is locked; another Git process may be active."
    }
    $indexOriginallyExisted = Test-Path -LiteralPath $indexPath -PathType Leaf
    if ($indexOriginallyExisted) {
        $indexSnapshot = [IO.Path]::GetTempFileName()
        [IO.File]::Copy($indexPath, $indexSnapshot, $true)
    }
    $indexSnapshotCaptured = $true

    # Scan the intended working-tree bytes before git add can write any new
    # object. The staged scan below remains a second gate for drift or bypass.
    $explicitPathArray = @($explicitPaths | ForEach-Object { [String]$_ })
    & $verifyScript -WorkingTreePaths $explicitPathArray

    foreach ($path in $explicitPaths) {
        $null = Invoke-GitLines -Arguments @("add", "--", $path)
    }

    $stagedResult = Invoke-GitLines -Arguments @(
        "-c", "core.quotepath=false", "diff", "--cached", "--no-renames", "--name-only", "--"
    )
    $staged = @($stagedResult.Lines | Where-Object { $_ -ne "" } | ForEach-Object { $_.Replace("\", "/") })
    if ($staged.Count -eq 0) {
        throw "The explicit paths produced no staged changes."
    }
    foreach ($path in $staged) {
        if (-not $explicitPaths.Contains($path)) {
            throw ("Staging escaped the explicit path set: {0}" -f $path)
        }
    }

    & $verifyScript

    $header = if ([String]::IsNullOrWhiteSpace($Scope)) {
        "{0}: {1}" -f $Type, $Summary.Trim()
    }
    else {
        "{0}({1}): {2}" -f $Type, $Scope, $Summary.Trim()
    }

    $messageLines = New-Object System.Collections.Generic.List[String]
    $messageLines.Add($header)
    $messageLines.Add("")
    if (-not [String]::IsNullOrWhiteSpace($Body)) {
        $messageLines.Add($Body.Trim())
        $messageLines.Add("")
    }
    $messageLines.Add("Task-ID: {0}" -f $TaskId)
    $messageLines.Add("Agent-ID: {0}" -f $AgentId)
    $messageLines.Add("Checkpoint: {0}" -f $(if ($Checkpoint) { "true" } else { "false" }))
    $messageLines.Add("Learning-Review: {0}" -f $cleanLearningReview)
    if ($null -ne $resolvedLearningSourceCommit) {
        $messageLines.Add("Learning-Source-Commit: {0}" -f $resolvedLearningSourceCommit)
        foreach ($item in $normalizedLearningDispositions) {
            $messageLines.Add("Learning-Disposition: {0}" -f $item)
        }
    }
    $validValidationCount = 0
    foreach ($item in @($Validation)) {
        if (-not [String]::IsNullOrWhiteSpace($item)) {
            $cleanValidation = $item.Replace("`r", " ").Replace("`n", " ").Trim()
            $messageLines.Add("Validation: {0}" -f $cleanValidation)
            $validValidationCount++
        }
    }
    if ($validValidationCount -eq 0) {
        throw "At least one non-empty -Validation item is required."
    }
    foreach ($item in @($Evidence)) {
        if (-not [String]::IsNullOrWhiteSpace($item)) {
            $cleanEvidence = $item.Replace("`r", " ").Replace("`n", " ").Trim()
            $messageLines.Add("Evidence: {0}" -f $cleanEvidence)
        }
    }

    $temporaryMessage = [IO.Path]::GetTempFileName()
    [IO.File]::WriteAllText(
        $temporaryMessage,
        ([String]::Join("`n", $messageLines) + "`n"),
        (New-Object Text.UTF8Encoding($false))
    )

    $messageValidator = Join-Path $repositoryRoot "scripts/validate-commit-message.ps1"
    & $messageValidator -CommitMessageFile $temporaryMessage

    $commitResult = Invoke-GitLines -Arguments @("commit", "--no-gpg-sign", "-F", $temporaryMessage)
    $commitCompleted = $true
    $headResult = Invoke-GitLines -Arguments @("rev-parse", "HEAD")
    Write-Host ("Local task commit created: {0}" -f $headResult.Lines[-1].Trim())
    Write-Host "No push was attempted."
    return
}
catch {
    $failureMessage = $_.Exception.Message
    if (-not $commitCompleted -and $indexSnapshotCaptured -and $null -ne $indexPath) {
        try {
            if ($indexOriginallyExisted) {
                [IO.File]::Copy($indexSnapshot, $indexPath, $true)
            }
            elseif (Test-Path -LiteralPath $indexPath -PathType Leaf) {
                Remove-Item -LiteralPath $indexPath -Force
            }
            $failureMessage = $failureMessage + " The Git index was restored to its pre-command state."
        }
        catch {
            $failureMessage = $failureMessage + " CRITICAL: restoring the Git index failed: " + $_.Exception.Message
        }
    }
    throw ("TASK COMMIT FAILED: {0}" -f $failureMessage)
}
finally {
    Set-Location -LiteralPath $originalLocation
    if ($null -ne $temporaryMessage -and (Test-Path -LiteralPath $temporaryMessage)) {
        Remove-Item -LiteralPath $temporaryMessage -Force -ErrorAction SilentlyContinue
    }
    if ($null -ne $indexSnapshot -and (Test-Path -LiteralPath $indexSnapshot)) {
        Remove-Item -LiteralPath $indexSnapshot -Force -ErrorAction SilentlyContinue
    }
}
