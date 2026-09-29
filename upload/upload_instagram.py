"""
Instagram Reels Upload - Using tmpfiles.org for Public URL
Uploads video to tmpfiles.org, then uses URL for Instagram API
"""

import os
import requests
import time
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
from pathlib import Path
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

def upload_to_instagram(video_path, caption, is_story=False):
    """
    Upload video to Instagram via temporary public URL.
    Can be a Reel or a Story.
    """
    media_type = 'STORIES' if is_story else 'REELS'
    
    print("\n" + "=" * 60)
    print(f"📸 INSTAGRAM {media_type} UPLOAD STARTING")
    print("=" * 60)
    
    # Get credentials with fallbacks
    access_token = os.getenv('INSTAGRAM_ACCESS_TOKEN') or os.getenv('FACEBOOK_ACCESS_TOKEN')
    user_id = os.getenv('INSTAGRAM_ACCOUNT_ID') or os.getenv('IG_USER_ID')
    
    # Debug info (masked)
    def mask(s): return f"{s[:10]}...{s[-4:]}" if s and len(s) > 10 else ("PLACEHOLDER" if s == "***" else "MISSING")
    print(f"[instagram] User ID Provided: {user_id}")
    print(f"[instagram] Access Token: {mask(access_token)}")

    if not access_token:
        raise ValueError("❌ INSTAGRAM_ACCESS_TOKEN not set")
    
    # AUTO-DETECTION: If token is IGAA (Personal/Standard), the ID might be different
    # Use graph.facebook.com endpoint which works with both token types
    if access_token.startswith('IGAA'):
        print("[instagram] 🔍 Detected 'IGAA' token (Instagram Basic/Standard API)")
        print("[instagram] Fetching correct ID for this token...")
        try:
            # Use graph.facebook.com instead of graph.instagram.com for better compatibility
            me_resp = requests.get(f"https://graph.facebook.com/me?fields=id,username&access_token={access_token}", timeout=10)
            if me_resp.status_code == 200:
                me_data = me_resp.json()
                detected_id = me_data.get('id')
                if detected_id and detected_id != user_id:
                    print(f"[instagram] ⚠️  ID Mismatch! Provided: {user_id}, Detected: {detected_id}")
                    print(f"[instagram] 🔄 Using detected ID: {detected_id}")
                    user_id = detected_id
            else:
                print(f"[instagram] ⚠️  Could not verify token: {me_resp.text}")
        except Exception as e:
            print(f"[instagram] ⚠️  Error during ID verification: {e}")

    if not user_id:
        raise ValueError("❌ INSTAGRAM_ACCOUNT_ID not set")
    
    print(f"[instagram] ✅ Credentials loaded")
    
    # Check video file
    video_path_obj = Path(video_path)
    if not video_path_obj.exists():
        error_msg = f"❌ Video file not found: {video_path}"
        print(f"[instagram] {error_msg}")
        raise FileNotFoundError(error_msg)
    
    file_size_mb = video_path_obj.stat().st_size / (1024 * 1024)
    print(f"[instagram] ✅ Video file found: {video_path}")
    print(f"[instagram] Video size: {file_size_mb:.2f} MB")
    
    # Limit caption
    caption_limited = caption[:2200] if len(caption) > 2200 else caption
    print(f"[instagram] Caption length: {len(caption_limited)} characters")
    
    try:
        container_id = None
        file_size = video_path_obj.stat().st_size

        # Method A: Direct Resumable Upload (Official Meta rupload - 0 third-party hosts)
        print(f"[instagram] 🚀 Attempting direct Meta Resumable Upload (rupload)...")
        for base_domain in ['graph.facebook.com', 'graph.instagram.com']:
            try:
                init_url = f"https://{base_domain}/v21.0/{user_id}/media"
                init_data = {
                    'upload_type': 'resumable',
                    'media_type': media_type,
                    'access_token': access_token
                }
                if not is_story:
                    init_data['caption'] = caption_limited
                    init_data['share_to_feed'] = 'false'
                    init_data['thumb_offset'] = '8000'

                init_res = requests.post(init_url, data=init_data, timeout=30)
                if init_res.status_code == 200:
                    init_data_res = init_res.json()
                    cid = init_data_res.get('id')
                    upload_uri = init_data_res.get('uri')
                    if cid and upload_uri:
                        print(f"[instagram] Resumable container initialized: {cid}")
                        print(f"[instagram] Streaming {file_size_mb:.2f} MB directly to Meta rupload...")
                        with open(video_path_obj, 'rb') as vf:
                            rupload_headers = {
                                'Authorization': f'OAuth {access_token}',
                                'offset': '0',
                                'file_size': str(file_size),
                                'Content-Type': 'application/octet-stream'
                            }
                            up_res = requests.post(upload_uri, data=vf, headers=rupload_headers, timeout=300)
                            if up_res.status_code == 200:
                                print(f"[instagram] ✅ Direct upload to Meta rupload complete!")
                                container_id = cid
                                break
                            else:
                                print(f"[instagram] ⚠️ Binary upload to {upload_uri[:40]} returned {up_res.status_code}: {up_res.text[:200]}")
                else:
                    print(f"[instagram] ⚠️ Resumable init on {base_domain} failed: {init_res.status_code} {init_res.text[:200]}")
            except Exception as e:
                print(f"[instagram] ⚠️ Resumable attempt failed on {base_domain}: {e}")

        # Method B: Fallback to Public Video URL Hosting if resumable did not succeed
        if not container_id:
            print(f"[instagram] 📤 Falling back to public hosting for direct video URL...")
            try:
                from upload.video_host import get_public_video_url
            except ImportError:
                from video_host import get_public_video_url

            video_url = get_public_video_url(video_path_obj)
            print(f"[instagram] ✅ Direct video URL ready: {video_url}")

            container_params = {
                'media_type': media_type,
                'video_url': video_url,
                'access_token': access_token
            }
            if not is_story:
                container_params['caption'] = caption_limited
                container_params['share_to_feed'] = 'false'
                container_params['thumb_offset'] = '8000'

            for base_domain in ['graph.facebook.com', 'graph.instagram.com']:
                container_url = f"https://{base_domain}/v21.0/{user_id}/media"
                c_res = requests.post(container_url, params=container_params, timeout=60)
                if c_res.status_code == 200:
                    container_id = c_res.json().get('id')
                    print(f"[instagram] ✅ Container created via URL on {base_domain}: {container_id}")
                    break
                else:
                    print(f"[instagram] ⚠️ Container creation on {base_domain} failed: {c_res.status_code} {c_res.text[:200]}")

        if not container_id:
            raise Exception("❌ Failed to create Instagram container via both Resumable and Public URL methods")

        print(f"[instagram] ✅ Container active: {container_id}")
        
        # Step 3: Wait for processing
        print(f"[instagram] ⏳ Step 3: Waiting for video processing...")
        max_wait = 180 # Increased wait time
        waited = 0

        while waited < max_wait:
            # Check status on graph.facebook.com (primary endpoint)
            status_url = f"https://graph.facebook.com/v21.0/{container_id}"
            status_params = {
                'fields': 'status_code',
                'access_token': access_token
            }

            status_response = requests.get(status_url, params=status_params, timeout=30)

            # Fallback if status check fails on facebook.com
            if status_response.status_code != 200:
                status_url = f"https://graph.instagram.com/v21.0/{container_id}"
                status_response = requests.get(status_url, params=status_params, timeout=30)

            status_data = status_response.json()
            status_code = status_data.get('status_code', 'UNKNOWN')

            print(f"[instagram] Status: {status_code} (waited {waited}s)")

            if status_code == 'FINISHED':
                print(f"[instagram] ✅ Video processing complete!")
                break
            elif status_code == 'ERROR':
                error_msg = status_data.get('error_message', 'Video processing failed')
                print(f"[instagram] ❌ {error_msg}")
                raise Exception(error_msg)

            time.sleep(10)
            waited += 10

        if waited >= max_wait:
            error_msg = "Video processing timed out"
            print(f"[instagram] ❌ {error_msg}")
            raise Exception(error_msg)
        
        # Step 4: Publish
        print(f"[instagram] 📤 Step 4: Publishing to Instagram... (Adding 5s buffer)")
        time.sleep(5) # Small buffer because IG sometimes says FINISHED before it's actually ready

        # Use graph.facebook.com as primary endpoint for publishing
        publish_url = f"https://graph.facebook.com/v21.0/{user_id}/media_publish"
        publish_params = {
            'creation_id': container_id,
            'access_token': access_token
        }

        # Robust Retry Logic for Publishing
        max_publish_retries = 3
        publish_response = None

        for attempt in range(max_publish_retries):
            publish_response = requests.post(publish_url, params=publish_params, timeout=60)

            if publish_response.status_code == 200:
                break
            else:
                print(f"[instagram] ⚠️ Publish attempt {attempt+1} failed. Retrying...")
                time.sleep(10)

            # Fallback to instagram.com if facebook.com consistently fails
            if attempt == max_publish_retries - 1:
                publish_url = f"https://graph.instagram.com/v21.0/{user_id}/media_publish"
                publish_response = requests.post(publish_url, params=publish_params, timeout=60)

        if not publish_response or publish_response.status_code != 200:
            error_data = publish_response.json() if publish_response and publish_response.text else {}
            error_msg = error_data.get('error', {}).get('message', 'Unknown error')
            print(f"[instagram] ❌ Publish failed after retries: {error_msg}")
            raise Exception(f"Instagram Publish Error: {error_msg}")
        
        media_id = publish_response.json().get('id')
        
        print(f"[instagram] ✅ SUCCESS! Video published to Instagram!")
        print(f"[instagram] Media ID: {media_id}")
        print(f"[instagram] Check your Instagram profile to see the post!")
        print("=" * 60)
        
        return {
            'id': media_id,
            'platform': 'instagram',
            'status': 'success'
        }
        
    except Exception as e:
        print(f"[instagram] ❌ ERROR!")
        print(f"[instagram] {str(e)}")
        print("=" * 60)
        raise

if __name__ == '__main__':
    video_file = Path('ielts_short.mp4')
    if video_file.exists():
        try:
            result = upload_to_instagram(str(video_file), "IELTS Band 9 Upgrade! #IELTS #English")
            print(f"\n✅ Success! Result: {result}")
        except Exception as e:
            print(f"\n❌ Failed: {e}")
    else:
        print(f"❌ Video not found: {video_file}")
