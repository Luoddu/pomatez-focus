[CmdletBinding(DefaultParameterSetName = "Path")]
param(
    [Parameter(Mandatory = $true, ParameterSetName = "Path")]
    [String]$Path,

    [Parameter(Mandatory = $true, ParameterSetName = "Content")]
    [AllowEmptyString()]
    [String]$Content,

    [Parameter(ParameterSetName = "Content")]
    [String]$SourceLabel = "Learning.md",

    [String]$RepositoryRoot,

    [ValidateSet("WorkingTree", "Staged")]
    [String]$EvidenceSource = "WorkingTree"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

function Get-StrictUtf8Text {
    param([Parameter(Mandatory = $true)][String]$FilePath)

    if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
        throw ("Learning document does not exist: {0}" -f $FilePath)
    }
    $bytes = [IO.File]::ReadAllBytes($FilePath)
    if (
        $bytes.Length -ge 3 -and
        $bytes[0] -eq 0xEF -and
        $bytes[1] -eq 0xBB -and
        $bytes[2] -eq 0xBF
    ) {
        throw "Learning.md must be strict UTF-8 without a byte-order mark."
    }
    try {
        return (New-Object Text.UTF8Encoding($false, $true)).GetString($bytes)
    }
    catch [Text.DecoderFallbackException] {
        throw "Learning.md must be strict UTF-8."
    }
}

function Get-ExactlyOneField {
    param(
        [Parameter(Mandatory = $true)][AllowEmptyString()][String[]]$Lines,
        [Parameter(Mandatory = $true)][String]$Name,
        [Parameter(Mandatory = $true)][String]$EntryId
    )

    $prefix = "- {0}:" -f $Name
    $matches = @($Lines | Where-Object { $_.StartsWith($prefix, [StringComparison]::Ordinal) })
    if ($matches.Count -ne 1) {
        throw ("{0} must contain exactly one {1} field." -f $EntryId, $Name)
    }
    $value = $matches[0].Substring($prefix.Length).Trim()
    if ([String]::IsNullOrWhiteSpace($value)) {
        throw ("{0} field is empty in {1}." -f $Name, $EntryId)
    }
    return $value
}

function Invoke-GitReadOnly {
    param(
        [Parameter(Mandatory = $true)][String]$WorkingDirectory,
        [Parameter(Mandatory = $true)][String[]]$Arguments,
        [Switch]$AllowFailure
    )

    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $output = @(& git -C $WorkingDirectory @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw ("git {0} failed while validating Learning.md." -f ($Arguments -join " "))
    }
    return [PSCustomObject]@{
        ExitCode = $exitCode
        Lines = @($output | ForEach-Object { [String]$_ })
    }
}

function Get-LearningEntryBlocks {
    param([Parameter(Mandatory = $true)][AllowEmptyString()][String]$Document)

    $matches = [Text.RegularExpressions.Regex]::Matches(
        $Document,
        '(?m)^## (LEARN-P[0-9]+-[A-Z][A-Z0-9]{1,7}-[0-9]{3}-[0-9]{2})\s+.+$'
    )
    $blocks = @{}
    for ($index = 0; $index -lt $matches.Count; $index++) {
        $start = $matches[$index].Index
        $end = if ($index + 1 -lt $matches.Count) {
            $matches[$index + 1].Index
        }
        else {
            $Document.Length
        }
        $blocks[$matches[$index].Groups[1].Value] = $Document.Substring($start, $end - $start).TrimEnd("`n")
    }
    return $blocks
}

