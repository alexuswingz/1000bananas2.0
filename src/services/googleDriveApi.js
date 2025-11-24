/**
 * Google Drive API Service
 * Fetches images from Google Drive using Service Account authentication
 */

// Service account credentials (move to environment variables in production)
const SERVICE_ACCOUNT = {
  client_email: "id-000-bananas-drive-viewer@bananas-drive-integration.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCvhaIksAJaKAQD\nCZY7EuAElvClDzmq34xVSQSzir2c7HtUVl5GtDgJ8A/XIps9OY4v/42vtHk4kM9a\nZj0l8Qxt+El1vN1ul5Lmflr513ldriNQMleaQShwpQoD5NKp32rlmNM+M3Qhic7s\nqEkPEOdOIwgX1MmJ/a7bWDyQpyzGWg55fLHs3JWt0Tcaqrz3GJK3wsJNOLtw1/Ur\nEhyJdJM7zg+GfrCNqk4bv+joVQH72mfpoz/apdBhS/l8+gMauZsIeQG1L2pk9lt9\nTJfY61T2g9mBwwwNUkNaxC3DKS5alNgImLwzsusgLw2un+ABFp9DfEKpIcN5P4fM\neeMNDj2NAgMBAAECggEAArR6hTo5Lw6C0VEqgYqO7UMuPjz31IxRa1cOvX2b4nk6\nhVg3Z7uLSYvrkpMz9UOXz2GO23BaleaVa3074APQ/zjeWPQqLXQkjWzRFhyeADWY\n0bmU5AmxB9tjRiAWpwuMaDFsv/6nAYVQLRGC3rqR9gBQNZ3P5VKFiVfYxxnsdLoU\nCOeN4dfU3l1acltvIeSMU8y1fCPfqRK6a0y2sAq2zg8ZdZht4QnpyQbadDfXsTWL\nKhvhtGdfWU0QpVtVoipzMo2WYhYyNNcLSUj38MgeNuLGlPjIVuzLMzyclp/HPxWt\nQoeY0Py93CuL4RsX6LBXCcrEQuUrYnaHlmF31h/eAQKBgQDdKJJ9YBMHA7tR/c9D\noGeS/FW0DPqodsWpWkH3ibwgvr5OxsXkg+u2pHGk59QHCtCOleZ77Y0AuCVm3U8G\nbin3kMKJl6kdP0YN9eAXQ+3qMbJCh7fDhfY9JA6b48CW94gZoqZYsroWxbKnrU0B\nLwqEy8CIMTPOdr9iwmQxSap/TQKBgQDLLIUgbOxa6GG6mps5IQmn8elvXc6ZlJY6\nEOf5Nh0cnwzVW2C5ap7z/wBUdYeX0tD6XZxed7kQYI4AA4nJGAJdw42tbPdFyZ4F\ndh+lJPGBU4WvX5de6GclIPV8xnncHFo3gJjT5PMJ22WS9Okr7d2I8fP78sBDK5Vs\nSS78YqQXQQKBgBJTxWf8aTdAmOpfhSiOh2bH4HZOSQti5Fh3cVYJJPz1saGnmUip\nogP9tqk6yPhYbhYS2AnXEsNHf1n55w2aXYH1jhmG5u3Ui4KmqI5lA7dPrP0UcCcU\n1+YTMd67Tf90veOZ9f0NupwegAKjOulpM47zr53ZrfhjINMXVuQ6vZVVAoGBAKng\n3qr/CBz2wogxL2p0GkvHdKR+bflyCK4iZqO0QGEnB6b5kYVXBfMDmzYDU015ouxE\nCzPdrOppoTGXw8RVg9z8XmDMhHBgpPTyEIGXwyqcOGIrbjiX325nAXvDxC5rsm9H\n4gECJMhwHpzilHf7mkkf7R4TmfhP38873cJ/g65BAoGAK3I9Hx4EAONWI+1FnC3s\noqBuDoB/2Jymq3A7ktBmQs6kg2pcr4TiqNqMcNutlme7MyJ+ICOlgvveoHHHUbJ0\nZ+UUPps66AWI2fEmoznLvhh+2jLbXygj9foYcMdITXcCokE6TZ2n767H6WdkHivO\nwu0uhfjoD4q3sdIzlsRWNj8=\n-----END PRIVATE KEY-----\n"
};

