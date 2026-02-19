
import os
import requests
from dotenv import load_dotenv

def check_ig_basic():
    load_dotenv()
    token = os.getenv('INSTAGRAM_ACCESS_TOKEN')
    if not token:
        print("No token")
        return
    
    url = f"https://graph.instagram.com/me?fields=id,username&access_token={token}"
    res = requests.get(url).json()
    print(f"BASIC API RES: {res}")

if __name__ == "__main__":
    check_ig_basic()
