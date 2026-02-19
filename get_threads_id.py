
import os
import requests
from dotenv import load_dotenv

def get_threads_user_id():
    load_dotenv()
    access_token = os.getenv('THREADS_ACCESS_TOKEN')
    
    # Threads API endpoint to get current user info
    url = "https://graph.threads.net/v1.0/me"
    params = {
        'fields': 'id,username',
        'access_token': access_token
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    print(f"ID: {data.get('id')} | USERNAME: {data.get('username')}")

if __name__ == "__main__":
    get_threads_user_id()