// Cache for access tokens
let cachedToken = null;
let tokenExpiry = null;

/**
 * Extract file ID from Google Drive URL
 * @param {string} url - Google Drive URL
 * @returns {string|null} - File ID or null
 */
export const extractFileId = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  // Match various Google Drive URL formats
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,  // /d/FILE_ID
    /id=([a-zA-Z0-9_-]+)/,     // ?id=FILE_ID
    /\/file\/d\/([a-zA-Z0-9_-]+)/, // /file/d/FILE_ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

/**
 * Create JWT for Google Service Account authentication
 * @returns {string} - JWT token
 */
const createJWT = () => {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: SERVICE_ACCOUNT.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, // 1 hour
    iat: now
  };
  
  // Note: In production, use a proper JWT library
  // For now, we'll use Google's OAuth2 token endpoint directly
  return btoa(JSON.stringify(header)) + '.' + btoa(JSON.stringify(payload));
};

/**
 * Get OAuth2 access token using Service Account
 * @returns {Promise<string>} - Access token
 */
const getAccessToken = async () => {
  // Return cached token if still valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  
  try {
    // Import the JWT library dynamically (you'll need to install: npm install jsonwebtoken)
    // For browser, we'll use a different approach - proxy through your backend
    
    // IMPORTANT: In production, this should be done on your backend/Lambda
    // The private key should NEVER be exposed to the frontend
    
    // For now, we'll use a direct approach (move to backend in production)
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: createJWT()
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to get access token');
    }
    
    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min before expiry
    
    return cachedToken;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
};

/**
 * Get direct image URL from Google Drive file ID via dedicated Drive Lambda
 * @param {string} fileId - Google Drive file ID
 * @returns {string} - Direct image URL through Drive Lambda proxy
 */
export const getDriveImageUrl = (fileId) => {
  if (!fileId) return null;
  
  // Use dedicated Drive Lambda via same API Gateway
  // Drive Lambda is NOT in VPC, so it can access Google OAuth
  const DRIVE_API_URL = 'https://sl2r0ip8zl.execute-api.ap-southeast-2.amazonaws.com';
  return `${DRIVE_API_URL}/drive/image/${fileId}`;
};

/**
 * Get thumbnail URL from Google Drive file ID
 * @param {string} fileId - Google Drive file ID
 * @param {number} size - Thumbnail size (default: 800)
 * @returns {string} - Thumbnail URL
 */
export const getDriveThumbnailUrl = (fileId, size = 800) => {
  if (!fileId) return null;
  
  // Google Drive thumbnail API (requires authentication)
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
};

/**
 * Fetch image from Google Drive (with authentication)
 * This should be called from your backend/Lambda to keep private key secure
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<string>} - Image URL (blob or base64)
 */
export const fetchAuthenticatedDriveImage = async (fileId) => {
  try {
    const accessToken = await getAccessToken();
    
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    // Convert to blob URL
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error fetching Drive image:', error);
    return null;
  }
};

/**
 * Convert Google Drive URL to direct image URL
 * @param {string} url - Google Drive URL
 * @param {boolean} useAuthentication - Whether to use authenticated access
 * @returns {Promise<string|null>} - Direct image URL
 */
export const convertDriveUrl = async (url, useAuthentication = false) => {
  const fileId = extractFileId(url);
  
  if (!fileId) {
    return url; // Return original URL if not a Drive URL
  }
  
  if (useAuthentication) {
    // Use authenticated access (requires backend/Lambda)
    return await fetchAuthenticatedDriveImage(fileId);
  } else {
    // Use public access (works if file is shared with "Anyone with the link")
    return getDriveImageUrl(fileId);
  }
};

/**
 * Get file metadata from Google Drive
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<Object>} - File metadata
 */
export const getDriveFileMetadata = async (fileId) => {
  try {
    const accessToken = await getAccessToken();
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webViewLink,webContentLink`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching Drive metadata:', error);
    return null;
  }
};

/**
 * Check if file is publicly accessible
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<boolean>} - Whether file is public
 */
export const isFilePublic = async (fileId) => {
  try {
    // Try accessing without authentication
    const url = getDriveImageUrl(fileId);
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};

export default {
  extractFileId,
  getDriveImageUrl,
  getDriveThumbnailUrl,
  fetchAuthenticatedDriveImage,
  convertDriveUrl,
  getDriveFileMetadata,
  isFilePublic
};

