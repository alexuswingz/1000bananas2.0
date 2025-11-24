"""
Google Drive Image Proxy Lambda Function
Handles authenticated access to Google Drive files
No VPC - runs with internet access
"""

import json
import os
import base64
import time

# Try to import Google Drive dependencies
try:
    import jwt
    import requests
    import google.auth
    import googleapiclient.discovery
    GOOGLE_DRIVE_ENABLED = True
    print(f"✅ Google Drive enabled!")
except ImportError as e:
    GOOGLE_DRIVE_ENABLED = False
    print(f"❌ WARNING: Google Drive dependencies not found: {e}")

# Load service account info from environment variable
SERVICE_ACCOUNT_INFO = json.loads(os.environ.get('GOOGLE_SERVICE_ACCOUNT_KEY', '{}'))
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

# Token cache
token_cache = {'token': None, 'expiry': 0}

def cors_response(status_code, body):
    """Helper function to create CORS-enabled response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        'body': json.dumps(body)
    }

def get_google_access_token():
    """Get OAuth2 access token using service account"""
    # Check cache
    if token_cache['token'] and time.time() < token_cache['expiry']:
        return token_cache['token']
    
    if not SERVICE_ACCOUNT_INFO:
        raise Exception("Service account key not configured")
    
    # Create JWT
    now = int(time.time())
    payload = {
        'iss': SERVICE_ACCOUNT_INFO['client_email'],
        'scope': 'https://www.googleapis.com/auth/drive.readonly',
        'aud': 'https://oauth2.googleapis.com/token',
        'exp': now + 3600,
        'iat': now
    }
    
    # Sign JWT
    token = jwt.encode(payload, SERVICE_ACCOUNT_INFO['private_key'], algorithm='RS256')
    
    # Exchange JWT for access token
    response = requests.post(
        'https://oauth2.googleapis.com/token',
        data={
            'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion': token
        }
    )
    
    if response.status_code != 200:
        raise Exception(f"Failed to get access token: {response.text}")
    
    data = response.json()
    token_cache['token'] = data['access_token']
    token_cache['expiry'] = now + data['expires_in'] - 60  # Refresh 1 min early
    
    return token_cache['token']

def get_drive_image(event):
    """GET /drive/image/{fileId} - Fetch image from Google Drive"""
    print(f"get_drive_image called! GOOGLE_DRIVE_ENABLED = {GOOGLE_DRIVE_ENABLED}")
    
    if not GOOGLE_DRIVE_ENABLED:
        return cors_response(503, {
            'success': False,
            'error': 'Google Drive features not available - missing dependencies'
        })
    
    try:
        # Extract file_id from path
        path = event.get('path') or event.get('rawPath', '')
        file_id = path.split('/')[-1]
        
        if not file_id:
            return cors_response(400, {
                'success': False,
                'error': 'File ID is required'
            })
        
        print(f"Fetching file: {file_id}")
        
        # Get access token
        access_token = get_google_access_token()
        
        # Fetch file from Google Drive
        response = requests.get(
            f'https://www.googleapis.com/drive/v3/files/{file_id}?alt=media',
            headers={
                'Authorization': f'Bearer {access_token}'
            }
        )
        
        if response.status_code != 200:
            return cors_response(response.status_code, {
                'success': False,
                'error': f'Failed to fetch image from Drive: {response.text}'
            })
        
        # Get content type
        content_type = response.headers.get('Content-Type', 'image/jpeg')
        
        # Return image data as base64
        image_data = base64.b64encode(response.content).decode('utf-8')
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': content_type,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Cache-Control': 'max-age=86400'  # Cache for 24 hours
            },
            'body': image_data,
            'isBase64Encoded': True
        }
        
    except Exception as e:
        import traceback
        print(f"Error: {e}")
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })

def get_drive_metadata(event):
    """GET /drive/metadata/{fileId} - Get file metadata from Google Drive"""
    if not GOOGLE_DRIVE_ENABLED:
        return cors_response(503, {
            'success': False,
            'error': 'Google Drive features not available - missing dependencies'
        })
    
    try:
        # Extract file_id from path
        path = event.get('path') or event.get('rawPath', '')
        file_id = path.split('/')[-1]
        
        if not file_id:
            return cors_response(400, {
                'success': False,
                'error': 'File ID is required'
            })
        
        # Get access token
        access_token = get_google_access_token()
        
        # Get file metadata
        response = requests.get(
            f'https://www.googleapis.com/drive/v3/files/{file_id}?fields=id,name,mimeType,size,webViewLink,thumbnailLink',
            headers={
                'Authorization': f'Bearer {access_token}'
            }
        )
        
        if response.status_code != 200:
            return cors_response(response.status_code, {
                'success': False,
                'error': f'Failed to fetch metadata: {response.text}'
            })
        
        return cors_response(200, {
            'success': True,
            'data': response.json()
        })
        
    except Exception as e:
        import traceback
        return cors_response(500, {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })

def lambda_handler(event, context):
    """Main Lambda handler"""
    print("Event:", json.dumps(event))
    
    http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod', 'GET')
    path = event.get('path') or event.get('rawPath', '')
    
    print(f"Method: {http_method}, Path: {path}")
    
    # Handle OPTIONS (CORS preflight)
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': ''
        }
    
    # Route to handlers
    if http_method == 'GET' and '/drive/image/' in path:
        return get_drive_image(event)
    elif http_method == 'GET' and '/drive/metadata/' in path:
        return get_drive_metadata(event)
    else:
        return cors_response(404, {
            'success': False,
            'error': 'Not found'
        })

