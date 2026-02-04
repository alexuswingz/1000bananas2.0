# Deployment Guide for 1000 Bananas

This guide explains how to deploy your local updates to the live AWS S3 website.

## Live Site
🌐 **Production URL:** http://1000bananasv2.s3-website-ap-southeast-2.amazonaws.com/

## Prerequisites

### 1. Install AWS CLI

**Windows:**
1. Download AWS CLI v2: https://awscli.amazonaws.com/AWSCLIV2.msi
2. Run the installer
3. Restart your terminal/PowerShell

**Verify installation:**
```powershell
aws --version
```

### 2. Configure AWS Credentials

You need AWS credentials with permissions to upload to the S3 bucket `1000bananasv2`.

Run the configuration command:
```powershell
aws configure
```

Enter the following when prompted:
- **AWS Access Key ID:** [Your AWS Access Key]
- **AWS Secret Access Key:** [Your AWS Secret Key]
- **Default region name:** `ap-southeast-2`
- **Default output format:** `json`

**Note:** If you don't have AWS credentials, ask your AWS administrator for:
- Access Key ID
- Secret Access Key
- Permission to write to the `1000bananasv2` S3 bucket

## Deployment Methods

### Method 1: Using the PowerShell Script (Recommended)

The easiest way to deploy:

```powershell
.\deploy.ps1
```

This script will:
1. ✓ Check if AWS CLI is installed
2. ✓ Verify AWS configuration
3. ✓ Build your React app
4. ✓ Ask for confirmation
5. ✓ Deploy to S3

### Method 2: Using NPM Scripts

If you prefer using npm commands:

**Build and deploy:**
```powershell
npm run deploy
```

**Build only (preview before deploy):**
```powershell
npm run deploy:preview
```

**Then manually deploy:**
```powershell
aws s3 sync build/ s3://1000bananasv2 --delete
```

### Method 3: Manual Step-by-Step

1. **Build the app:**
   ```powershell
   npm run build
   ```

2. **Deploy to S3:**
   ```powershell
   aws s3 sync build/ s3://1000bananasv2 --delete
   ```

   The `--delete` flag removes files from S3 that no longer exist in your build folder.

## Deployment Workflow

### Before Deploying

1. **Test locally:**
   ```powershell
   npm start
   ```
   Verify everything works at http://localhost:3000

2. **Check for errors:**
   - Make sure there are no console errors
   - Test all functionality
   - Verify API connections

3. **Commit your changes:**
   ```powershell
   git add .
   git commit -m "Your commit message"
   git push
   ```

### Deploy to Production

1. **Run deployment:**
   ```powershell
   .\deploy.ps1
   ```
   OR
   ```powershell
   npm run deploy
   ```

2. **Verify deployment:**
   - Visit: http://1000bananasv2.s3-website-ap-southeast-2.amazonaws.com/
   - Clear browser cache if needed (Ctrl+Shift+R)
   - Test main functionality

## Fix 404 on direct / deep links (e.g. /dashboard/production/shipment/new)

If opening or refreshing a URL like `/dashboard/production/shipment/new` returns **404 Not Found**, S3 is treating the path as an object key. The bucket must serve `index.html` for missing paths so the React app loads and React Router can handle the route.

**One-time fix (run once):**

```powershell
aws s3 website s3://1000bananasv2/ --index-document index.html --error-document index.html
```

Or in **AWS Console**: S3 → bucket `1000bananasv2` → **Properties** → **Static website hosting** → set **Error document** to `index.html` (and **Index document** to `index.html`), then Save.

After this, direct links and refresh on any route will work.

**Important:** With `Error document` set to `index.html`, any **missing** file (e.g. `/static/js/main.xxx.js`) also gets `index.html`. The browser then receives HTML instead of JavaScript, the app doesn’t run, and you see *"You need to enable JavaScript to run this app."* So always deploy the full build (including `static/js/` and `static/css/`) after enabling the error document. Run `.\deploy.ps1` or `aws s3 sync build/ s3://1000bananasv2 --delete` so all assets are uploaded.

## Troubleshooting

### "AWS CLI not found"
- Make sure AWS CLI is installed
- Restart your terminal after installation
- Check PATH environment variable

### "AWS CLI not configured"
- Run `aws configure` with your credentials
- Verify credentials with: `aws sts get-caller-identity`

### "Access Denied" error
- Check that your AWS credentials have write permissions to the S3 bucket
- Verify bucket name is correct: `1000bananasv2`
- Contact AWS administrator for proper IAM permissions

### "You need to enable JavaScript to run this app" (including in incognito)
- This usually means the **main JS bundle failed to load**. With S3 error document set to `index.html`, a 404 for `/static/js/main.xxx.js` returns HTML, so the browser never runs your app.
- **Fix:** Re-deploy so all build assets are on S3: run `.\deploy.ps1` or `npm run build` then `aws s3 sync build/ s3://1000bananasv2 --delete`.
- **Verify:** In S3, confirm `static/js/main.*.js` and `static/css/main.*.css` exist, or run: `aws s3 ls s3://1000bananasv2/static/js/`

### Changes not appearing on live site
- Clear browser cache (Ctrl+Shift+R or Ctrl+F5)
- Try incognito/private browsing mode
- Wait a few minutes for CDN/cache to update
- Verify files uploaded to S3: `aws s3 ls s3://1000bananasv2/ --recursive`

### Build fails
- Check for syntax errors in your code
- Run `npm install` to ensure all dependencies are installed
- Check the error messages in the build output

## AWS S3 Configuration

Your S3 bucket should be configured as a static website with:
- **Bucket name:** `1000bananasv2`
- **Region:** `ap-southeast-2` (Sydney)
- **Static website hosting:** Enabled
- **Index document:** `index.html`
- **Error document:** `index.html` (for React Router)
- **Public access:** Enabled for website hosting

## Important Notes

1. **Build folder:** Never commit the `build/` folder to git (it's in `.gitignore`)
2. **Environment variables:** Make sure your `.env` file has production API URLs
3. **Cache:** S3 serves cached content, changes may take 1-5 minutes to appear
4. **Rollback:** Keep track of your git commits so you can rollback if needed

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm start` | Run locally |
| `npm run build` | Build for production |
| `npm run deploy` | Build and deploy to S3 |
| `.\deploy.ps1` | Deploy using PowerShell script |
| `aws s3 sync build/ s3://1000bananasv2 --delete` | Manual S3 sync |
| `aws s3 ls s3://1000bananasv2/` | List S3 bucket contents |

## Support

If you encounter issues:
1. Check the error messages carefully
2. Verify AWS credentials and permissions
3. Test the build locally first
4. Check S3 bucket configuration in AWS Console

---

**Last Updated:** January 2026
**Live Site:** http://1000bananasv2.s3-website-ap-southeast-2.amazonaws.com/

