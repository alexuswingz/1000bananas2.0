# Deploy 1000 Bananas to AWS S3
# This script builds and deploys the React app to S3

Write-Host "🍌 1000 Bananas Deployment Script" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow
Write-Host ""

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✓ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install AWS CLI first:" -ForegroundColor Yellow
    Write-Host "Download from: https://awscli.amazonaws.com/AWSCLIV2.msi" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "After installation, run: aws configure" -ForegroundColor Yellow
    Write-Host "You'll need your AWS Access Key ID and Secret Access Key" -ForegroundColor Yellow
    exit 1
}

# Check if AWS is configured
Write-Host ""
Write-Host "Checking AWS configuration..." -ForegroundColor Cyan
try {
    $awsIdentity = aws sts get-caller-identity 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ AWS CLI not configured!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please run: aws configure" -ForegroundColor Yellow
        Write-Host "Enter your AWS credentials when prompted" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✓ AWS configured successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS configuration error!" -ForegroundColor Red
    exit 1
}

# Build the React app
Write-Host ""
Write-Host "Building React app..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Build successful!" -ForegroundColor Green

# Confirm deployment
Write-Host ""
Write-Host "Ready to deploy to S3 bucket: 1000bananasv2" -ForegroundColor Yellow
$confirm = Read-Host "Do you want to continue? (y/n)"

if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

# Deploy to S3
Write-Host ""
Write-Host "Deploying to S3..." -ForegroundColor Cyan
aws s3 sync build/ s3://1000bananasv2 --delete

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✓ Deployment successful!" -ForegroundColor Green
Write-Host ""
Write-Host "Your site is live at:" -ForegroundColor Cyan
Write-Host "http://1000bananasv2.s3-website-ap-southeast-2.amazonaws.com/" -ForegroundColor Blue
Write-Host ""
Write-Host "Note: It may take a few minutes for changes to appear due to caching." -ForegroundColor Yellow
Write-Host "If changes don't appear, try clearing your browser cache or use Ctrl+Shift+R" -ForegroundColor Yellow




























