# Argentic OS — Comment ajouter un agent

## 1. Ajouter au registre (agents.yaml)

```yaml
agents:
  # ... agents existants ...
  
  designer:
    name: "Designer"
    role: >
      Tu es l'agent Designer. Tu crées des interfaces, des visuels,
      des maquettes HTML/CSS. Tu es créatif et pragmatique.
      Réponds en français.
    model: "openai/gpt-4o-mini"
    max_turns: 15
    tools: [file, terminal]
    icon: "🎨"
```

## 2. Créer le dossier de l'agent

```bash
mkdir -p agents/designer
```

## 3. (Optionnel) Ajouter un prompt spécifique

```bash
echo "Ton rôle détaillé..." > agents/designer/prompt.md
```

## 4. Tester

```bash
python3 orchestre.py --agent designer "Crée une page d'accueil minimaliste"
```

## Architecture

```
.
├── agents.yaml          ← Registre des agents (ajouter ici)
├── orchestre.py         ← Orchestrateur
├── agents/
│   ├── manager/         ← Dossier par agent
│   ├── dev/
│   ├── recherche/
│   └── devops/
├── bus/messages/        ← Communication inter-agents
├── projects/            ← Espaces de travail
└── logs/                ← Logs
```

## Exemples de commandes

- "Demande à dev de créer un script Python"
- "Le manager doit analyser ce projet"
- "Demande à recherche quelle est la météo"
- "Dis au DevOps de vérifier les services"