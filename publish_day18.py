
import sys
import json
import os
import subprocess
import time
from pathlib import Path
from dotenv import load_dotenv

# Add the root directory to sys.path
current_dir = Path(__file__).parent.absolute()
root_dir = current_dir.parent.absolute()
sys.path.append(str(root_dir))

# Import upload functions
try:
    from upload.upload_instagram import upload_to_instagram
    from upload.upload_facebook import upload_to_facebook
    from upload.upload_threads import upload_to_threads
    from upload.upload_to_youtube import upload_to_youtube
    from upload.upload_twitter import upload_to_twitter
    print("✅ Successfully imported all upload modules.")
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

def run_command(command, cwd=None):
    print(f"🚀 Running: {command}")
    try:
        subprocess.run(command, check=True, shell=True, cwd=cwd)
        print("✅ Command finished successfully.")
    except subprocess.CalledProcessError as e:
        print(f"❌ Command failed: {e}")
        sys.exit(1)

def main():
    # Load .env from root
    load_dotenv(dotenv_path=root_dir / '.env')
    
    # Paths
    scripts_dir = current_dir / "scripts"
    # day_18 has generated file at root
    data_file = current_dir / "current_topic.json"
    metadata_file = current_dir / "metadata.json"
    video_path = current_dir / "recording.mp4"
    
    # 1. Generate New Topic
    print("\n" + "="*50)
    print("🎨 STEP 1: GENERATING NEW TOPIC")
    print("="*50)
    run_command("node generate_topic.js", cwd=current_dir)
    
    if not data_file.exists():
        print(f"❌ Failed to generate topic file at {data_file}")
        sys.exit(1)
        
    with open(data_file, 'r', encoding='utf-8') as f:
        topic_data = json.load(f)
        
    topic_title = topic_data.get("topic", "Comparison Chart")
    topic_tagline = topic_data.get("description", "Visualizing Trends")
    print(f"✅ Topic Generated: {topic_title} - {topic_tagline}")
    
    # 2. Skip Metadata Generation (Using JSON directly)
    print("\n" + "="*50)
    print("🧠 STEP 2: USING GENERATED METADATA")
    print("="*50)
    metadata = {
        "title": topic_title,
        "tagline": topic_tagline,
        "hashtags": topic_data.get("instagram_caption", "").split("#")[-1] if "#" in topic_data.get("instagram_caption", "") else "#trends #data",
        "yt_description": topic_data.get("youtube_description", topic_tagline),
        "ig_caption": topic_data.get("instagram_caption", topic_tagline),
        "fb_caption": topic_data.get("facebook_caption", topic_tagline),
        "threads_caption": topic_data.get("threads_caption", topic_tagline),
    }
    
    # Fix hashtag parsing
    full_caption = topic_data.get("instagram_caption", "")
    import re
    tags = re.findall(r"#\w+", full_caption)
    metadata["hashtags"] = " ".join(tags)

    print("✅ Metadata extracted from current_topic.json")
    
    # 3. Record Video
    print("\n" + "="*50)
    print("🎥 STEP 3: RECORDING VIDEO")
    print("="*50)
    # Ensure dependencies are installed if needed, but assuming env is ready
    run_command("node capture_demo.js", cwd=current_dir)

    
    if not video_path.exists():
        print(f"❌ Failed to record video at {video_path}")
        sys.exit(1)
        
    print(f"✅ Video Recorded: {video_path}")
    
    # 4. Upload to Social Media
    print("\n" + "="*50)
    print("🚀 STEP 4: UPLOADING TO SOCIAL MEDIA")
    print("="*50)
    
    title = metadata.get("title", topic_title)
    hashtags = metadata.get("hashtags", "#algorithm #coding #tech")
    
    # --- YouTube ---
    print("\n🎬 [1/5] UPLOADING TO YOUTUBE...")
    try:
        yt_desc = metadata.get("yt_description", f"{topic_tagline}\n\n{hashtags}")
        # Parse hashtags string to list
        # Hashtags string often looks like "#tag1 #tag2"
        tags_list = [t.strip("#") for t in hashtags.split() if t.strip().startswith("#")]
        
        upload_to_youtube(
            video_path=video_path,
            title=title,
            description=yt_desc,
            tags=tags_list,
            category_id='28', # Science & Technology
            privacy_status='public'
        )
        print("✅ YouTube Upload Complete!")
    except Exception as e:
        print(f"❌ YouTube upload failed: {e}")

    # --- Instagram ---
    print("\n📸 [2/5] UPLOADING TO INSTAGRAM...")
    try:
        ig_caption = metadata.get("ig_caption", f"{title}\n\n{topic_tagline}\n\n{hashtags}")
        # Append likely missing hashtags if not included
        if "#" not in ig_caption:
            ig_caption += f"\n\n{hashtags}"
            
        upload_to_instagram(str(video_path), ig_caption, is_story=False)
        print("✅ Instagram Reel Upload Complete!")
    except Exception as e:
        print(f"❌ Instagram upload failed: {e}")

    # --- Facebook ---
    print("\n📘 [3/5] UPLOADING TO FACEBOOK...")
    try:
        fb_caption = metadata.get("fb_caption", f"⚡ {title} ⚡\n\n{topic_tagline}\n\n{hashtags}")
        upload_to_facebook(str(video_path), fb_caption, title=title)
        print("✅ Facebook Reel Upload Complete!")
    except Exception as e:
        print(f"❌ Facebook upload failed: {e}")

    # --- Threads ---
    print("\n🧵 [4/5] UPLOADING TO THREADS...")
    try:
        threads_caption = metadata.get("threads_caption", f"{title}\n\n{hashtags}")
        upload_to_threads(str(video_path), threads_caption)
        print("✅ Threads Upload Complete!")
    except Exception as e:
        print(f"❌ Threads upload failed: {e}")

    # --- Twitter ---
    print("\n🐦 [5/5] UPLOADING TO TWITTER...")
    try:
        # Twitter limit 280
        tw_caption = f"{title}\n{hashtags}"
        if len(tw_caption) > 280:
             tw_caption = f"{title}\n" + " ".join(hashtags.split()[:5])
             
        upload_to_twitter(str(video_path), tw_caption)
        print("✅ Twitter Upload Complete!")
    except Exception as e:
        print(f"❌ Twitter upload failed: {e}")

    print("\n" + "="*50)
    print("🏁 DAY 7 AUTOMATION COMPLETED!")
    print("="*50)

if __name__ == "__main__":
    main()
