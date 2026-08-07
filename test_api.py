import urllib.request, json, pyotp, sys

BASE = "http://localhost:9151"

# Login
data = json.dumps({"email": "jbargoin@gmail.com", "password": "admin123"}).encode()
req = urllib.request.Request(f"{BASE}/api/login", data=data, headers={"Content-Type": "application/json"})
login = json.loads(urllib.request.urlopen(req).read())
sid = login["session_id"]
print(f"Login OK: session={sid[:20]}...", flush=True)

# MFA
code = pyotp.TOTP('47EUTBUWMWBWXLMOX4JQ3HIMZEZYLE4P').now()
data = json.dumps({"session_id": sid, "code": code}).encode()
req = urllib.request.Request(f"{BASE}/api/mfa", data=data, headers={"Content-Type": "application/json"})
mfa = json.loads(urllib.request.urlopen(req).read())
token = mfa["token"]
print(f"MFA OK: token={token[:20]}...", flush=True)

# Test chat
print("Sending to patron...", flush=True)
data = json.dumps({"agent": "patron", "message": "Dis OK"}).encode()
req = urllib.request.Request(f"{BASE}/api/chat", data=data, headers={
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
})
try:
    r = urllib.request.urlopen(req, timeout=60)
    resp = json.loads(r.read())
    print(f"RESPONSE: {json.dumps(resp, ensure_ascii=False)}", flush=True)
except Exception as e:
    print(f"ERROR: {e}", flush=True)
    sys.exit(1)