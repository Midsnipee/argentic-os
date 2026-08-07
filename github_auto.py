#!/usr/bin/env python3
"""
Argentic-OS GitHub Auto-Repo
Crée automatiquement un repo GitHub et push le projet.

Usage:
  python3 github_auto.py create <project_name> [--description "desc"] [--private]
  python3 github_auto.py push <project_name> [--message "commit msg"]
  python3 github_auto.py status <project_name>

Config:
  GITHUB_TOKEN dans .env ou variable d'environnement
  GITHUB_USER dans .env ou variable d'environnement (défaut: Midsnipee)
"""

import json
import os
import subprocess
import sys
from pathlib import Path

ARGENTIC_HOME = os.environ.get("ARGENTIC_HOME", "/opt/data/argentic-os")
PROJECTS_DIR = os.path.join(ARGENTIC_HOME, "projects")
GH_BIN = "/opt/data/gh"

# ══════════════════════════════════════════════════════════════════════
# Config
# ══════════════════════════════════════════════════════════════════════

def _load_env():
    """Charge les variables depuis le .env d'Argentic-OS."""
    env_file = os.path.join(ARGENTIC_HOME, ".env")
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    if key not in os.environ:
                        os.environ[key] = val.strip('"\'')

_load_env()

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_USER = os.environ.get("GITHUB_USER", "Midsnipee")


def _gh(args: list, workdir: str | None = None, capture: bool = True) -> subprocess.CompletedProcess:
    """Appelle gh CLI avec le token."""
    env = os.environ.copy()
    if GITHUB_TOKEN:
        env["GH_TOKEN"] = GITHUB_TOKEN
        env["GITHUB_TOKEN"] = GITHUB_TOKEN
    return subprocess.run(
        [GH_BIN] + args,
        capture_output=capture, text=True,
        cwd=workdir or ARGENTIC_HOME,
        env=env,
        timeout=60,
    )


# ══════════════════════════════════════════════════════════════════════
# Commandes
# ══════════════════════════════════════════════════════════════════════

def create_project(name: str, description: str = "", private: bool = False) -> dict:
    """
    Crée un projet local + repo GitHub + push initial.
    Structure créée :
      projects/<name>/
        ├── README.md
        ├── .gitignore
        └── src/
    """
    project_path = os.path.join(PROJECTS_DIR, name)

    # 1. Créer le dossier projet
    if os.path.exists(project_path):
        return {"success": False, "error": f"Le projet '{name}' existe déjà"}

    os.makedirs(os.path.join(project_path, "src"), exist_ok=True)

    # 2. Fichiers de base
    readme = f"# {name}\n\n{description or f'Projet {name} — généré par Argentic-OS'}\n"
    with open(os.path.join(project_path, "README.md"), "w") as f:
        f.write(readme)

    gitignore = """# Python
__pycache__/
*.pyc
.venv/
venv/
.env
*.egg-info/
dist/
build/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
"""
    with open(os.path.join(project_path, ".gitignore"), "w") as f:
        f.write(gitignore)

    # 3. Git init
    subprocess.run(["git", "init"], cwd=project_path, capture_output=True, timeout=10)
    subprocess.run(["git", "config", "user.email", "jbargoin@gmail.com"],
                   cwd=project_path, capture_output=True, timeout=10)
    subprocess.run(["git", "config", "user.name", GITHUB_USER],
                   cwd=project_path, capture_output=True, timeout=10)

    # 4. Premier commit
    subprocess.run(["git", "add", "-A"], cwd=project_path, capture_output=True, timeout=10)
    subprocess.run(["git", "commit", "-m", "🎉 Initial commit — Argentic-OS"],
                   cwd=project_path, capture_output=True, timeout=10)

    # 5. Créer repo GitHub
    visibility = "--private" if private else "--public"
    desc_arg = ["--description", description] if description else []
    result = _gh(["repo", "create", f"{GITHUB_USER}/{name}",
                  visibility, "--source", ".", "--remote", "origin", "--push"] + desc_arg,
                 workdir=project_path)

    if result.returncode != 0:
        err = result.stderr.strip()
        # Le repo existe peut-être déjà, essayer de push seulement
        if "already exists" in err.lower() or "name already exists" in err.lower():
            subprocess.run(["git", "remote", "add", "origin",
                          f"https://github.com/{GITHUB_USER}/{name}.git"],
                         cwd=project_path, capture_output=True, timeout=10)
            push_result = subprocess.run(
                ["git", "push", "-u", "origin", "main"],
                cwd=project_path, capture_output=True, text=True, timeout=30,
                env={**os.environ, "GIT_ASKPASS": "echo", "GIT_TERMINAL_PROMPT": "0"},
            )
            if push_result.returncode == 0:
                return {
                    "success": True,
                    "project": name,
                    "path": project_path,
                    "repo": f"https://github.com/{GITHUB_USER}/{name}",
                    "note": "Repo existant, push effectué",
                }
            return {"success": False, "error": f"Push failed: {push_result.stderr.strip()}"}
        return {"success": False, "error": err}

    return {
        "success": True,
        "project": name,
        "path": project_path,
        "repo": f"https://github.com/{GITHUB_USER}/{name}",
        "created": True,
    }


