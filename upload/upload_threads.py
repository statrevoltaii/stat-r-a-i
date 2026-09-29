"""
Threads Upload - Enhanced Debugging Version
Uploads video to tmpfiles.org, then uses URL for Threads API
"""

import os
import requests
import time
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def upload_to_threads(video_path, text):
    """
    Upload video to Threads via temporary public URL.
    """
    
    print("\n" + "=" * 60)
    print("🧵 THREADS UPLOAD STARTING")
    print("=" * 60)
    
    # Get credentials
    access_token = os.getenv('THREADS_ACCESS_TOKEN')
    user_id = os.getenv('THREADS_USER_ID')
    
    # Debug info (masked)
    def mask(s): return f"{s[:4]}...{s[-4:]}" if s and len(s) > 8 else ("PLACEHOLDER (***)" if s == "***" else "MISSING")
    print(f"[threads] User ID: {user_id}")
    print(f"[threads] Access Token: {mask(access_token)}")

    if not access_token:
        error_msg = "❌ THREADS_ACCESS_TOKEN not set"
        print(f"[threads] {error_msg}")
        raise ValueError(error_msg)
    
    if not user_id:
        error_msg = "❌ THREADS_USER_ID not set"
        print(f"[threads] {error_msg}")
        raise ValueError(error_msg)
    
    print(f"[threads] ✅ Credentials loaded")
    
    # Check video file
    video_path_obj = Path(video_path)
    if not video_path_obj.exists():
        error_msg = f"❌ Video file not found: {video_path}"
        print(f"[threads] {error_msg}")
        raise FileNotFoundError(error_msg)
    
    file_size_mb = video_path_obj.stat().st_size / (1024 * 1024)
    print(f"[threads] ✅ Video file found: {video_path}")
    print(f"[threads] Video size: {file_size_mb:.2f} MB")
    
    # Limit text
    text_limited = text[:500] if len(text) > 500 else text
    print(f"[threads] Text length: {len(text_limited)} characters")
    
    try:
        container_id = None
        file_size = video_path_obj.stat().st_size

        # Method A: Direct Resumable Upload (Threads rupload protocol)
        print(f"[threads] 🚀 Attempting direct Threads Resumable Upload...")
        for api_version in ['v1.0', 'v18.0']:
            try:
                init_url = f"https://graph.threads.net/{api_version}/{user_id}/threads"
                init_params = {
                    'media_type': 'VIDEO',
                    'upload_type': 'resumable',
                    'text': text_limited,
                    'access_token': access_token
                }
                init_resp = requests.post(init_url, params=init_params, timeout=30)
                if init_resp.status_code == 200:
                    init_data = init_resp.json()
                    cid = init_data.get('id')
                    upload_uri = init_data.get('uri')
                    if cid and upload_uri:
                        print(f"[threads] Resumable container initialized with API {api_version}: {cid}")
                        with open(video_path_obj, 'rb') as f:
                            rupload_headers = {
                                'Authorization': f'OAuth {access_token}',
                                'offset': '0',
                                'file_size': str(file_size),
                                'Content-Type': 'application/octet-stream'
                            }
                            up_res = requests.post(upload_uri, data=f, headers=rupload_headers, timeout=300)
                            if up_res.status_code == 200:
                                print(f"[threads] ✅ Direct upload to Threads rupload complete!")
                                container_id = cid
                                break
                            else:
                                print(f"[threads] ⚠️ Binary upload to Threads {upload_uri[:40]} returned {up_res.status_code}")
                else:
                    print(f"[threads] ⚠️ Resumable init on API {api_version} returned {init_resp.status_code}")
            except Exception as e:
                print(f"[threads] ⚠️ Resumable attempt failed on {api_version}: {e}")

        # Method B: Fallback to Public Video URL Hosting if resumable did not complete
        if not container_id:
            print(f"[threads] 📤 Falling back to public hosting for direct video URL...")
            try:
                from upload.video_host import get_public_video_url
            except ImportError:
                from video_host import get_public_video_url

            video_url = get_public_video_url(video_path_obj)
            print(f"[threads] ✅ Direct video URL ready: {video_url}")

            for api_version in ['v1.0', 'v18.0']:
                container_url = f"https://graph.threads.net/{api_version}/{user_id}/threads"
                container_params = {
                    'media_type': 'VIDEO',
                    'video_url': video_url,
                    'text': text_limited,
                    'access_token': access_token
                }
                c_res = requests.post(container_url, params=container_params, timeout=60)
                if c_res.status_code == 200:
                    container_id = c_res.json().get('id')
                    print(f"[threads] ✅ Container created via URL with API {api_version}: {container_id}")
                    break
                else:
                    print(f"[threads] ⚠️ Container creation with API {api_version} failed: {c_res.status_code} {c_res.text[:200]}")

        if not container_id:
            raise Exception("❌ Failed to create Threads container via both Resumable and Public URL methods")

        print(f"[threads] ✅ Container active: {container_id}")
        
        # Step 3: Wait for processing
        print(f"[threads] ⏳ Step 3: Waiting for video processing...")
        max_wait = 120
        waited = 0
        
        while waited < max_wait:
            status_url = f"https://graph.threads.net/v1.0/{container_id}"
            status_params = {
                'fields': 'status',
                'access_token': access_token
            }
            
            status_response = requests.get(status_url, params=status_params, timeout=30)
            status_data = status_response.json()
            status = status_data.get('status', 'UNKNOWN')
            
            print(f"[threads] Status: {status} (waited {waited}s)")
            
            if status == 'FINISHED':
                print(f"[threads] ✅ Video processing complete!")
                break
            elif status == 'ERROR':
                error_msg = status_data.get('error_message', 'Video processing failed')
                print(f"[threads] ❌ {error_msg}")
                raise Exception(error_msg)
            
            time.sleep(10)
            waited += 10
        
        if waited >= max_wait:
            error_msg = "Video processing timed out"
            print(f"[threads] ❌ {error_msg}")
            raise Exception(error_msg)
        
        # Step 4: Publish
        print(f"[threads] 📤 Step 4: Publishing to Threads...")
        publish_url = f"https://graph.threads.net/v1.0/{user_id}/threads_publish"
        publish_params = {
            'creation_id': container_id,
            'access_token': access_token
        }
        
        publish_response = requests.post(publish_url, params=publish_params, timeout=60)
        
        if publish_response.status_code != 200:
            error_data = publish_response.json() if publish_response.text else {}
            error_msg = error_data.get('error', {}).get('message', 'Unknown error')
            print(f"[threads] ❌ Publish failed: {error_msg}")
            raise Exception(f"Threads Publish Error: {error_msg}")
        
        thread_id = publish_response.json().get('id')
        
        print(f"[threads] ✅ SUCCESS! Video published to Threads!")
        print(f"[threads] Thread ID: {thread_id}")
        print(f"[threads] Check your Threads profile to see the post!")
        print("=" * 60)
        
        return {
            'id': thread_id,
            'platform': 'threads',
            'status': 'success'
        }
        
    except Exception as e:
        print(f"[threads] ❌ ERROR!")
        print(f"[threads] {str(e)}")
        print("=" * 60)
        raise

if __name__ == '__main__':
    video_file = Path('output/final_video.mp4')
    if video_file.exists():
        try:
            result = upload_to_threads(str(video_file), "Test upload")
            print(f"\n✅ Success! Result: {result}")
        except Exception as e:
            print(f"\n❌ Failed: {e}")
    else:
        print(f"❌ Video not found: {video_file}")
