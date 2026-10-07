[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [String]$CommitMessageFile
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

function Invoke-GitProbe {
    param([Parameter(Mandatory = $true)][String[]]$Arguments)

    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $output = @(& git @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    return [PSCustomObject]@{
        ExitCode = $exitCode
        Lines = @($output | ForEach-Object { [String]$_ })
    }
}

function Get-LearningReviewFromCommit {
    param([Parameter(Mandatory = $true)][String]$Commit)

    $messageProbe = Invoke-GitProbe -Arguments @("show", "-s", "--format=%B", $Commit)
    if ($messageProbe.ExitCode -ne 0) {
        throw ("Could not read incoming Learning review commit: {0}" -f $Commit)
    }
    $matches = [Text.RegularExpressions.Regex]::Matches(
        ($messageProbe.Lines -join "`n"),
        '(?m)^Learning-Review:\s*(\S.*?)\s*$'
    )
    if ($matches.Count -ne 1) {
        throw ("Incoming source commit must contain exactly one Learning-Review trailer: {0}" -f $Commit)
    }
    $value = $matches[0].Groups[1].Value.Trim()
    $recorded = [Text.RegularExpressions.Regex]::Match(
        $value,
        '^recorded\s+(LEARN-P[0-9]+-[A-Z][A-Z0-9]{1,7}-[0-9]{3}-[0-9]{2})$'
    )
    $decision = [Text.RegularExpressions.Regex]::Match(
        $value,
        '^(candidate|none)\s+-\s+(\S.{11,})$'
    )
    if (-not $recorded.Success -and -not $decision.Success) {
        throw ("Incoming source commit has an invalid Learning-Review trailer: {0}" -f $Commit)
    }
    if ($recorded.Success) {
        return [pscustomobject]@{
            Kind = "recorded"
            LearningId = $recorded.Groups[1].Value
        }
    }
    return [pscustomobject]@{
        Kind = $decision.Groups[1].Value
        LearningId = $null
    }
}

function Test-LearningIdInText {
    param(
        [Parameter(Mandatory = $true)][AllowEmptyString()][String]$Text,
        [Parameter(Mandatory = $true)][String]$LearningId
    )

    $pattern = '(?m)^##\s+{0}(?:\s|$)' -f [Text.RegularExpressions.Regex]::Escape($LearningId)
    return [Text.RegularExpressions.Regex]::IsMatch($Text, $pattern)
}

try {
    if (-not (Test-Path -LiteralPath $CommitMessageFile -PathType Leaf)) {
        throw ("Commit message file does not exist: {0}" -f $CommitMessageFile)
    }

    $message = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $CommitMessageFile), [Text.Encoding]::UTF8)
    $normalized = $message.Replace("`r`n", "`n").Replace("`r", "`n")
    $lines = @($normalized -split "`n")
    $header = if ($lines.Count -gt 0) { $lines[0].Trim() } else { "" }

    if ([String]::IsNullOrWhiteSpace($header)) {
        throw "The commit header is empty."
    }
    if ($header.Length -gt 100) {
        throw "The commit header exceeds 100 characters."
    }
    if ($header -match '^(WIP|fixup!|squash!)') {
        throw "WIP, fixup, and squash headers are not accepted for task checkpoints."
    }

    $headerPattern = '^(feat|fix|docs|test|refactor|perf|build|ci|chore|revert)(\([a-z0-9][a-z0-9._/-]{0,40}\))?!?:\s+\S.{1,}$'
    if ($header -notmatch $headerPattern) {
        throw "Header must use: type(scope): summary. Allowed types: feat, fix, docs, test, refactor, perf, build, ci, chore, revert."
    }

    $taskMatches = [Text.RegularExpressions.Regex]::Matches(
        $normalized,
        '(?m)^Task-ID:\s*(P[0-9]+-[A-Z][A-Z0-9]{1,7}-[0-9]{3})\s*$'
    )
    if ($taskMatches.Count -ne 1) {
        throw "Commit message must contain exactly one 'Task-ID: P0-ABC-001' trailer."
    }

    $agentMatches = [Text.RegularExpressions.Regex]::Matches(
        $normalized,
        '(?m)^Agent-ID:\s*([A-Za-z0-9/][A-Za-z0-9._/@:-]{0,127})\s*$'
    )
    if ($agentMatches.Count -ne 1) {
        throw "Commit message must contain exactly one non-secret 'Agent-ID:' trailer."
    }

    $validationMatches = [Text.RegularExpressions.Regex]::Matches(
        $normalized,
        '(?m)^Validation:\s*(\S.*?)\s*$'
    )
    if ($validationMatches.Count -lt 1) {
        throw "Commit message must contain at least one non-empty 'Validation:' trailer."
    }

    $checkpointMatches = [Text.RegularExpressions.Regex]::Matches(
        $normalized,
        '(?m)^Checkpoint:\s*(true|false)\s*$'
    )
    if ($checkpointMatches.Count -gt 1) {
        throw "Commit message may contain at most one Checkpoint trailer."
    }

    $learningMatches = [Text.RegularExpressions.Regex]::Matches(
        $normalized,
        '(?m)^Learning-Review:\s*(\S.*?)\s*$'
    )
    if ($learningMatches.Count -ne 1) {
        throw "Commit message must contain exactly one non-empty Learning-Review trailer."
    }
    $learningReview = $learningMatches[0].Groups[1].Value.Trim()
    $recordedMatch = [Text.RegularExpressions.Regex]::Match(
        $learningReview,
        '^recorded\s+(LEARN-P[0-9]+-[A-Z][A-Z0-9]{1,7}-[0-9]{3}-[0-9]{2})$'
    )
    $decisionMatch = [Text.RegularExpressions.Regex]::Match(
        $learningReview,
        '^(candidate|none)\s+-\s+(\S.{11,})$'
    )
    if (-not $recordedMatch.Success -and -not $decisionMatch.Success) {
        throw "Learning-Review must be 'recorded LEARN-<TASK-ID>-NN', 'candidate - <evidence and summary>', or 'none - <specific reason>'."
    }

    $branchProbe = Invoke-GitProbe -Arguments @("symbolic-ref", "--quiet", "--short", "HEAD")
    $branchName = if ($branchProbe.ExitCode -eq 0 -and $branchProbe.Lines.Count -gt 0) {
        $branchProbe.Lines[-1].Trim()
    }
    else {
        "(detached)"
    }

    if ($recordedMatch.Success) {
        $learningId = $recordedMatch.Groups[1].Value
        $stagedPaths = @(& git -c core.quotepath=false diff --cached --no-renames --name-only -- 2>&1)
        if ($LASTEXITCODE -ne 0) {
            throw "Could not inspect staged paths for a recorded Learning entry."
        }
        $normalizedStagedPaths = @(
            $stagedPaths |
                ForEach-Object { ([String]$_).Trim().Replace("\", "/") } |
                Where-Object { $_ -ne "" }
        )
        if ($normalizedStagedPaths -cnotcontains "Learning.md") {
            throw "A recorded Learning-Review requires Learning.md in the same staged commit."
        }
        $stagedLearning = @(& git show ":Learning.md" 2>&1)
        if ($LASTEXITCODE -ne 0) {
            throw "Could not read staged Learning.md for the recorded Learning-Review."
        }
        $learningPattern = '(?m)^##\s+{0}(?:\s|$)' -f [Text.RegularExpressions.Regex]::Escape($learningId)
        if (-not [Text.RegularExpressions.Regex]::IsMatch(($stagedLearning -join "`n"), $learningPattern)) {
            throw ("Recorded Learning ID is not present in staged Learning.md: {0}" -f $learningId)
        }
        $headProbe = Invoke-GitProbe -Arguments @("rev-parse", "--verify", "HEAD")
        if ($headProbe.ExitCode -eq 0) {
            $headLearningProbe = Invoke-GitProbe -Arguments @("cat-file", "-e", "HEAD:Learning.md")
            if ($headLearningProbe.ExitCode -eq 0) {
                $headLearning = Invoke-GitProbe -Arguments @("show", "HEAD:Learning.md")
                if ($headLearning.ExitCode -ne 0) {
                    throw "Could not read HEAD Learning.md while proving a newly recorded entry."
                }
                if ([Text.RegularExpressions.Regex]::IsMatch(($headLearning.Lines -join "`n"), $learningPattern)) {
                    throw ("Recorded Learning ID must be newly added by this commit, not reused from HEAD: {0}" -f $learningId)
                }
            }
        }
    }
    elseif ($decisionMatch.Groups[1].Value -ceq "candidate") {
        if ($branchName -ceq "(detached)") {
            throw "A Learning candidate requires a named task branch."
        }
        if ($branchName -ceq "main") {
            throw "Learning candidates cannot enter main; the coordinator must record or reject them first."
        }
    }

    $sourceMatches = [Text.RegularExpressions.Regex]::Matches(
        $normalized,
        '(?m)^Learning-Source-Commit:\s*([0-9a-f]{40})\s*$'
    )
    $dispositionMatches = [Text.RegularExpressions.Regex]::Matches(
        $normalized,
        '(?m)^Learning-Disposition:\s*(\S.*?)\s*$'
    )
    if ($sourceMatches.Count -gt 1) {
        throw "Commit message may contain at most one Learning-Source-Commit trailer."
    }
    if ($sourceMatches.Count -eq 0 -and $dispositionMatches.Count -gt 0) {
        throw "Learning-Disposition requires exactly one Learning-Source-Commit."
    }
    if ($sourceMatches.Count -eq 1) {
        if ($branchName -cne "main") {
            throw "Incoming Learning disposition reconciliation is allowed only on main."
        }

        $sourceCommit = $sourceMatches[0].Groups[1].Value
        $sourceProbe = Invoke-GitProbe -Arguments @("cat-file", "-e", ($sourceCommit + "^{commit}"))
        if ($sourceProbe.ExitCode -ne 0) {
            throw ("Learning source commit is missing or invalid: {0}" -f $sourceCommit)
        }
        $mergeBaseProbe = Invoke-GitProbe -Arguments @("merge-base", "HEAD", $sourceCommit)
        if ($mergeBaseProbe.ExitCode -ne 0 -or $mergeBaseProbe.Lines.Count -ne 1) {
            throw "Learning source commit does not have one verifiable merge-base with HEAD."
        }
        $mergeBase = $mergeBaseProbe.Lines[-1].Trim()
        $rangeProbe = Invoke-GitProbe -Arguments @("rev-list", "--reverse", ($mergeBase + ".." + $sourceCommit))
        if ($rangeProbe.ExitCode -ne 0) {
            throw "Could not enumerate incoming Learning source commits."
        }
        $sourceCommits = @($rangeProbe.Lines | Where-Object { $_ -match '^[0-9a-f]{40}$' })
        if ($sourceCommits.Count -eq 0) {
            throw "Learning source commit does not contain any incoming commits relative to HEAD."
        }

        $obligations = @{}
        foreach ($commit in $sourceCommits) {
            $review = Get-LearningReviewFromCommit -Commit $commit
            if ($review.Kind -ceq "recorded" -or $review.Kind -ceq "candidate") {
                $obligations[$commit] = $review
            }
        }

        $dispositions = @{}
        foreach ($match in $dispositionMatches) {
            $value = $match.Groups[1].Value.Trim()
            $parsed = [Text.RegularExpressions.Regex]::Match(
                $value,
                '^(?<commit>[0-9a-f]{40})\s+=>\s+(?:(?<recorded>recorded\s+(?<id>LEARN-P[0-9]+-[A-Z][A-Z0-9]{1,7}-[0-9]{3}-[0-9]{2}))|(?<rejected>rejected\s+-\s+(?<reason>\S.{11,})))$'
            )
            if (-not $parsed.Success) {
                throw "Learning-Disposition must be '<40-hex source commit> => recorded LEARN-<TASK-ID>-NN' or '<40-hex source commit> => rejected - <specific reason>'."
            }
            $commit = $parsed.Groups["commit"].Value
            if ($dispositions.ContainsKey($commit)) {
                throw ("Duplicate Learning-Disposition for source commit: {0}" -f $commit)
            }
            if (-not $obligations.ContainsKey($commit)) {
                throw ("Learning-Disposition does not match a candidate or recorded source commit: {0}" -f $commit)
            }
            $dispositions[$commit] = [pscustomobject]@{
                Kind = $(if ($parsed.Groups["recorded"].Success) { "recorded" } else { "rejected" })
                LearningId = $(if ($parsed.Groups["recorded"].Success) { $parsed.Groups["id"].Value } else { $null })
            }
        }

        foreach ($commit in $obligations.Keys) {
            if (-not $dispositions.ContainsKey($commit)) {
                throw ("Incoming Learning obligation is missing a disposition: {0}" -f $commit)
            }
            $obligation = $obligations[$commit]
            $disposition = $dispositions[$commit]
            if ($obligation.Kind -ceq "recorded") {
                if ($disposition.Kind -cne "recorded" -or $disposition.LearningId -cne $obligation.LearningId) {
                    throw ("Recorded incoming Learning must map to the same Learning ID: {0}" -f $commit)
                }
            }
        }

        $prospectiveLearningProbe = Invoke-GitProbe -Arguments @("show", ":Learning.md")
        $prospectiveLearning = if ($prospectiveLearningProbe.ExitCode -eq 0) {
            $prospectiveLearningProbe.Lines -join "`n"
        }
        else {
            ""
        }
        $headLearningProbe = Invoke-GitProbe -Arguments @("show", "HEAD:Learning.md")
        $headLearning = if ($headLearningProbe.ExitCode -eq 0) {
            $headLearningProbe.Lines -join "`n"
        }
        else {
            ""
        }
        foreach ($disposition in $dispositions.Values) {
            if ($disposition.Kind -cne "recorded") {
                continue
            }
            if (-not (Test-LearningIdInText -Text $prospectiveLearning -LearningId $disposition.LearningId)) {
                throw ("Dispositional Learning ID is absent from the prospective Learning tree: {0}" -f $disposition.LearningId)
            }
            if (
                -not (Test-LearningIdInText -Text $headLearning -LearningId $disposition.LearningId) -and
                (-not $recordedMatch.Success -or $recordedMatch.Groups[1].Value -cne $disposition.LearningId)
            ) {
                throw ("A newly added dispositional Learning ID requires this main commit's Learning-Review to record it: {0}" -f $disposition.LearningId)
            }
        }
    }

    $sensitivePatterns = @(
        '-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
        '(?<![A-Z0-9])AKIA[0-9A-Z]{16}(?![A-Z0-9])',
        '(?<![A-Za-z0-9])gh[pousr]_[A-Za-z0-9]{30,}',
        '(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{20,}',
        '(?im)(?:^|[ \t])Authorization\s*:\s*Bearer\s+[A-Za-z0-9._~+/=-]{20,}\s*$',
        '(?im)(?:^|[ \t])Cookie\s*:\s*[A-Za-z0-9._~+/=; -]{20,}\s*$',
        '(?im)(?:^|[ \t])["'']?(?:api[_ -]?key|access[_ -]?token|auth[_ -]?token|password|passwd|client[_ -]?secret|secret[_ -]?access[_ -]?key)["'']?\s*[:=]\s*["'']?(?!(?:example|sample|dummy|placeholder|redacted|changeme|null|none)(?:["'']?\s*$))[A-Za-z0-9+/=_-]{20,}["'']?\s*$',
        '(?im)["''](?:api[_ -]?key|access[_ -]?token|auth[_ -]?token|password|passwd|client[_ -]?secret|secret[_ -]?access[_ -]?key)["'']\s*:\s*["'']?(?!(?:example|sample|dummy|placeholder|redacted|changeme|null|none)["'']?\s*[,}])[A-Za-z0-9+/=_-]{20,}["'']?',
        '(?i)\b[a-z][a-z0-9+.-]*://[^\s/:@]{2,}:[^\s/@]{8,}@'
    )
    foreach ($pattern in $sensitivePatterns) {
        if ([Text.RegularExpressions.Regex]::IsMatch($normalized, $pattern)) {
            throw "Commit message appears to contain a credential or private key."
        }
    }

    Write-Host ("Commit message validation passed for {0} by {1}." -f $taskMatches[0].Groups[1].Value, $agentMatches[0].Groups[1].Value)
    return
}
catch {
    throw ("COMMIT MESSAGE VALIDATION FAILED: {0}" -f $_.Exception.Message)
}