def push_project(name: str, message: str = "🔄 Update from Argentic-OS") -> dict:
    """Push les changements d'un projet existant vers GitHub."""
    project_path = os.path.join(PROJECTS_DIR, name)
    if not os.path.exists(project_path):
        return {"success": False, "error": f"Projet '{name}' introuvable"}

    if not os.path.exists(os.path.join(project_path, ".git")):
        return {"success": False, "error": "Pas de repo git initialisé"}

    subprocess.run(["git", "add", "-A"], cwd=project_path, capture_output=True, timeout=10)
    commit = subprocess.run(["git", "commit", "-m", message],
                           cwd=project_path, capture_output=True, text=True, timeout=10)
    push = subprocess.run(
        ["git", "push", "origin", "main"],
        cwd=project_path, capture_output=True, text=True, timeout=30,
        env={**os.environ, "GIT_ASKPASS": "echo", "GIT_TERMINAL_PROMPT": "0"},
    )

    if push.returncode != 0:
        return {"success": False, "error": push.stderr.strip()}

    return {
        "success": True,
        "project": name,
        "repo": f"https://github.com/{GITHUB_USER}/{name}",
        "committed": "nothing to commit" not in commit.stdout,
    }


def status_project(name: str) -> dict:
    """Affiche le statut d'un projet."""
    project_path = os.path.join(PROJECTS_DIR, name)
    if not os.path.exists(project_path):
        return {"success": False, "error": f"Projet '{name}' introuvable"}

    has_git = os.path.exists(os.path.join(project_path, ".git"))
    files = []
    for root, dirs, filenames in os.walk(project_path):
        if ".git" in dirs:
            dirs.remove(".git")
        for fname in filenames:
            files.append(os.path.relpath(os.path.join(root, fname), project_path))

    return {
        "success": True,
        "project": name,
        "path": project_path,
        "has_git": has_git,
        "files": files,
        "repo_url": f"https://github.com/{GITHUB_USER}/{name}" if has_git else None,
    }


# ══════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 github_auto.py <create|push|status> <project_name> [options]")
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "create":
        if len(sys.argv) < 3:
            print("Usage: python3 github_auto.py create <project_name> [--description \"desc\"] [--private]")
            sys.exit(1)
        name = sys.argv[2]
        desc = ""
        private = False
        for i, arg in enumerate(sys.argv):
            if arg == "--description" and i + 1 < len(sys.argv):
                desc = sys.argv[i + 1]
            if arg == "--private":
                private = True
        result = create_project(name, desc, private)
        print(json.dumps(result, indent=2, ensure_ascii=False))

    elif cmd == "push":
        if len(sys.argv) < 3:
            print("Usage: python3 github_auto.py push <project_name> [--message \"msg\"]")
            sys.exit(1)
        name = sys.argv[2]
        msg = "🔄 Update from Argentic-OS"
        for i, arg in enumerate(sys.argv):
            if arg == "--message" and i + 1 < len(sys.argv):
                msg = sys.argv[i + 1]
        result = push_project(name, msg)
        print(json.dumps(result, indent=2, ensure_ascii=False))

    elif cmd == "status":
        if len(sys.argv) < 3:
            print("Usage: python3 github_auto.py status <project_name>")
            sys.exit(1)
        result = status_project(sys.argv[2])
        print(json.dumps(result, indent=2, ensure_ascii=False))

    else:
        print(f"Commande inconnue: {cmd}")
        sys.exit(1)


if __name__ == "__main__":
    main()