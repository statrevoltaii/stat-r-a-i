
import os
import requests
from dotenv import load_dotenv

def debug_token():
    load_dotenv()
    token = os.getenv('FACEBOOK_ACCESS_TOKEN')
    if not token:
        print("ERROR: FACEBOOK_ACCESS_TOKEN not found in .env")
        return

    print(f"Testing token starting with: {token[:10]}...")
    
    # 1. Check Identity
    me_url = f"https://graph.facebook.com/v18.0/me?fields=id,name&access_token={token}"
    me_res = requests.get(me_url).json()
    print(f"IDENTITY: {me_res}")

    if 'error' in me_res:
        return

    # 2. Check Permissions
    perm_url = f"https://graph.facebook.com/v18.0/me/permissions?access_token={token}"
    perm_res = requests.get(perm_url).json()
    print("\nPERMISSIONS:")
    if 'data' in perm_res:
        for p in perm_res['data']:
            if p['status'] == 'granted':
                print(f"✅ {p['permission']}")
            else:
                print(f"❌ {p['permission']} ({p['status']})")
    
    # 3. Check Linked Pages and Instagram Business Accounts
    print("\nSEARCHING FOR INSTAGRAM BUSINESS ACCOUNTS:")
    pages_url = f"https://graph.facebook.com/v18.0/me/accounts?access_token={token}"
    pages_res = requests.get(pages_url).json()
    
    if 'data' in pages_res:
        for page in pages_res['data']:
            page_id = page['id']
            page_name = page['name']
            print(f"\n- PAGE: {page_name} (ID: {page_id})")
            
            ig_url = f"https://graph.facebook.com/v18.0/{page_id}?fields=instagram_business_account&access_token={token}"
            ig_res = requests.get(ig_url).json()
            
            if 'instagram_business_account' in ig_res:
                ig_id = ig_res['instagram_business_account']['id']
                print(f"  ✨ FOUND INSTAGRAM BUSINESS ID: {ig_id}")
            else:
                print("  (No linked Instagram Business Account)")
    else:
        print("No Pages found for this token.")

if __name__ == "__main__":
    debug_token()
