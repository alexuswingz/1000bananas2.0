# Deploy to AWS S3 Using Console (Web Interface)

This guide shows you how to deploy without using command line/PowerShell.

## Step-by-Step Guide

### Step 1: Build Your App Locally

1. Open PowerShell or Command Prompt in your project folder
2. Run:
   ```
   npm run build
   ```
3. Wait for the build to complete (this creates a `build` folder)

### Step 2: Access S3 in AWS Console

1. Go to: https://console.aws.amazon.com
2. Sign in with your AWS credentials
3. In the search bar at the top, type "S3"
4. Click on "S3" (Scalable Storage in the Cloud)

### Step 3: Find Your Bucket

1. Look for the bucket named: **1000bananasv2**
2. Click on the bucket name to open it

### Step 4: Delete Old Files (Important!)

Before uploading new files, delete the old ones:

1. Select all files in the bucket:
   - Click the checkbox at the top to select all
   - OR use Ctrl+A to select all
2. Click "Delete" button
3. Type "permanently delete" in the confirmation box
4. Click "Delete objects"

**Important:** Don't delete the bucket itself, just the files inside!

### Step 5: Upload New Files

1. Click the "Upload" button
2. Click "Add files" or "Add folder"
3. Navigate to your project folder → `build` folder
4. **Important:** You need to upload the CONTENTS of the build folder, not the build folder itself

   **Two ways to do this:**

   **Option A - Upload folder contents:**
   - Open the `build` folder
   - Select ALL files and folders inside (Ctrl+A)
   - Drag them into the AWS console upload window
   
   **Option B - Add files/folders one by one:**
   - Click "Add folder" and add the `static` folder
   - Click "Add files" and add `index.html`
   - Click "Add files" and add all other files (favicon.ico, logo192.png, etc.)

4. Make sure you see files like:
   - `index.html`
   - `favicon.ico`
   - `static/` folder
   - `assets/` folder (if you have one)
   - `manifest.json`
   - `robots.txt`

5. Scroll down and click "Upload"
6. Wait for the upload to complete (you'll see a green success bar)
7. Click "Close"

### Step 6: Verify Your Deployment

1. Visit your site: http://1000bananasv2.s3-website-ap-southeast-2.amazonaws.com/
2. Clear browser cache (Ctrl+Shift+R) if you don't see changes
3. Test your application to make sure everything works

## Important Notes

### File Structure in S3

Your S3 bucket should look like this:
```
1000bananasv2/
├── index.html
├── favicon.ico
├── manifest.json
├── robots.txt
├── logo192.png
├── logo512.png
├── static/
│   ├── css/
│   ├── js/
│   └── media/
└── assets/
    └── [your images]
```

**NOT like this:**
```
1000bananasv2/
└── build/
    └── [files]  ❌ WRONG!
```

### Permissions

If you get permission errors:
- Make sure you're logged in to the correct AWS account
- Ask your AWS administrator for permissions to:
  - Read objects in the bucket
  - Write objects to the bucket
  - Delete objects from the bucket

### Common Mistakes

❌ **Don't do this:**
- Upload the `build` folder itself (this creates wrong structure)
- Forget to delete old files first (can cause conflicts)
- Upload while forgetting to build first

✅ **Do this:**
- Build first with `npm run build`
- Delete old files in S3
- Upload contents of build folder (not the folder itself)
- Verify at the live URL

## Quick Checklist

Before uploading:
- [ ] Run `npm run build` locally
- [ ] Build completed without errors
- [ ] You have the `build` folder in your project

During upload:
- [ ] Logged into AWS Console
- [ ] Found the `1000bananasv2` bucket
- [ ] Deleted old files from bucket
- [ ] Uploaded contents of build folder (not build folder itself)
- [ ] Upload completed successfully

After upload:
- [ ] Visit http://1000bananasv2.s3-website-ap-southeast-2.amazonaws.com/
- [ ] Clear browser cache if needed
- [ ] Test main functionality

## Troubleshooting

### Site shows old version
- Clear browser cache (Ctrl+Shift+R)
- Check if new files are actually in S3 bucket
- Wait 2-3 minutes and try again

### 404 Error or blank page
- Check that `index.html` is at the root of the bucket (not inside a folder)
- Verify you uploaded contents of build folder, not the folder itself
- Check S3 static website hosting is enabled

### Permission denied
- Contact AWS administrator
- Verify you're logged into correct AWS account

### Files missing
- Make sure you selected ALL contents of build folder
- Check that static, assets folders were uploaded
- Re-upload if necessary

## Video Tutorial Steps

If you prefer visual guide:

1. **Build** → Open terminal → `npm run build`
2. **Login** → Go to AWS Console → Search "S3"
3. **Find** → Click on `1000bananasv2` bucket
4. **Clean** → Select all files → Delete
5. **Upload** → Click Upload → Add folder contents → Click Upload
6. **Test** → Visit your site → Refresh cache

---

**Need help?** Ask your team member or AWS administrator if you get stuck!




























