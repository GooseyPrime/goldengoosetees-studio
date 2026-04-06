# Continue.dev + AWS Bedrock - Quick Setup Script
# This script helps you set up AWS credentials for Continue.dev

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Continue.dev + AWS Bedrock Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if AWS CLI is installed
$awsInstalled = Get-Command aws -ErrorAction SilentlyContinue

if (-not $awsInstalled) {
    Write-Host "❌ AWS CLI not found" -ForegroundColor Red
    Write-Host "`nPlease install AWS CLI first:" -ForegroundColor Yellow
    Write-Host "https://aws.amazon.com/cli/`n" -ForegroundColor Yellow
    Write-Host "After installing, run this script again.`n"
    exit 1
}

Write-Host "✅ AWS CLI found`n" -ForegroundColor Green

# Check current AWS configuration
Write-Host "Checking AWS configuration..." -ForegroundColor Yellow
$awsConfigured = $false

try {
    $identity = aws sts get-caller-identity 2>$null | ConvertFrom-Json
    if ($identity) {
        Write-Host "✅ AWS credentials are configured" -ForegroundColor Green
        Write-Host "   Account: $($identity.Account)" -ForegroundColor Gray
        Write-Host "   User: $($identity.Arn)`n" -ForegroundColor Gray
        $awsConfigured = $true
    }
} catch {
    Write-Host "❌ AWS credentials not configured`n" -ForegroundColor Red
}

if (-not $awsConfigured) {
    Write-Host "Let's configure AWS credentials:`n" -ForegroundColor Cyan
    Write-Host "You'll need:" -ForegroundColor Yellow
    Write-Host "  - AWS Access Key ID" -ForegroundColor Yellow
    Write-Host "  - AWS Secret Access Key`n" -ForegroundColor Yellow
    
    $response = Read-Host "Run 'aws configure' now? (y/n)"
    if ($response -eq 'y') {
        aws configure
        Write-Host "`n✅ AWS configured!`n" -ForegroundColor Green
    } else {
        Write-Host "`nYou can run 'aws configure' manually later.`n" -ForegroundColor Yellow
    }
}

# Test Bedrock access
Write-Host "Testing AWS Bedrock access..." -ForegroundColor Yellow
try {
    $models = aws bedrock list-foundation-models --region us-east-1 2>$null | ConvertFrom-Json
    if ($models.modelSummaries) {
        $claudeModels = $models.modelSummaries | Where-Object { $_.modelId -like "anthropic.claude*" }
        Write-Host "✅ Bedrock access confirmed!" -ForegroundColor Green
        Write-Host "   Found $($claudeModels.Count) Claude models`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Could not verify Bedrock access" -ForegroundColor Yellow
    Write-Host "   Make sure:" -ForegroundColor Yellow
    Write-Host "   1. Model access is enabled in AWS Console" -ForegroundColor Yellow
    Write-Host "   2. IAM user has Bedrock permissions`n" -ForegroundColor Yellow
}

# Find Continue config location
$continueConfigPath = "$env:USERPROFILE\.continue\config.json"
$continueConfigExists = Test-Path $continueConfigPath

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($continueConfigExists) {
    Write-Host "✅ Continue config found at:" -ForegroundColor Green
    Write-Host "   $continueConfigPath`n" -ForegroundColor Gray
    
    $response = Read-Host "Open Continue config to edit? (y/n)"
    if ($response -eq 'y') {
        code $continueConfigPath
    }
} else {
    Write-Host "⚠️  Continue config not found" -ForegroundColor Yellow
    Write-Host "   Expected location: $continueConfigPath`n" -ForegroundColor Gray
    Write-Host "   Continue may not be installed or hasn't created config yet.`n" -ForegroundColor Yellow
}

Write-Host "`nSetup instructions:" -ForegroundColor Cyan
Write-Host "1. Copy the config from: docs/continue-config-example.json" -ForegroundColor White
Write-Host "2. Paste into: $continueConfigPath" -ForegroundColor White
Write-Host "3. Restart VS Code completely" -ForegroundColor White
Write-Host "4. Open Continue (Ctrl+L) and select 'Claude 3.5 Sonnet (Bedrock)'" -ForegroundColor White
Write-Host "`nFull guide: docs/CONTINUE_BEDROCK_SETUP.md`n" -ForegroundColor Cyan

Write-Host "========================================`n" -ForegroundColor Cyan
