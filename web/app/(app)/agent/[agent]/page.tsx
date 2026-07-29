"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

interface Agent {
  id: string;
  name: string;
  icon: string;
  model: string;
}

interface Message {
  role: "user" | "agent";
  text: string;
}

export default function AgentChatPage() {
  const { agent: agentId } = useParams<{ agent: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadAgent = async () => {
    try {
      const res = await api.agents();
      const data = await res.json();
      const found = data.agents?.find((a: Agent) => a.id === agentId);
      if (found) setAgent(found);
    } catch {}
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

  return (
    <>
      {/* Header */}
      <div style={{
        padding: "16px 24px",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: "1.5rem" }}>{agent?.icon || "🤖"}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{agent?.name || "Agent"}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
            {agent?.model?.split("/").pop()}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        {messages.length === 0 ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", height: "100%",
          }}>
            <div style={{ textAlign: "center", color: "var(--text-dim)" }}>
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>{agent?.icon || "💬"}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 500 }}>Parlez à {agent?.name || "l'agent"}</div>
              <div style={{ fontSize: "0.85rem", marginTop: 4 }}>{agent?.model}</div>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className="animate-in"
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div className={msg.role === "user" ? "msg-user" : "msg-agent"}>
                  <div style={{ fontSize: "0.7rem", marginBottom: 4, opacity: 0.7, fontWeight: 500 }}>
                    {msg.role === "user" ? "Vous" : agent?.name}
                  </div>
                  <div style={{ fontSize: "0.875rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex" }} className="animate-in">
                <div className="msg-agent">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                      {agent?.name} réfléchit
                    </span>
                    <span style={{ display: "flex", gap: 3 }}>
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--primary)", opacity: 0.3, animation: "pulse 1s infinite" }} />
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--primary)", opacity: 0.3, animation: "pulse 1s infinite 0.2s" }} />
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--primary)", opacity: 0.3, animation: "pulse 1s infinite 0.4s" }} />
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          padding: "16px 24px",
          borderTop: "1px solid var(--border)",
          background: "var(--surface)",
          flexShrink: 0,
        }}
      >
        <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", gap: 10 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={loading ? "En cours..." : `Message à ${agent?.name || "l'agent"}...`}
            disabled={loading}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              fontSize: "0.9rem",
              background: "var(--bg)",
              color: "var(--text)",
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn btn-primary"
            style={{ padding: "12px 24px", opacity: loading || !input.trim() ? 0.5 : 1 }}
          >
            ➤
          </button>
        </div>
      </form>
    </>
  );
}