param([string]$BaseUrl = "http://localhost:8000")
$ErrorActionPreference = "Stop"
$api = $BaseUrl.TrimEnd("/") + "/api"
$failures = 0
function Pass([string]$Name) { Write-Output "PASS $Name" }
function Fail([string]$Name, [string]$Reason) { Write-Output "FAIL ${Name}: $Reason"; $script:failures++ }
try { Invoke-RestMethod "$api/health" | Out-Null; Pass "health" } catch { Fail "health" $_.Exception.Message }
try { $forms = Invoke-RestMethod "$api/forms"; Pass "list forms" } catch { Fail "list forms" $_.Exception.Message; $forms = $null }
$published = $forms | Where-Object { $_.status -eq "published" } | Select-Object -First 1
if (-not $published) {
  Fail "public form" "no published form returned"
} else {
  try {
    $public = Invoke-RestMethod "$api/public/forms/$($published.public_id)"
    Pass "fetch public form"
  } catch { Fail "fetch public form" $_.Exception.Message; $public = $null }
  try {
    $answers = foreach ($question in $public.questions) {
      $value = switch ($question.type) {
        "email" { "smoke@example.com"; break }
        "number" { 1; break }
        "yes_no" { $true; break }
        "rating" { 1; break }
        "multiple_choice" { @($question.options[0].id); break }
        "dropdown" { @($question.options[0].id); break }
        default { "Smoke test" }
      }
      @{ question_id = $question.id; value = $value }
    }
    $body = @{ answers = @($answers) } | ConvertTo-Json -Depth 6
    Invoke-RestMethod "$api/public/forms/$($published.public_id)/responses" -Method Post -ContentType "application/json" -Body $body | Out-Null
    Pass "submit valid response"
  } catch { Fail "submit valid response" $_.Exception.Message }
  try {
    $body = @{ answers = @(@{ question_id = -1; value = "invalid" }) } | ConvertTo-Json -Depth 4
    Invoke-RestMethod "$api/public/forms/$($published.public_id)/responses" -Method Post -ContentType "application/json" -Body $body | Out-Null
    Fail "reject invalid response" "request unexpectedly succeeded"
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 422) { Pass "reject invalid response" } else { Fail "reject invalid response" "expected 422" }
  }
  try { Invoke-RestMethod "$api/forms/$($published.id)/summary" | Out-Null; Pass "fetch summary" } catch { Fail "fetch summary" $_.Exception.Message }
}
if ($failures -gt 0) { exit 1 }
