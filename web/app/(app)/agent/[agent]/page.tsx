"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

interface Task {
  id: string;
  title: string;
  status: "pending" | "running" | "done";
  agent: string;
  created: string;
}

const MSG_PREFIX = "argentic_msgs_";

export default function AgentChatPage() {
  const { agent: agentId } = useParams<{ agent: string }>();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [taskInput, setTaskInput] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load persisted messages
  useEffect(() => {
    const key = MSG_PREFIX + agentId;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch {}
    }
    const savedTasks = localStorage.getItem(key + "_tasks");
    if (savedTasks) {
      try { setTasks(JSON.parse(savedTasks)); } catch {}
    }
  }, [agentId]);

  // Save messages on change
  useEffect(() => {
    const key = MSG_PREFIX + agentId;
    localStorage.setItem(key, JSON.stringify(messages));
  }, [messages, agentId]);

  useEffect(() => {
    const key = MSG_PREFIX + agentId;
    localStorage.setItem(key + "_tasks", JSON.stringify(tasks));
  }, [tasks, agentId]);

  useEffect(() => { loadData(); }, [agentId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const loadData = async () => {
    try {
      const [agentRes, modelsRes] = await Promise.all([api.agent(agentId as string), api.models()]);
      const agentData = await agentRes.json();
      const modelsData = await modelsRes.json();
      if (agentData.id) { setAgent(agentData); setSelectedModel(agentData.model); }
      if (modelsData.models) setModels(modelsData.models);
    } catch {}
  };

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    try { await api.updateAgentModel(agentId as string, modelId); } catch {}
  };

  // Cancel current request
  const cancelRequest = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setLoading(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => { return () => cancelRequest(); }, [cancelRequest]);

  const runAgent = useCallback(async (msg: string, taskId?: string) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    // Timeout après 120s (au cas où)
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9151";
      const t = localStorage.getItem("argentic_token");
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ agent: agentId, message: msg }),
        signal: controller.signal,
      });
      const data = await res.json();
      const reply = data.success ? data.response : data.error || "Erreur";
      setMessages((prev) => [...prev, { role: "agent", text: reply }]);
      if (taskId) {
        setTasks((prev) => prev.map((tk) => tk.id === taskId ? { ...tk, status: "done" as const } : tk));
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setMessages((prev) => [...prev, { role: "agent", text: "⏹️ Annulé" }]);
      } else {
        setMessages((prev) => [...prev, { role: "agent", text: "⚠ Erreur réseau" }]);
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      abortRef.current = null;
    }
  }, [agentId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    runAgent(msg);
  };

  const addTask = () => {
    if (!taskInput.trim()) return;
    const task: Task = {
      id: Date.now().toString(),
      title: taskInput.trim(),
      status: "running",
      agent: agent?.name || "",
      created: new Date().toLocaleString("fr-FR"),
    };
    setTasks((prev) => [task, ...prev]);
    setTaskInput("");
    setMessages((prev) => [...prev, { role: "user", text: `📋 ${task.title}` }]);
    runAgent(task.title, task.id);
  };

  const deleteTask = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const clearMessages = () => {
    setMessages([]);
    localStorage.removeItem(MSG_PREFIX + agentId);
  };

  const currentModel = models.find((m) => m.id === selectedModel);
  const groupedModels = models.reduce((acc, m) => {
    const cat = m.category || "Autre";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {} as Record<string, Model[]>);

  if (!agent) return <div style={{ padding: 40, color: "var(--text-dim)" }}>Chargement...</div>;

  const pendingTasks = tasks.filter((t) => t.status === "pending").length;
  const runningTasks = tasks.filter((t) => t.status === "running").length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Dashboard Panel */}
      <div style={{
        width: 340, borderRight: "1px solid var(--border)",
        background: "var(--surface)", overflowY: "auto", flexShrink: 0,
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.8rem" }}>{agent.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "1rem" }}>{agent.name}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
              {currentModel?.provider} {currentModel?.name}
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-light)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--text-muted)" }}>
              📋 Tâches
            </h3>
            <div style={{ display: "flex", gap: 8, fontSize: "0.7rem", color: "var(--text-dim)" }}>
              {pendingTasks > 0 && <span style={{ color: "#f59e0b" }}>{pendingTasks} attente</span>}
              {runningTasks > 0 && <span style={{ color: "var(--primary)" }}>{runningTasks} actif</span>}
              {doneTasks > 0 && <span style={{ color: "var(--success)" }}>{doneTasks} fait</span>}
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); addTask(); }} style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <input value={taskInput} onChange={(e) => setTaskInput(e.target.value)} placeholder="+ Nouvelle tâche..."
              style={{ flex: 1, padding: "8px 12px", borderRadius: "var(--radius)", border: "1px solid var(--border)", fontSize: "0.8rem", background: "var(--bg)", color: "var(--text)" }} />
            <button type="submit" disabled={!taskInput.trim()}
              className="btn btn-primary" style={{ padding: "8px 14px", fontSize: "0.8rem", opacity: !taskInput.trim() ? 0.4 : 1 }}>
              +
            </button>
          </form>

          {tasks.length === 0 ? (
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic", padding: "8px 0" }}>
              Aucune tâche.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {tasks.map((task) => (
                <div key={task.id} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8,
                  background: task.status === "done" ? "#f0fdf4" : task.status === "running" ? "#eff6ff" : "var(--bg)",
                  border: "1px solid var(--border-light)",
                }}>
                  <span style={{ fontSize: "0.8rem" }}>
                    {task.status === "done" ? "✅" : task.status === "running" ? "🔄" : "⏳"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.8rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {task.title}
                    </div>
                  </div>
                  <button onClick={() => deleteTask(task.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.7rem", padding: 2 }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Consignes */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-light)" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--text-muted)" }}>
            📝 Consignes
          </h3>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.55, maxHeight: 140, overflowY: "auto", whiteSpace: "pre-wrap", borderLeft: "3px solid var(--primary)", paddingLeft: 12 }}>
            {agent.role?.slice(0, 400)}{(agent.role?.length || 0) > 400 ? "..." : ""}
          </div>
        </div>

        {/* Tools + Params */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-light)" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--text-muted)" }}>
            🛠️ Outils & Paramètres
          </h3>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
            {agent.tools.map((t) => (
              <span key={t} style={{ padding: "3px 10px", borderRadius: 20, background: "var(--primary-light)", color: "var(--primary)", fontSize: "0.72rem", fontWeight: 500 }}>{t}</span>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: "0.75rem" }}>
            <div><div style={{ color: "var(--text-muted)" }}>Tours max</div><div style={{ fontWeight: 600 }}>{agent.max_turns}</div></div>
            <div>
              <div style={{ color: "var(--text-muted)" }}>Modèle</div>
              <select value={selectedModel} onChange={(e) => handleModelChange(e.target.value)}
                style={{ width: "100%", padding: "4px 6px", borderRadius: 6, border: "1px solid var(--border)", fontSize: "0.72rem", background: "#fff", color: "var(--text)", fontWeight: 500, marginTop: 2 }}>
                {Object.entries(groupedModels).map(([cat, catModels]) => (
                  <optgroup key={cat} label={cat}>
                    {catModels.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div><div style={{ color: "var(--text-muted)" }}>Contexte</div><div style={{ fontWeight: 600 }}>{currentModel?.context?.toLocaleString() || "—"} tk</div></div>
            <div><div style={{ color: "var(--text-muted)" }}>Coût</div><div style={{ fontWeight: 600 }}>{currentModel?.cost || "—"}</div></div>
          </div>
        </div>

        {/* Fichiers */}
        <div style={{ padding: "16px 20px", flex: 1 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--text-muted)" }}>
            📁 Fichiers
          </h3>
          {agent.workdir ? (
            <code style={{ fontSize: "0.75rem", background: "var(--bg)", padding: "6px 10px", borderRadius: 6, color: "var(--primary)", display: "block" }}>
              {agent.workdir}
            </code>
          ) : (
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic" }}>
              /opt/data/argentic-os/projects/
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {messages.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div style={{ textAlign: "center", color: "var(--text-dim)" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>💬</div>
                <div style={{ fontSize: "0.95rem" }}>Créez une tâche ou envoyez un message</div>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.map((msg, i) => (
                <div key={i} className="animate-in"
                  style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div className={msg.role === "user" ? "msg-user" : "msg-agent"}>
                    <div style={{ fontSize: "0.7rem", marginBottom: 4, opacity: 0.6, fontWeight: 500 }}>
                      {msg.role === "user" ? "Vous" : agent.name}
                    </div>
                    <div style={{ fontSize: "0.875rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{msg.text}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="animate-in">
                  <div className="msg-agent" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{agent.name} travaille...</span>
                    <button onClick={cancelRequest}
                      style={{
                        background: "none", border: "1px solid var(--border)", borderRadius: 6,
                        padding: "2px 10px", cursor: "pointer", fontSize: "0.75rem", color: "var(--danger)",
                      }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <form onSubmit={handleSend}
          style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", gap: 10 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={loading ? "Agent occupé..." : `Message à ${agent.name}...`}
              disabled={loading}
              style={{ flex: 1, padding: "11px 16px", borderRadius: "var(--radius)", border: "1px solid var(--border)", fontSize: "0.9rem", background: "var(--bg)", color: "var(--text)" }} />
            <button type="submit" disabled={loading || !input.trim()}
              className="btn btn-primary" style={{ padding: "11px 20px", opacity: loading || !input.trim() ? 0.5 : 1 }}>
              ➤
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}