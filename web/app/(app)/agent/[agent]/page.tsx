"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

interface AgentDetail {
  id: string;
  name: string;
  icon: string;
  model: string;
  role: string;
  max_turns: number;
  tools: string[];
  workdir: string;
}

interface Model {
  id: string;
  name: string;
  provider: string;
  category: string;
  context: number;
  cost: string;
}

interface Message {
  role: "user" | "agent";
  text: string;
}

export default function AgentChatPage() {
  const { agent: agentId } = useParams<{ agent: string }>();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadData(); }, [agentId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const loadData = async () => {
    try {
      const [agentRes, modelsRes] = await Promise.all([
        api.agent(agentId as string),
        api.models(),
      ]);
      const agentData = await agentRes.json();
      const modelsData = await modelsRes.json();
      if (agentData.id) {
        setAgent(agentData);
        setSelectedModel(agentData.model);
      }
      if (modelsData.models) setModels(modelsData.models);
    } catch {}
  };

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    try { await api.updateAgentModel(agentId as string, modelId); } catch {}
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    try {
      const res = await api.chat(agentId as string, msg);
      const data = await res.json();
      const reply = data.success ? data.response : data.error || "Erreur";
      setMessages((prev) => [...prev, { role: "agent", text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "agent", text: "⚠ Erreur réseau" }]);
    } finally {
      setLoading(false);
    }
  };

  const currentModel = models.find((m) => m.id === selectedModel);
  const groupedModels = models.reduce((acc, m) => {
    const cat = m.category || "Autre";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {} as Record<string, Model[]>);

  if (!agent) return <div style={{ padding: 40, color: "var(--text-dim)" }}>Chargement...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        padding: "14px 24px",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: "1.6rem" }}>{agent.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: "1rem" }}>{agent.name}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
            {currentModel?.provider} {currentModel?.name} · {agent.max_turns} tours max
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn btn-ghost"
            style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "0.8rem" }}
          >
            {showSettings ? "← Dashboard" : "⚙️"}
          </button>
        </div>
      </div>

      {/* Body: Dashboard or Chat */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {showSettings ? (
          /* Settings Panel */
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
            <div style={{ maxWidth: 600 }}>
              <div style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                overflow: "hidden",
              }}>
                {/* Model selector */}
                <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-light)" }}>
                  <h3 style={{ margin: "0 0 4px", fontSize: "0.9rem", fontWeight: 600 }}>Modèle</h3>
                  <select
                    value={selectedModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: "var(--radius)",
                      border: "1px solid var(--border)", fontSize: "0.85rem",
                      background: "#fff", color: "var(--text)", marginTop: 8,
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
                </div>

                {/* Role / Consignes */}
                <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-light)" }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: "0.9rem", fontWeight: 600 }}>📋 Consignes</h3>
                  <div style={{
                    fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: 1.6,
                    background: "var(--bg)", padding: "14px 16px", borderRadius: "var(--radius)",
                    whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto",
                  }}>
                    {agent.role}
                  </div>
                </div>

                {/* Tools */}
                <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-light)" }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: "0.9rem", fontWeight: 600 }}>🛠️ Outils</h3>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {agent.tools.map((t) => (
                      <span key={t} style={{
                        padding: "4px 12px", borderRadius: 20,
                        background: "var(--primary-light)", color: "var(--primary)",
                        fontSize: "0.78rem", fontWeight: 500,
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Params */}
                <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-light)" }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: "0.9rem", fontWeight: 600 }}>⚡ Paramètres</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: "0.85rem" }}>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Tours max</div>
                      <div style={{ fontWeight: 500 }}>{agent.max_turns}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Modèle</div>
                      <div style={{ fontWeight: 500 }}>{selectedModel?.split("/").pop()}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Contexte</div>
                      <div style={{ fontWeight: 500 }}>{currentModel?.context?.toLocaleString() || "—"} tokens</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Coût</div>
                      <div style={{ fontWeight: 500 }}>{currentModel?.cost || "—"}</div>
                    </div>
                  </div>
                </div>

                {/* Workdir */}
                {agent.workdir && (
                  <div style={{ padding: "20px 24px" }}>
                    <h3 style={{ margin: "0 0 8px", fontSize: "0.9rem", fontWeight: 600 }}>📁 Dossier de travail</h3>
                    <code style={{
                      fontSize: "0.8rem", background: "var(--bg)", padding: "6px 12px",
                      borderRadius: 6, color: "var(--primary)",
                    }}>
                      {agent.workdir}
                    </code>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Chat area */
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
            {messages.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                <div style={{ textAlign: "center", color: "var(--text-dim)" }}>
                  <div style={{ fontSize: "3rem", marginBottom: 12 }}>{agent.icon}</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 500 }}>{agent.name}</div>
                  <div style={{ fontSize: "0.85rem", marginTop: 4, marginBottom: 16 }}>
                    {currentModel?.provider} {currentModel?.name} · {agent.tools.join(", ")}
                  </div>
                  <div style={{ maxWidth: 400, margin: "0 auto", fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                    {agent.role?.slice(0, 150)}...
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
                {messages.map((msg, i) => (
                  <div key={i} className="animate-in"
                    style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                    <div className={msg.role === "user" ? "msg-user" : "msg-agent"}>
                      <div style={{ fontSize: "0.7rem", marginBottom: 4, opacity: 0.65, fontWeight: 500 }}>
                        {msg.role === "user" ? "Vous" : agent.name}
                      </div>
                      <div style={{ fontSize: "0.875rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="animate-in">
                    <div className="msg-agent">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                          {agent.name} réfléchit
                        </span>
                        <span style={{ display: "flex", gap: 3 }}>
                          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--primary)", opacity: 0.3 }} />
                          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--primary)", opacity: 0.3 }} />
                          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--primary)", opacity: 0.3 }} />
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Input (always visible) */}
      <form onSubmit={handleSend}
        style={{
          padding: "14px 24px",
          borderTop: "1px solid var(--border)",
          background: "var(--surface)",
          flexShrink: 0,
        }}>
        <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", gap: 10 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={loading ? "En cours..." : `Message à ${agent.name}...`}
            disabled={loading}
            style={{
              flex: 1, padding: "11px 16px", borderRadius: "var(--radius)",
              border: "1px solid var(--border)", fontSize: "0.9rem",
              background: "var(--bg)", color: "var(--text)",
            }}
          />
          <button type="submit" disabled={loading || !input.trim()}
            className="btn btn-primary"
            style={{ padding: "11px 20px", opacity: loading || !input.trim() ? 0.5 : 1 }}>
            ➤
          </button>
        </div>
      </form>
    </div>
  );
}