
import os
import requests
from dotenv import load_dotenv

def check_token():
    load_dotenv()
    token = os.getenv('FACEBOOK_ACCESS_TOKEN')
    res = requests.get(f"https://graph.facebook.com/v18.0/me?fields=id,name&access_token={token}").json()
    print(f"RES: {res}")

if __name__ == "__main__":
    check_token()