try {
    if ([String]::IsNullOrWhiteSpace($RepositoryRoot)) {
        $RepositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
    }
    else {
        $RepositoryRoot = [IO.Path]::GetFullPath($RepositoryRoot)
    }

    if ($PSCmdlet.ParameterSetName -ceq "Path") {
        $resolvedPath = [IO.Path]::GetFullPath($Path)
        $text = Get-StrictUtf8Text -FilePath $resolvedPath
        $SourceLabel = $resolvedPath
    }
    else {
        $text = $Content
    }

    if ($text.IndexOf("`r") -ge 0) {
        throw "Learning.md must use LF line endings."
    }
    if (-not $text.EndsWith("`n", [StringComparison]::Ordinal)) {
        throw "Learning.md must end with one LF newline."
    }
    if ($text -notmatch '(?m)^# Learning\.md(?:\s|$)') {
        throw "Learning.md must start with the canonical H1."
    }
    if ($text -notmatch '(?m)^<!-- LEARNING_SCHEMA_V1 -->$') {
        throw "Learning.md is missing LEARNING_SCHEMA_V1."
    }

    $headingPattern = '(?m)^## (LEARN-(P[0-9]+-[A-Z][A-Z0-9]{1,7}-[0-9]{3})-[0-9]{2})\s+.+$'
    $entryMatches = [Text.RegularExpressions.Regex]::Matches($text, $headingPattern)
    $allLearningHeadings = [Text.RegularExpressions.Regex]::Matches($text, '(?m)^## LEARN-\S+.*$')
    if ($entryMatches.Count -ne $allLearningHeadings.Count) {
        throw "Every LEARN heading must use LEARN-<TASK-ID>-NN followed by a title."
    }

    $seenIds = New-Object System.Collections.Generic.List[String]
    $entryIds = @($entryMatches | ForEach-Object { $_.Groups[1].Value })
    for ($index = 0; $index -lt $entryMatches.Count; $index++) {
        $match = $entryMatches[$index]
        $entryId = $match.Groups[1].Value
        $sourceTaskFromId = $match.Groups[2].Value
        if ($seenIds.Contains($entryId)) {
            throw ("Duplicate Learning ID: {0}" -f $entryId)
        }
        $seenIds.Add($entryId)

        $bodyStart = $match.Index + $match.Length
        $bodyEnd = if ($index + 1 -lt $entryMatches.Count) {
            $entryMatches[$index + 1].Index
        }
        else {
            $text.Length
        }
        $body = $text.Substring($bodyStart, $bodyEnd - $bodyStart)
        $lines = @($body -split "`n")

        $status = Get-ExactlyOneField -Lines $lines -Name "Status" -EntryId $entryId
        $sourceTask = Get-ExactlyOneField -Lines $lines -Name "Source-Task" -EntryId $entryId
        $evidence = Get-ExactlyOneField -Lines $lines -Name "Evidence" -EntryId $entryId
        $appliesTo = Get-ExactlyOneField -Lines $lines -Name "Applies-To" -EntryId $entryId
        $lesson = Get-ExactlyOneField -Lines $lines -Name "Lesson" -EntryId $entryId
        $requiredCheck = Get-ExactlyOneField -Lines $lines -Name "Required-Check" -EntryId $entryId
        $supersedes = Get-ExactlyOneField -Lines $lines -Name "Supersedes" -EntryId $entryId
        $invalidWhen = Get-ExactlyOneField -Lines $lines -Name "Invalid-When" -EntryId $entryId

        if ($status -cne "VALIDATED") {
            throw ("{0} Status must be VALIDATED." -f $entryId)
        }
        if ($sourceTask -cne $sourceTaskFromId) {
            throw ("{0} Source-Task must match the task encoded in its ID." -f $entryId)
        }
        if ($sourceTask -cnotmatch '^P[0-9]+-[A-Z][A-Z0-9]{1,7}-[0-9]{3}$') {
            throw ("{0} Source-Task is invalid." -f $entryId)
        }
        foreach ($value in @($appliesTo, $lesson, $requiredCheck, $invalidWhen)) {
            if ($value.Length -lt 12 -or $value -match '(?i)^(none|n/a|todo|tbd|pending)$') {
                throw ("{0} contains an empty, placeholder, or underspecified learning field." -f $entryId)
            }
        }

        $evidencePaths = @($evidence -split ';')
        if ($evidencePaths.Count -eq 0) {
            throw ("{0} must cite at least one repository-relative evidence path." -f $entryId)
        }
        foreach ($evidencePathValue in $evidencePaths) {
            $evidencePath = $evidencePathValue.Trim().Replace("\", "/")
            $containsControlCharacter = $false
            foreach ($character in $evidencePath.ToCharArray()) {
                $code = [Int32]$character
                if ($code -lt 32 -or $code -eq 127) {
                    $containsControlCharacter = $true
                    break
                }
            }
            if (
                [String]::IsNullOrWhiteSpace($evidencePath) -or
                $containsControlCharacter -or
                [IO.Path]::IsPathRooted($evidencePath) -or
                $evidencePath.Contains(":") -or
                $evidencePath.Contains("..") -or
                $evidencePath -match '[*?\[\]]' -or
                $evidencePath.EndsWith("/")
            ) {
                throw ("{0} Evidence must contain explicit repository-relative file paths." -f $entryId)
            }
            $evidenceFullPath = [IO.Path]::GetFullPath((Join-Path $RepositoryRoot $evidencePath))
            $rootPrefix = $RepositoryRoot.TrimEnd("\", "/") + [IO.Path]::DirectorySeparatorChar
            $canonicalEvidencePath = if ($evidenceFullPath.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
                $evidenceFullPath.Substring($rootPrefix.Length).Replace("\", "/")
            }
            else {
                ""
            }
            if ($canonicalEvidencePath -cne $evidencePath) {
                throw ("{0} Evidence path is missing or escapes the repository: {1}" -f $entryId, $evidencePath)
            }
            if ($EvidenceSource -ceq "Staged") {
                $stageResult = Invoke-GitReadOnly -WorkingDirectory $RepositoryRoot -Arguments @(
                    "-c", "core.quotepath=false", "ls-files", "--stage", "--", $evidencePath
                )
                $expectedSuffix = "`t" + $evidencePath
                $regularStageRows = @($stageResult.Lines | Where-Object {
                    ($_ -match '^(100644|100755) [0-9a-fA-F]{40,64} 0\t') -and
                    $_.EndsWith($expectedSuffix, [StringComparison]::Ordinal)
                })
                $blobResult = Invoke-GitReadOnly -WorkingDirectory $RepositoryRoot -Arguments @(
                    "cat-file", "-e", (":" + $evidencePath)
                ) -AllowFailure
                if ($regularStageRows.Count -ne 1 -or $blobResult.ExitCode -ne 0) {
                    throw ("{0} Evidence path is missing from the prospective Git tree: {1}" -f $entryId, $evidencePath)
                }
            }
            elseif (-not (Test-Path -LiteralPath $evidenceFullPath -PathType Leaf)) {
                throw ("{0} Evidence path is missing or escapes the repository: {1}" -f $entryId, $evidencePath)
            }
        }

        if ($supersedes -cne "none") {
            if ($supersedes -cnotmatch '^LEARN-P[0-9]+-[A-Z][A-Z0-9]{1,7}-[0-9]{3}-[0-9]{2}$') {
                throw ("{0} Supersedes must be none or one valid Learning ID." -f $entryId)
            }
            if ($supersedes -ceq $entryId -or $entryIds -cnotcontains $supersedes) {
                throw ("{0} Supersedes must reference another entry present in Learning.md." -f $entryId)
            }
        }

        $roadmapPath = Join-Path $RepositoryRoot "IMPLEMENTATION_ROADMAP.md"
        $roadmapText = $null
        if ($EvidenceSource -ceq "Staged") {
            $roadmapIndexProbe = Invoke-GitReadOnly -WorkingDirectory $RepositoryRoot -Arguments @(
                "cat-file", "-e", ":IMPLEMENTATION_ROADMAP.md"
            ) -AllowFailure
            if ($roadmapIndexProbe.ExitCode -eq 0) {
                $roadmapIndexResult = Invoke-GitReadOnly -WorkingDirectory $RepositoryRoot -Arguments @(
                    "show", ":IMPLEMENTATION_ROADMAP.md"
                )
                $roadmapText = $roadmapIndexResult.Lines -join "`n"
            }
            elseif (Test-Path -LiteralPath $roadmapPath -PathType Leaf) {
                throw ("{0} Source-Task roadmap is missing from the prospective Git tree." -f $entryId)
            }
        }
        elseif (Test-Path -LiteralPath $roadmapPath -PathType Leaf) {
            $roadmapText = [IO.File]::ReadAllText($roadmapPath, (New-Object Text.UTF8Encoding($false, $true)))
        }
        if ($null -ne $roadmapText) {
            $taskPattern = '(?<![A-Z0-9-]){0}(?![A-Z0-9-])' -f [Text.RegularExpressions.Regex]::Escape($sourceTask)
            if (-not [Text.RegularExpressions.Regex]::IsMatch($roadmapText, $taskPattern)) {
                throw ("{0} Source-Task is not registered in IMPLEMENTATION_ROADMAP.md." -f $entryId)
            }
        }
    }

    if ($EvidenceSource -ceq "Staged") {
        $headResult = Invoke-GitReadOnly -WorkingDirectory $RepositoryRoot -Arguments @(
            "rev-parse", "--verify", "HEAD"
        ) -AllowFailure
        if ($headResult.ExitCode -eq 0) {
            $headLearningProbe = Invoke-GitReadOnly -WorkingDirectory $RepositoryRoot -Arguments @(
                "cat-file", "-e", "HEAD:Learning.md"
            ) -AllowFailure
            if ($headLearningProbe.ExitCode -eq 0) {
                $headLearningResult = Invoke-GitReadOnly -WorkingDirectory $RepositoryRoot -Arguments @(
                    "show", "HEAD:Learning.md"
                )
                $headLearningText = ($headLearningResult.Lines -join "`n").TrimEnd("`n") + "`n"
                $headBlocks = Get-LearningEntryBlocks -Document $headLearningText
                $stagedBlocks = Get-LearningEntryBlocks -Document $text
                foreach ($existingId in $headBlocks.Keys) {
                    if (-not $stagedBlocks.ContainsKey($existingId)) {
                        throw ("Accepted Learning entry cannot be removed: {0}" -f $existingId)
                    }
                    if ($stagedBlocks[$existingId] -cne $headBlocks[$existingId]) {
                        throw ("Accepted Learning entry cannot be silently rewritten: {0}" -f $existingId)
                    }
                }
            }
        }
    }

    $entryWord = if ($entryMatches.Count -eq 1) { "entry" } else { "entries" }
    Write-Host ("Learning validation passed: {0} validated {1} in {2}." -f $entryMatches.Count, $entryWord, $SourceLabel)
    return
}
catch {
    throw ("LEARNING VALIDATION FAILED: {0}" -f $_.Exception.Message)
}
