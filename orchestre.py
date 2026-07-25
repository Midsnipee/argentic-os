#!/usr/bin/env python3
"""
Argentic OS — Orchestrateur d'agents.
Gère les agents, délègue les tâches, consolide les résultats.

Usage:
  python3 orchestre.py "ta demande"
  python3 orchestre.py --agent dev "écris un script"
  python3 orchestre.py --list
  python3 orchestre.py --add <nom> <role>
"""

import json
import os
import subprocess
import sys
import time
import yaml
from pathlib import Path

ARGENTIC_HOME = "/opt/data/argentic-os"
HERMES_BIN = "/opt/hermes/bin/hermes"
HERMES_HOME = "/opt/data"
AGENTS_YAML = os.path.join(ARGENTIC_HOME, "agents.yaml")
BUS_DIR = os.path.join(ARGENTIC_HOME, "bus", "messages")


def load_agents():
    """Charge le registre des agents."""
    with open(AGENTS_YAML) as f:
        return yaml.safe_load(f)["agents"]


def run_agent(agent_id: str, task: str, config: dict) -> dict:
    """Exécute un agent avec une tâche et retourne le résultat."""
    agent = config["agents"][agent_id]
    tools = ",".join(agent.get("tools", []))
    max_turns = agent.get("max_turns", 10)
    model = agent.get("model", "openai/gpt-4o-mini")

    # Construire le prompt avec le rôle
    prompt = f"{agent['role']}\n\nTÂCHE : {task}"

    print(f"  {agent['icon']} {agent['name']} → {task[:80]}...", file=sys.stderr, flush=True)
    t0 = time.time()

    try:
        proc = subprocess.run(
            [HERMES_BIN, "chat", "-q", prompt, "--quiet",
             "--max-turns", str(max_turns),
             "-m", model, "-t", tools, "--yolo"],
            capture_output=True, text=True, timeout=120,
            env={"HERMES_HOME": HERMES_HOME, "PATH": "/usr/local/bin:/usr/bin:/bin"},
        )
        output = proc.stdout.strip()
        if "\nsession_id:" in output:
            output = output.split("\nsession_id:")[0].strip()
        elapsed = time.time() - t0
        print(f"  {agent['icon']} {agent['name']} terminé en {elapsed:.1f}s", file=sys.stderr, flush=True)
        return {"agent": agent_id, "name": agent["name"], "success": True,
                "result": output, "elapsed": elapsed}
    except subprocess.TimeoutExpired:
        return {"agent": agent_id, "name": agent["name"], "success": False,
                "result": "Timeout", "elapsed": 120}
    except Exception as e:
        return {"agent": agent_id, "name": agent["name"], "success": False,
                "result": str(e), "elapsed": time.time() - t0}


def orchestrate(task: str, agents_filter: list = None) -> str:
    """Orchestre plusieurs agents pour une tâche complexe."""
    config = load_agents()

    if agents_filter:
        agents_to_run = {k: v for k, v in config.items() if k in agents_filter}
    else:
        # Par défaut : Manager analyse, puis délègue
        agents_to_run = {"manager": config["manager"]}

    print(f"\n🎯 TÂCHE : {task}\n", file=sys.stderr, flush=True)

    results = []
    for agent_id, agent_config in agents_to_run.items():
        result = run_agent(agent_id, task, {"agents": {agent_id: agent_config}})
        results.append(result)

    # Formatage du résultat
    output_parts = []
    for r in results:
        icon = config[r["agent"]]["icon"]
        name = r["name"]
        if r["success"]:
            output_parts.append(f"{icon} **{name}** ({r['elapsed']:.0f}s):\n{r['result']}")
        else:
            output_parts.append(f"{icon} **{name}** ❌: {r['result']}")

    return "\n\n---\n\n".join(output_parts)


def list_agents():
    """Liste tous les agents disponibles."""
    config = load_agents()
    print("\n📋 Agents disponibles :\n")
    for agent_id, agent in config.items():
        tools = ", ".join(agent.get("tools", []))
        print(f"  {agent['icon']} {agent['name']} ({agent_id})")
        print(f"     Modèle : {agent.get('model', 'default')}")
        print(f"     Outils : {tools}")
        print(f"     Tours  : {agent.get('max_turns', 10)}")
        print()


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 orchestre.py <tâche>")
        print("       python3 orchestre.py --list")
        print("       python3 orchestre.py --agent <nom> <tâche>")
        sys.exit(1)

    if sys.argv[1] == "--list":
        list_agents()
        return

    if sys.argv[1] == "--agent":
        if len(sys.argv) < 4:
            print("Usage: python3 orchestre.py --agent <nom> <tâche>")
            sys.exit(1)
        agent_name = sys.argv[2]
        task = sys.argv[3]
        result = orchestrate(task, agents_filter=[agent_name])
        print(result)
        return

    # Mode par défaut : tâche complète via orchestrateur
    task = sys.argv[1]
    result = orchestrate(task)
    print(result)


if __name__ == "__main__":
    main()