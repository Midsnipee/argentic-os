#!/usr/bin/env bash
# Quick test: API login + MFA + chat
set -e

TOKEN=$(/opt/data/.venv-argentic-api/bin/python3 -c "
import pyotp,urllib.request,json
# login
d=json.dumps({'email':'jbargoin@gmail.com','password':'admin123'}).encode()
r=urllib.request.urlopen(urllib.request.Request('http://localhost:9151/api/login',data=d,headers={'Content-Type':'application/json'}))
sid=json.loads(r.read())['session_id']
# mfa
code=pyotp.TOTP('47EUTBUWMWBWXLMOX4JQ3HIMZEZYLE4P').now()
d=json.dumps({'session_id':sid,'code':code}).encode()
r=urllib.request.urlopen(urllib.request.Request('http://localhost:9151/api/mfa',data=d,headers={'Content-Type':'application/json'}))
print(json.loads(r.read())['token'])
")

echo "Token: ${TOKEN:0:30}..."
echo "--- Chat ---"
curl -s -X POST http://localhost:9151/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"agent":"patron","message":"Dis juste OK"}' \
  --max-time 120