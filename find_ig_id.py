
import os
import requests
from dotenv import load_dotenv

def find_instagram_id():
    load_dotenv()
    # Using the Facebook token because it usually has higher permissions for Page/IG management
    token = os.getenv('FACEBOOK_ACCESS_TOKEN')
    
    if not token:
        print("ERROR: FACEBOOK_ACCESS_TOKEN not found in .env")
        return

    print("Checking Facebook Pages associated with your token...")
    
    # Step 1: Get all Pages
    url = "https://graph.facebook.com/v18.0/me/accounts"
    params = {'access_token': token}
    
    try:
        response = requests.get(url, params=params)
        res_data = response.json()
        
        if 'error' in res_data:
            print(f"API Error: {res_data['error'].get('message')}")
            return
            
        pages = res_data.get('data', [])
        if not pages:
            print("No Facebook Pages found. Make sure your token has 'pages_show_list' permission.")
            return

        print(f"Found {len(pages)} pages. Searching for linked Instagram accounts...")
        
        for page in pages:
            page_id = page.get('id')
            page_name = page.get('name')
            print(f"\nChecking Page: {page_name} ({page_id})")
            
            # Step 2: Get Instagram Business Account for this Page
            ig_url = f"https://graph.facebook.com/v18.0/{page_id}"
            ig_params = {
                'fields': 'instagram_business_account,name',
                'access_token': token
            }
            ig_res = requests.get(ig_url, params=ig_params).json()
            
            ig_account = ig_res.get('instagram_business_account')
            if ig_account:
                print("----------------------------------------")
                print(f"✅ SUCCESS! Linked Instagram Account Found:")
                print(f"   IG_ACCOUNT_ID: {ig_account.get('id')}")
                print("----------------------------------------")
            else:
                print("   No Instagram Business Account linked to this page.")
                
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    find_instagram_id()
