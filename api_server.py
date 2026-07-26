#!/usr/bin/env python3
"""
Argentic OS — API Server
FastAPI : auth (JWT + TOTP MFA), endpoints agents, chat, models

Usage:
  python3 api_server.py              # HTTP (dev)
  python3 api_server.py --ssl        # HTTPS (production)
"""

import hashlib
import json
import os
import secrets
import subprocess
import sys
import time
import uuid
from datetime import datetime, timedelta
from functools import wraps
from pathlib import Path
from typing import Optional

import bcrypt
import jwt
import pyotp
import yaml
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

# ── Load .env ─────────────────────────────────────────────────────
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# ── Config ──────────────────────────────────────────────────────────
ARGENTIC_HOME = os.environ.get("ARGENTIC_HOME", "/opt/data/argentic-os")
HERMES_BIN = "/opt/hermes/bin/hermes"
HERMES_HOME = "/opt/data"
USERS_FILE = os.path.join(ARGENTIC_HOME, "users.json")
MODEL_OVERRIDES_FILE = os.path.join(ARGENTIC_HOME, "model_overrides.json")
JWT_SECRET = os.environ.get("JWT_SECRET", secrets.token_urlsafe(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
PORT = int(os.environ.get("PORT", "9151"))

# ── Modèles disponibles (curated OpenRouter) ────────────────────────
AVAILABLE_MODELS = [
    # ── Gratuit / Très économique ──
    {"id": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "provider": "OpenAI", "category": "Économique", "context": 128000, "cost": "$0.15/M"},
    {"id": "openai/gpt-4.1-nano", "name": "GPT-4.1 Nano", "provider": "OpenAI", "category": "Économique", "context": 1047576, "cost": "$0.10/M"},
    {"id": "google/gemini-2.5-flash-lite", "name": "Gemini 2.5 Flash Lite", "provider": "Google", "category": "Économique", "context": 1048576, "cost": "$0.10/M"},
    {"id": "meta-llama/llama-4-scout", "name": "Llama 4 Scout", "provider": "Meta", "category": "Économique", "context": 1310720, "cost": "$0.10/M"},
    {"id": "mistralai/mistral-small-24b-instruct-2501", "name": "Mistral Small 24B", "provider": "Mistral", "category": "Économique", "context": 32768, "cost": "$0.05/M"},
    {"id": "nvidia/nemotron-3-super-120b-a12b", "name": "Nemotron Super 120B", "provider": "NVIDIA", "category": "Économique", "context": 1000000, "cost": "$0.08/M"},
    {"id": "qwen/qwen3-30b-a3b-instruct-2507", "name": "Qwen 3 30B", "provider": "Alibaba", "category": "Économique", "context": 262144, "cost": "$0.05/M"},
    {"id": "nvidia/nemotron-3-nano-30b-a3b", "name": "Nemotron Nano 30B", "provider": "NVIDIA", "category": "Économique", "context": 262144, "cost": "$0.05/M"},
    # ── Medium ──
    {"id": "openai/gpt-4.1-mini", "name": "GPT-4.1 Mini", "provider": "OpenAI", "category": "Medium", "context": 1047576, "cost": "$0.40/M"},
    {"id": "google/gemini-2.5-flash", "name": "Gemini 2.5 Flash", "provider": "Google", "category": "Medium", "context": 1048576, "cost": "$0.30/M"},
    {"id": "meta-llama/llama-4-maverick", "name": "Llama 4 Maverick", "provider": "Meta", "category": "Medium", "context": 1048576, "cost": "$0.20/M"},
    {"id": "deepseek/deepseek-v4-flash", "name": "DeepSeek V4 Flash", "provider": "DeepSeek", "category": "Medium", "context": 1048576, "cost": "$0.14/M"},
    {"id": "deepseek/deepseek-chat-v3.1", "name": "DeepSeek V3.1", "provider": "DeepSeek", "category": "Medium", "context": 163840, "cost": "$0.25/M"},
    {"id": "deepseek/deepseek-v3.2", "name": "DeepSeek V3.2", "provider": "DeepSeek", "category": "Medium", "context": 163840, "cost": "$0.27/M"},
    {"id": "anthropic/claude-haiku-4.5", "name": "Claude Haiku 4.5", "provider": "Anthropic", "category": "Medium", "context": 200000, "cost": "$1.00/M"},
    {"id": "nvidia/nemotron-3-ultra-550b-a55b", "name": "Nemotron Ultra 550B", "provider": "NVIDIA", "category": "Medium", "context": 512288, "cost": "$0.60/M"},
    {"id": "mistralai/mistral-small-2603", "name": "Mistral Small 2603", "provider": "Mistral", "category": "Medium", "context": 262144, "cost": "$0.15/M"},
    # ── Puissant ──
    {"id": "openai/gpt-4o", "name": "GPT-4o", "provider": "OpenAI", "category": "Puissant", "context": 128000, "cost": "$2.50/M"},
    {"id": "openai/gpt-4.1", "name": "GPT-4.1", "provider": "OpenAI", "category": "Puissant", "context": 1047576, "cost": "$2.00/M"},
    {"id": "google/gemini-2.5-pro", "name": "Gemini 2.5 Pro", "provider": "Google", "category": "Puissant", "context": 1048576, "cost": "$1.25/M"},
    {"id": "anthropic/claude-sonnet-4.6", "name": "Claude Sonnet 4.6", "provider": "Anthropic", "category": "Puissant", "context": 1000000, "cost": "$3.00/M"},
    {"id": "anthropic/claude-sonnet-5", "name": "Claude Sonnet 5", "provider": "Anthropic", "category": "Puissant", "context": 1000000, "cost": "$2.00/M"},
    {"id": "deepseek/deepseek-v4-pro", "name": "DeepSeek V4 Pro", "provider": "DeepSeek", "category": "Puissant", "context": 1048576, "cost": "$0.43/M"},
    {"id": "deepseek/deepseek-r1", "name": "DeepSeek R1 (Reasoning)", "provider": "DeepSeek", "category": "Puissant", "context": 163840, "cost": "$0.70/M"},
    {"id": "mistralai/mistral-large-2512", "name": "Mistral Large", "provider": "Mistral", "category": "Puissant", "context": 262144, "cost": "$0.50/M"},
    {"id": "nvidia/nemotron-3-ultra-550b-a55b:free", "name": "Nemotron Ultra 550B FREE", "provider": "NVIDIA", "category": "Puissant", "context": 1000000, "cost": "FREE"},
    # ── Premium ──
    {"id": "anthropic/claude-opus-4.8", "name": "Claude Opus 4.8", "provider": "Anthropic", "category": "Premium", "context": 1000000, "cost": "$5.00/M"},
    {"id": "openai/gpt-4o-search-preview", "name": "GPT-4o Search", "provider": "OpenAI", "category": "Premium", "context": 128000, "cost": "$2.50/M"},
    {"id": "google/lyria-3-pro-preview", "name": "Lyria 3 Pro (FREE)", "provider": "Google", "category": "Premium", "context": 1048576, "cost": "FREE"},
    {"id": "google/lyria-3-clip-preview", "name": "Lyria 3 Clip (FREE)", "provider": "Google", "category": "Premium", "context": 1048576, "cost": "FREE"},
]

# ── App ─────────────────────────────────────────────────────────────
app = FastAPI(title="Argentic OS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)

# ── Pydantic Models ─────────────────────────────────────────────────
class ChatRequest(BaseModel):
    agent: str
    message: str

class LoginRequest(BaseModel):
    email: str
    password: str

class MFARequest(BaseModel):
    session_id: str
    code: str

class SetupRequest(BaseModel):
    email: str
    password: str

class ModelUpdateRequest(BaseModel):
    model: str

# ── User Management ─────────────────────────────────────────────────
def _load_users() -> dict:
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE) as f:
            return json.load(f)
    return {}

def _save_users(data: dict):
    os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
    with open(USERS_FILE, "w") as f:
        json.dump(data, f, indent=2)

def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

# ── JWT ─────────────────────────────────────────────────────────────
def _create_jwt(email: str, user_id: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def _decode_jwt(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

async def _get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Token requis")
    try:
        payload = _decode_jwt(credentials.credentials)
        users = _load_users()
        user = users.get(payload["sub"])
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur introuvable")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

# ── Agent Management ────────────────────────────────────────────────
AGENTS_YAML = os.path.join(ARGENTIC_HOME, "agents.yaml")

def _load_agents() -> dict:
    with open(AGENTS_YAML) as f:
        config = yaml.safe_load(f)
    agents = dict(config["agents"])
    # Appliquer les overrides de modèle
    overrides = _load_model_overrides()
    for agent_id, model_id in overrides.items():
        if agent_id in agents:
            agents[agent_id]["model"] = model_id
    return agents

def _load_model_overrides() -> dict:
    if os.path.exists(MODEL_OVERRIDES_FILE):
        with open(MODEL_OVERRIDES_FILE) as f:
            return json.load(f)
    return {}

def _save_model_overrides(data: dict):
    with open(MODEL_OVERRIDES_FILE, "w") as f:
        json.dump(data, f, indent=2)

def _run_agent(agent_id: str, task: str) -> dict:
    """Exécute un agent Hermes et retourne le résultat."""
    agents = _load_agents()
    if agent_id not in agents:
        raise ValueError(f"Agent '{agent_id}' inconnu")

    agent = agents[agent_id]
    tools = ",".join(agent.get("tools", []))
    max_turns = agent.get("max_turns", 10)
    model = agent.get("model", "openai/gpt-4o-mini")

    prompt = f"{agent['role']}\n\nTÂCHE : {task}"

    try:
        proc = subprocess.run(
            [HERMES_BIN, "chat", "-q", prompt, "--quiet",
             "--max-turns", str(max_turns),
             "-m", model, "-t", tools, "--yolo"],
            capture_output=True, text=True, timeout=180,
            env={"HERMES_HOME": HERMES_HOME, "PATH": "/usr/local/bin:/usr/bin:/bin"},
        )
        output = proc.stdout.strip()
        if "\nsession_id:" in output:
            output = output.split("\nsession_id:")[0].strip()

        if proc.returncode != 0 and not output:
            return {"success": False, "error": proc.stderr.strip() or "Erreur inconnue"}

        return {"success": True, "response": output}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Timeout — l'agent a pris trop de temps"}
    except FileNotFoundError:
        return {"success": False, "error": "Hermes binaire introuvable"}

# ══════════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════════

# ── Setup (premier utilisateur) ─────────────────────────────────────
@app.post("/api/setup")
async def setup(req: SetupRequest):
    """Crée le premier compte admin (une seule fois)."""
    users = _load_users()
    if users:
        raise HTTPException(status_code=400, detail="Un compte existe déjà")

    user_id = str(uuid.uuid4())
    mfa_secret = pyotp.random_base32()

    users[user_id] = {
        "email": req.email,
        "password_hash": _hash_password(req.password),
        "mfa_secret": mfa_secret,
        "mfa_enabled": True,
        "created_at": datetime.utcnow().isoformat(),
        "role": "admin",
    }
    _save_users(users)

    totp = pyotp.TOTP(mfa_secret)
    provisioning_uri = totp.provisioning_uri(
        name=req.email, issuer_name="ArgenticOS"
    )

    return {
        "success": True,
        "mfa_secret": mfa_secret,
        "mfa_uri": provisioning_uri,
        "qr_hint": f"Scannez ce QR ou entrez la clé manuellement : {mfa_secret}",
    }

# ── Login ───────────────────────────────────────────────────────────
@app.post("/api/login")
async def login(req: LoginRequest):
    """Étape 1 : email + mot de passe → session MFA."""
    users = _load_users()
    user = None
    for uid, u in users.items():
        if u["email"] == req.email:
            user = {**u, "id": uid}
            break

    if not user or not _verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    mfa_session_id = secrets.token_urlsafe(32)
    mfa_sessions = _load_mfa_sessions()
    mfa_sessions[mfa_session_id] = {
        "user_id": user["id"],
        "expires_at": (datetime.utcnow() + timedelta(minutes=5)).isoformat(),
    }
    _save_mfa_sessions(mfa_sessions)

    return {"success": True, "mfa_required": True, "session_id": mfa_session_id}

# ── MFA ─────────────────────────────────────────────────────────────
MFA_SESSIONS_FILE = os.path.join(ARGENTIC_HOME, "mfa_sessions.json")

def _load_mfa_sessions() -> dict:
    if os.path.exists(MFA_SESSIONS_FILE):
        with open(MFA_SESSIONS_FILE) as f:
            return json.load(f)
    return {}

def _save_mfa_sessions(data: dict):
    os.makedirs(os.path.dirname(MFA_SESSIONS_FILE), exist_ok=True)
    now = datetime.utcnow()
    cleaned = {}
    for sid, s in data.items():
        try:
            if datetime.fromisoformat(s["expires_at"]) > now:
                cleaned[sid] = s
        except (ValueError, KeyError):
            pass
    with open(MFA_SESSIONS_FILE, "w") as f:
        json.dump(cleaned, f, indent=2)

@app.post("/api/mfa")
async def verify_mfa(req: MFARequest):
    """Étape 2 : code TOTP → JWT token."""
    mfa_sessions = _load_mfa_sessions()
    session = mfa_sessions.get(req.session_id)

    if not session:
        raise HTTPException(status_code=401, detail="Session MFA invalide ou expirée")

    try:
        expires = datetime.fromisoformat(session["expires_at"])
        if datetime.utcnow() > expires:
            raise HTTPException(status_code=401, detail="Session MFA expirée")
    except (ValueError, KeyError):
        raise HTTPException(status_code=401, detail="Session MFA invalide")

    users = _load_users()
    user = users.get(session["user_id"])
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    totp = pyotp.TOTP(user["mfa_secret"])
    if not totp.verify(req.code):
        raise HTTPException(status_code=401, detail="Code MFA invalide")

    del mfa_sessions[req.session_id]
    _save_mfa_sessions(mfa_sessions)

    token = _create_jwt(user["email"], session["user_id"])

    return {
        "success": True,
        "token": token,
        "user": {"email": user["email"], "role": user["role"]},
    }

# ── Modèles disponibles ─────────────────────────────────────────────
@app.get("/api/models")
async def list_models(user: dict = Depends(_get_current_user)):
    """Liste tous les modèles disponibles sur OpenRouter."""
    return {"models": AVAILABLE_MODELS}

# ── Agents ──────────────────────────────────────────────────────────
@app.get("/api/agents")
async def list_agents(user: dict = Depends(_get_current_user)):
    """Liste tous les agents avec leurs modèles actuels."""
    agents = _load_agents()
    return {
        "agents": [
            {
                "id": aid,
                "name": a["name"],
                "icon": a.get("icon", "🤖"),
                "model": a.get("model", "default"),
            }
            for aid, a in agents.items()
        ]
    }

@app.patch("/api/agents/{agent_id}/model")
async def update_agent_model(agent_id: str, req: ModelUpdateRequest, user: dict = Depends(_get_current_user)):
    """Change le modèle d'un agent."""
    agents = _load_agents()
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' inconnu")

    # Vérifier que le modèle est dans la liste
    valid_models = {m["id"] for m in AVAILABLE_MODELS}
    if req.model not in valid_models:
        raise HTTPException(status_code=400, detail=f"Modèle '{req.model}' non disponible")

    # Sauvegarder l'override
    overrides = _load_model_overrides()
    overrides[agent_id] = req.model
    _save_model_overrides(overrides)

    return {"success": True, "agent": agent_id, "model": req.model}

@app.delete("/api/agents/{agent_id}/model")
async def reset_agent_model(agent_id: str, user: dict = Depends(_get_current_user)):
    """Réinitialise le modèle d'un agent à sa valeur par défaut."""
    overrides = _load_model_overrides()
    if agent_id in overrides:
        del overrides[agent_id]
        _save_model_overrides(overrides)
    return {"success": True, "agent": agent_id, "model": "default"}

# ── Chat ────────────────────────────────────────────────────────────
@app.post("/api/chat")
async def chat(req: ChatRequest, user: dict = Depends(_get_current_user)):
    """Envoie un message à un agent spécifique."""
    try:
        result = _run_agent(req.agent, req.message)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ── Me ──────────────────────────────────────────────────────────────
@app.get("/api/me")
async def me(user: dict = Depends(_get_current_user)):
    """Infos sur l'utilisateur connecté."""
    return {"email": user["email"], "role": user["role"]}

# ── Health ──────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "agents_loaded": len(_load_agents())}

# ── Frontend ────────────────────────────────────────────────────────
FRONTEND_DIR = os.path.join(ARGENTIC_HOME, "web", "out")

@app.get("/")
async def serve_frontend():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse("<h1>Argentic OS API</h1><p>Frontend non déployé. Utilisez <code>/api/*</code></p>")

# ══════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import uvicorn
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--ssl", action="store_true", help="Activer HTTPS")
    parser.add_argument("--port", type=int, default=PORT, help=f"Port (default: {PORT})")
    args = parser.parse_args()

    ssl_kwargs = {}
    if args.ssl:
        ssl_kwargs = {
            "ssl_keyfile": "/opt/data/jarvis-ssl/key.pem",
            "ssl_certfile": "/opt/data/jarvis-ssl/fullchain.pem",
        }

    print(f"🔐 JWT_SECRET = {JWT_SECRET[:8]}...", file=sys.stderr, flush=True)
    print(f"👑 Argentic OS API → port {args.port}", file=sys.stderr, flush=True)
    uvicorn.run(app, host="0.0.0.0", port=args.port, **ssl_kwargs)