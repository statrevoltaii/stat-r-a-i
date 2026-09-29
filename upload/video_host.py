import requests
from pathlib import Path

def get_public_video_url(video_path):
    """
    Uploads a video to reliable public temporary hosting that returns a direct
    raw video/mp4 stream for Instagram and Threads Graph APIs.
    """
    video_path_obj = Path(video_path)
    if not video_path_obj.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    print(f"[hosting] 📤 Uploading video ({video_path_obj.name}) to public direct hosting...")

    # Provider 1: Catbox.moe (Direct raw MP4 stream, fast, permanent, no Cloudflare block)
    try:
        print("[hosting] Attempting upload via catbox.moe...")
        with open(video_path_obj, 'rb') as vf:
            data = {'reqtype': 'fileupload'}
            files = {'fileToUpload': (video_path_obj.name, vf, 'video/mp4')}
            resp = requests.post('https://catbox.moe/user/api.php', data=data, files=files, timeout=120)
            if resp.status_code == 200 and resp.text.startswith('http'):
                url = resp.text.strip()
                print(f"[hosting] ✅ Success via catbox: {url}")
                return url
    except Exception as e:
        print(f"[hosting] ⚠️ catbox attempt failed: {e}")

    # Provider 2: Uguu.se (Instant, raw direct MP4 stream, supports byte-ranges)
    try:
        print("[hosting] Attempting upload via uguu.se...")
        with open(video_path_obj, 'rb') as vf:
            files = {'files[]': (video_path_obj.name, vf, 'video/mp4')}
            resp = requests.post('https://uguu.se/upload', files=files, timeout=120)
            if resp.status_code == 200:
                data = resp.json()
                if data.get('success') and len(data.get('files', [])) > 0:
                    url = data['files'][0]['url']
                    print(f"[hosting] ✅ Success via uguu.se: {url}")
                    return url
    except Exception as e:
        print(f"[hosting] ⚠️ uguu.se attempt failed: {e}")

    # Provider 3: Fallback tmpfiles.org
    try:
        print("[hosting] Attempting upload via tmpfiles.org...")
        with open(video_path_obj, 'rb') as vf:
            files = {'file': (video_path_obj.name, vf, 'video/mp4')}
            resp = requests.post('https://tmpfiles.org/api/v1/upload', files=files, timeout=120)
            if resp.status_code == 200:
                d = resp.json()
                if d.get('status') == 'success':
                    turl = d.get('data', {}).get('url', '')
                    url = turl.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
                    print(f"[hosting] ✅ Success via tmpfiles: {url}")
                    return url
    except Exception as e:
        print(f"[hosting] ⚠️ tmpfiles attempt failed: {e}")

    raise Exception("All public video hosting services failed. Check network connectivity.")
