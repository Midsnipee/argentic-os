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
mkdir -p /opt/data/argentic-os/agents/designer
```

## 3. (Optionnel) Ajouter un prompt spécifique

```bash
echo "Ton rôle détaillé..." > /opt/data/argentic-os/agents/designer/prompt.md
```

## 4. Tester

```bash
cd /opt/data/argentic-os
python3 orchestre.py --agent designer "Crée une page d'accueil minimaliste"
```

## 5. (Optionnel) Ajouter la détection vocale

Dans `jarvis-interface.html`, ajouter le nom de l'agent dans `detectArgenticAgent()` :

```javascript
const agentNames = ['manager', 'dev', 'recherche', 'devops', 'designer', ...];
```

## Architecture

```
/opt/data/argentic-os/
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

## Commandes vocales supportées

- "Demande à dev de créer un script Python"
- "Le manager doit analyser ce projet"
- "Demande à recherche quelle est la météo"
- "Dis au DevOps de vérifier les services"