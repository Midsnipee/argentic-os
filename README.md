# 🏭 Argentic OS

**Système d'exploitation agentique** — orchestrez des agents IA comme une entreprise.

Ajoutez des agents spécialisés au fur et à mesure de vos besoins : développement, recherche, DevOps, design...

```
┌──────────────────────────────────────────┐
│              ARGENTIC OS                  │
│                                           │
│  🧠 MANAGER    ← coordonne les agents    │
│  💻 DEV        ← code, scripts           │
│  🔍 RECHERCHE  ← web, analyse            │
│  ⚙️ DEVOPS     ← infra, services         │
│                                           │
│  + Extensible à l'infini                 │
└──────────────────────────────────────────┘
```

## 🚀 Démarrage rapide

```bash
# Lister les agents
python3 orchestre.py --list

# Déléguer une tâche à un agent
python3 orchestre.py --agent dev "Crée un script Python qui..."

# Mode orchestration complète
python3 orchestre.py "Analyse ce projet et propose des améliorations"
```

## ➕ Ajouter un agent

1. Éditer `agents.yaml` :

```yaml
agents:
  designer:
    name: "Designer"
    role: "Tu crées des interfaces web..."
    model: "openai/gpt-4o-mini"
    max_turns: 15
    tools: [file, terminal]
    icon: "🎨"
```

2. Tester : `python3 orchestre.py --agent designer "Crée une landing page"`

## 🔌 Intégration API

L'orchestrateur peut être appelé depuis n'importe quelle interface via une API REST :

```python
# Exemple : wrapper Flask/FastAPI
@app.post("/agent")
def call_agent(agent: str, task: str):
    result = subprocess.run(
        ["python3", "orchestre.py", "--agent", agent, task],
        capture_output=True, text=True
    )
    return {"response": result.stdout}
```

Exemples de commandes :
- « Demande à dev de créer un script »
- « Le manager doit analyser ce projet »
- « Dis à recherche quelle est la capitale du Togo »

## 🏗️ Architecture

```
.
├── agents.yaml          ← Registre des agents
├── orchestre.py         ← Orchestrateur
├── agents/              ← Dossiers par agent
│   ├── manager/
│   ├── dev/
│   ├── recherche/
│   └── devops/
├── bus/messages/        ← Communication inter-agents
├── projects/            ← Espaces de travail
└── logs/                ← Logs
```

## 🔧 Runtime

- **Hermes Agent** (Nous Research)
- Modèle par défaut : `gpt-4o-mini` (via OpenRouter)
- Outils : terminal, file, web, browser, code_exec

## 📄 Licence

MIT