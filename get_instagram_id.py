
import os
import requests
from dotenv import load_dotenv

def get_instagram_id():
    load_dotenv()
    access_token = os.getenv('INSTAGRAM_ACCESS_TOKEN')
    
    # Instagram Graph API endpoint to get linked Facebook Pages
    url = "https://graph.facebook.com/v18.0/me/accounts"
    params = {
        'access_token': access_token
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    if 'data' in data and len(data['data']) > 0:
        for page in data['data']:
            page_id = page.get('id')
            page_name = page.get('name')
            
            # Now get Instagram Business Account linked to this page
            ig_url = f"https://graph.facebook.com/v18.0/{page_id}"
            ig_params = {
                'fields': 'instagram_business_account',
                'access_token': access_token
            }
            ig_res = requests.get(ig_url, params=ig_params).json()
            ig_account = ig_res.get('instagram_business_account')
            
            if ig_account:
                print(f"PAGE: {page_name} | IG_ACCOUNT_ID: {ig_account.get('id')}")
            else:
                print(f"PAGE: {page_name} | No IG Business Account linked.")
    else:
        print("No Facebook Pages found for this token.")

if __name__ == "__main__":
    get_instagram_id()
