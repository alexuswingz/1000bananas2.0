# Package Lambda function for AWS
# Run this script to create lambda_function.zip

Write-Host "Packaging Lambda function..." -ForegroundColor Green

# Remove old zip if exists
if (Test-Path lambda_function.zip) {
    Remove-Item lambda_function.zip -Force
}

# Create zip with just lambda_function.py (no dependencies, using layers)
Write-Host "Creating zip file..." -ForegroundColor Yellow
Compress-Archive -Path lambda_function.py -DestinationPath lambda_function.zip -Force

Write-Host "Package created: lambda_function.zip" -ForegroundColor Green
$sizeKB = [math]::Round((Get-Item lambda_function.zip).Length / 1KB, 2)
Write-Host "Size: $sizeKB KB" -ForegroundColor Cyan
Write-Host "Upload this file to AWS Lambda" -ForegroundColor Cyan
Write-Host "Note: Ensure psycopg2 is provided via Lambda Layer" -ForegroundColor Yellow

