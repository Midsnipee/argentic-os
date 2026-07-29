"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

interface Agent {
  id: string;
  name: string;
  icon: string;
  model: string;
}

interface Model {
  id: string;
  name: string;
  provider: string;
  category: string;
  context: number;
  cost: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [modelOverrides, setModelOverrides] = useState<Record<string, string>>({});
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [agentsRes, modelsRes] = await Promise.all([api.agents(), api.models()]);
      const agentsData = await agentsRes.json();
      const modelsData = await modelsRes.json();
      if (agentsData.agents) setAgents(agentsData.agents);
      if (modelsData.models) setModels(modelsData.models);
    } catch {}
  };

  const handleModelChange = async (agentId: string, modelId: string) => {
    setModelOverrides((prev) => ({ ...prev, [agentId]: modelId }));
    try {
      await api.updateAgentModel(agentId, modelId);
      setAgents((prev) => prev.map((a) => (a.id === agentId ? { ...a, model: modelId } : a)));
    } catch {}
  };

  const handleModelReset = async (agentId: string) => {
    const updated = { ...modelOverrides };
    delete updated[agentId];
    setModelOverrides(updated);
    try {
      await api.resetAgentModel(agentId);
      const res = await api.agents();
      const data = await res.json();
      if (data.agents) setAgents(data.agents);
    } catch {}
  };

  const groupedModels = models.reduce((acc, m) => {
    const cat = m.category || "Autre";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {} as Record<string, Model[]>);

  const displayModel = (agent: Agent) => modelOverrides[agent.id] || agent.model;

  return (
    <div style={{ padding: "32px 40px", overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, color: "var(--text)" }}>
            Dashboard
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-dim)", margin: "4px 0 0" }}>
            {agents.length} agent{agents.length > 1 ? "s" : ""} disponibles
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="btn btn-ghost"
          style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
        >
          {showSettings ? "← Agents" : "⚙️ Modèles"}
        </button>
      </div>

      {showSettings ? (
        /* Settings panel */
        <div className="animate-in" style={{ maxWidth: 600 }}>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 24,
          }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, marginTop: 0, marginBottom: 20 }}>
              Attribution des modèles
            </h2>
            {agents.map((agent) => (
              <div key={agent.id} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span>{agent.icon}</span>
                  <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>{agent.name}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    value={displayModel(agent)}
                    onChange={(e) => handleModelChange(agent.id, e.target.value)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--border)",
                      fontSize: "0.8rem",
                      background: "#fff",
                      color: "var(--text)",
                    }}
                  >
                    {Object.entries(groupedModels).map(([cat, catModels]) => (
                      <optgroup key={cat} label={cat}>
                        {catModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.provider} {m.name} ({m.cost})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button
                    onClick={() => handleModelReset(agent.id)}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      color: "var(--text-dim)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ↺ Défaut
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Agent cards */
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}>
          {agents.map((agent) => {
            const model = models.find((m) => m.id === displayModel(agent));
            return (
              <Link
                key={agent.id}
                href={`/agent/${agent.id}`}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: 24,
                  textDecoration: "none",
                  color: "inherit",
                  transition: "box-shadow 0.15s, border-color 0.15s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
                  e.currentTarget.style.borderColor = "var(--primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: 12 }}>{agent.icon}</div>
                <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: 4 }}>
                  {agent.name}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                  {model?.provider} {model?.name}
                </div>
                <div style={{
                  fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4,
                }}>
                  {model?.context?.toLocaleString()} ctx · {model?.cost}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}