"""Test the master records API."""
import sys
sys.path.insert(0, ".")
import requests

# Login as tehsil officer
resp = requests.post("http://localhost:8000/api/v1/auth/login", json={"email": "tehsilofficer@gov.in", "password": "TehsilOfficer123!"})
print("Login status:", resp.status_code)
if resp.status_code == 200:
    token = resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    records_resp = requests.get("http://localhost:8000/api/v1/tehsil-officer/records/master", headers=headers)
    print("Records status:", records_resp.status_code)
    data = records_resp.json()
    print(f"Records count: {len(data)}")
    for r in data[:5]:
        print(f"  - {r['record_id']} | {r['owner_name']} | tehsil={r.get('tehsil')}")
else:
    print(resp.text)

# Also test as piyush (super admin)
print("\n--- Testing as piyush (super_admin) ---")
resp2 = requests.post("http://localhost:8000/api/v1/auth/login", json={"email": "piyushobroy87@gmail.com", "password": "Admin@1234"})
print("Login status:", resp2.status_code)
if resp2.status_code == 200:
    token2 = resp2.json().get("access_token")
    headers2 = {"Authorization": f"Bearer {token2}"}
    records_resp2 = requests.get("http://localhost:8000/api/v1/tehsil-officer/records/master", headers=headers2)
    print("Records status:", records_resp2.status_code)
    try:
        data2 = records_resp2.json()
        print(f"Records count: {len(data2)}")
    except Exception as e:
        print("Response:", records_resp2.text[:500])
else:
    print(resp2.text[:300])
