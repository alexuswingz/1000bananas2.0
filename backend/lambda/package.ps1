# Package Lambda function for AWS
# Run this script to create lambda_function.zip

Write-Host "Packaging Lambda function..." -ForegroundColor Green

# Create temp directory
$tempDir = "package"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt -t $tempDir

# Copy handler
Copy-Item selection_handler.py $tempDir/

# Create zip
Write-Host "Creating zip file..." -ForegroundColor Yellow
Compress-Archive -Path "$tempDir/*" -DestinationPath "lambda_function.zip" -Force

# Cleanup
Remove-Item $tempDir -Recurse -Force

Write-Host "Package created: lambda_function.zip" -ForegroundColor Green
Write-Host "Upload this file to AWS Lambda" -ForegroundColor Cyan

