"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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

interface Message {
  role: "user" | "agent";
  text: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("argentic_token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadData();
  }, [router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeAgent]);

  const loadData = async () => {
    try {
      const [agentsRes, modelsRes] = await Promise.all([api.agents(), api.models()]);
      const agentsData = await agentsRes.json();
      const modelsData = await modelsRes.json();
      if (agentsData.agents) {
        setAgents(agentsData.agents);
        if (!activeAgent && agentsData.agents.length > 0) {
          setActiveAgent(agentsData.agents[0].id);
        }
      }
      if (modelsData.models) setModels(modelsData.models);
    } catch {
      // handle silently
    }
  };

  const handleModelChange = async (agentId: string, modelId: string) => {
    try {
      await api.updateAgentModel(agentId, modelId);
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, model: modelId } : a))
      );
    } catch {
      // handle silently
    }
  };

  const handleModelReset = async (agentId: string) => {
    try {
      await api.resetAgentModel(agentId);
      // Reload to get default model
      const res = await api.agents();
      const data = await res.json();
      if (data.agents) setAgents(data.agents);
    } catch {
      // handle silently
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeAgent || loading) return;

    const msg = input.trim();
    setInput("");
    setLoading(true);

    setMessages((prev) => ({
      ...prev,
      [activeAgent]: [...(prev[activeAgent] || []), { role: "user" as const, text: msg }],
    }));

    try {
      const res = await api.chat(activeAgent, msg);
      const data = await res.json();
      const responseText = data.success
        ? data.response
        : data.error || "Erreur de l'agent";

      setMessages((prev) => ({
        ...prev,
        [activeAgent]: [...(prev[activeAgent] || []), { role: "agent" as const, text: responseText }],
      }));
    } catch {
      setMessages((prev) => ({
        ...prev,
        [activeAgent]: [
          ...(prev[activeAgent] || []),
          { role: "agent", text: "⚠ Erreur réseau." },
        ],
      }));
    } finally {
      setLoading(false);
    }
  };

  const currentMessages = activeAgent ? messages[activeAgent] || [] : [];
  const currentAgent = agents.find((a) => a.id === activeAgent);
  const currentModel = models.find((m) => m.id === currentAgent?.model);

  const handleLogout = () => {
    localStorage.removeItem("argentic_token");
    localStorage.removeItem("argentic_user");
    router.push("/login");
  };

  const groupedModels = models.reduce(
    (acc, m) => {
      const cat = m.category || "Autre";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(m);
      return acc;
    },
    {} as Record<string, Model[]>
  );

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <h1 className="text-lg font-bold" style={{ color: "var(--primary)" }}>
          👑 Argentic OS
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{
              color: showSettings ? "var(--primary)" : "var(--text-dim)",
              border: "1px solid var(--border)",
            }}
          >
            ⚙️ Modèles
          </button>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-dim)", border: "1px solid var(--border)" }}
          >
            Déconnexion
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav
          className="w-72 shrink-0 border-r overflow-y-auto p-3 flex flex-col"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          {showSettings ? (
            /* ── Settings Panel ── */
            <div className="animate-fade-in">
              <p className="text-xs uppercase tracking-wider mb-3 px-2" style={{ color: "var(--text-dim)" }}>
                Attribution des modèles
              </p>
              {agents.map((agent) => (
                <div key={agent.id} className="mb-4 px-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{agent.icon}</span>
                    <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                      {agent.name}
                    </span>
                  </div>
                  <select
                    value={agent.model}
                    onChange={(e) => handleModelChange(agent.id, e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded border outline-none"
                    style={{
                      background: "var(--bg)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    {Object.entries(groupedModels).map(([category, categoryModels]) => (
                      <optgroup key={category} label={`── ${category} ──`}>
                        {categoryModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.provider} {m.name} ({m.cost})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button
                    onClick={() => handleModelReset(agent.id)}
                    className="text-xs mt-1 transition-colors"
                    style={{ color: "var(--text-dim)" }}
                  >
                    ↺ Défaut
                  </button>
                </div>
              ))}
              <button
                onClick={() => setShowSettings(false)}
                className="w-full mt-3 text-xs py-2 rounded-lg border transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
              >
                ← Retour aux agents
              </button>
            </div>
          ) : (
            /* ── Agent List ── */
            <>
              <p className="text-xs uppercase tracking-wider mb-3 px-2" style={{ color: "var(--text-dim)" }}>
                Agents
              </p>
              {agents.map((agent) => {
                const modelInfo = models.find((m) => m.id === agent.model);
                return (
                  <button
                    key={agent.id}
                    onClick={() => setActiveAgent(agent.id)}
                    className="w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-all"
                    style={{
                      background: activeAgent === agent.id ? "rgba(0,229,255,0.08)" : "transparent",
                      border: activeAgent === agent.id ? "1px solid rgba(0,229,255,0.2)" : "1px solid transparent",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{agent.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate" style={{ color: "var(--text)" }}>
                          {agent.name}
                        </div>
                        <div className="text-xs truncate" style={{ color: "var(--text-dim)" }}>
                          {modelInfo?.name || agent.model?.split("/").pop() || "default"}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {/* Chat Principal */}
        <main className="flex-1 flex flex-col min-w-0">
          {currentAgent && (
            <div
              className="px-6 py-3 border-b shrink-0 flex items-center gap-3"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="text-2xl">{currentAgent.icon}</span>
              <div>
                <div className="font-semibold">{currentAgent.name}</div>
                <div className="text-xs" style={{ color: "var(--text-dim)" }}>
                  {currentModel?.provider} {currentModel?.name} · {currentModel?.context?.toLocaleString()} ctx · {currentModel?.cost}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {currentMessages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center" style={{ color: "var(--text-dim)" }}>
                  <div className="text-4xl mb-3">{currentAgent?.icon || "💬"}</div>
                  <p className="text-lg">Parlez à {currentAgent?.name || "un agent"}</p>
                  <p className="text-sm mt-1">Modèle : {currentModel?.name || currentAgent?.model}</p>
                </div>
              </div>
            )}
            {currentMessages.map((msg, i) => (
              <div
                key={i}
                className="flex animate-slide-up"
                style={{ justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}
              >
                <div className={msg.role === "user" ? "msg-user" : "msg-agent"}>
                  <div className="text-xs mb-1 font-medium" style={{ color: "var(--text-dim)" }}>
                    {msg.role === "user" ? "Vous" : currentAgent?.name}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex animate-fade-in" style={{ justifyContent: "flex-start" }}>
                <div className="msg-agent">
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                      {currentAgent?.name} réfléchit...
                    </span>
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--primary)", animationDelay: "0s" }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--primary)", animationDelay: "0.2s" }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--primary)", animationDelay: "0.4s" }} />
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={handleSend}
            className="p-4 border-t shrink-0"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex gap-3 max-w-3xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={loading ? "Agent en cours..." : `Parler à ${currentAgent?.name || "l'agent"}...`}
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-lg border text-sm transition-colors outline-none"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-3 rounded-lg font-semibold text-sm transition-all shrink-0"
                style={{
                  background: loading || !input.trim() ? "var(--primary-dim)" : "var(--primary)",
                  color: "#050510",
                  opacity: loading || !input.trim() ? 0.5 : 1,
                }}
              >
                Envoyer
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}