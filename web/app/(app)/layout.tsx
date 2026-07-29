"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  icon: string;
  model: string;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("argentic_token");
    if (!token) { router.push("/login"); return; }
    loadAgents();
    loadUser();
  }, []);

  const loadAgents = async () => {
    try {
      const res = await api.agents();
      const data = await res.json();
      if (data.agents) {
        setAgents(data.agents);
        if (!activeAgent && data.agents.length > 0) {
          setActiveAgent(data.agents[0].id);
        }
      }
    } catch {}
  };

  const loadUser = async () => {
    try {
      const res = await api.me();
      const data = await res.json();
      if (data.email) setUser(data);
    } catch {}
  };

  const logout = () => {
    localStorage.removeItem("argentic_token");
    localStorage.removeItem("argentic_user");
    router.push("/login");
  };

  const isActive = (id: string) => pathname === `/agent/${id}` || (pathname === "/dashboard" && activeAgent === id);
  const isDashboard = pathname === "/dashboard";

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: collapsed ? 64 : 240,
          background: "var(--sidebar)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div style={{
          padding: "16px 16px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid var(--border)",
        }}>
          <span style={{ fontSize: "1.4rem" }}>👑</span>
          {!collapsed && <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>Argentic OS</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "0.8rem",
              padding: 4,
              borderRadius: 6,
            }}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ padding: "8px", flex: 1, overflowY: "auto" }}>
          <Link href="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: "var(--radius)",
              textDecoration: "none",
              fontSize: "0.875rem",
              fontWeight: isDashboard ? 600 : 400,
              color: isDashboard ? "var(--primary)" : "var(--text-dim)",
              background: isDashboard ? "var(--primary-light)" : "transparent",
              marginBottom: 4,
            }}
          >
            <span>📊</span>
            {!collapsed && "Dashboard"}
          </Link>

          {!collapsed && (
            <div style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "var(--text-muted)",
              padding: "16px 12px 6px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              Agents
            </div>
          )}

          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/agent/${agent.id}`}
              onClick={() => setActiveAgent(agent.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: collapsed ? "10px" : "10px 12px",
                borderRadius: "var(--radius)",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: isActive(agent.id) ? 500 : 400,
                color: isActive(agent.id) ? "var(--text)" : "var(--text-dim)",
                background: isActive(agent.id) ? "#fff" : "transparent",
                boxShadow: isActive(agent.id) ? "var(--shadow-sm)" : "none",
                transition: "all 0.12s",
              }}
            >
              <span style={{ fontSize: collapsed ? "1.2rem" : "1.1rem" }}>{agent.icon}</span>
              {!collapsed && <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{agent.name}</span>}
            </Link>
          ))}
        </nav>

        {/* User footer */}
        <div style={{
          padding: "12px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "var(--primary)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 600, fontSize: "0.8rem", flexShrink: 0,
          }}>
            {user?.email?.[0]?.toUpperCase() || "?"}
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user?.email || "..."}
                </div>
              </div>
              <button
                onClick={logout}
                title="Déconnexion"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-muted)", fontSize: "0.9rem", padding: 4, borderRadius: 6,
                }}
              >
                ⇥
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {children}
      </main>
    </div>
  );
}