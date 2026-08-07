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

const SIDEBAR_W = 240;
const MOBILE_BP = 768;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BP);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

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

  // ── Shared nav links ──
  const NavLinks = () => (
    <>
      <Link href="/dashboard" onClick={() => setMobileOpen(false)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", borderRadius: "var(--radius)",
          textDecoration: "none", fontSize: "0.875rem",
          fontWeight: isDashboard ? 600 : 400,
          color: isDashboard ? "var(--primary)" : "var(--text-dim)",
          background: isDashboard ? "var(--primary-light)" : "transparent",
          marginBottom: 4,
        }}
      >
        <span>📊</span> Dashboard
      </Link>

      <Link href="/projects" onClick={() => setMobileOpen(false)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", borderRadius: "var(--radius)",
          textDecoration: "none", fontSize: "0.875rem",
          fontWeight: pathname === "/projects" ? 600 : 400,
          color: pathname === "/projects" ? "var(--primary)" : "var(--text-dim)",
          background: pathname === "/projects" ? "var(--primary-light)" : "transparent",
          marginBottom: 4,
        }}
      >
        <span>📁</span> Projets
      </Link>

      <Link href="/mfa-setup" onClick={() => setMobileOpen(false)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", borderRadius: "var(--radius)",
          textDecoration: "none", fontSize: "0.875rem",
          fontWeight: pathname === "/mfa-setup" ? 600 : 400,
          color: pathname === "/mfa-setup" ? "var(--primary)" : "var(--text-dim)",
          background: pathname === "/mfa-setup" ? "var(--primary-light)" : "transparent",
          marginBottom: 4,
        }}
      >
        <span>🔐</span> MFA
      </Link>

      <div style={{
        fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)",
        padding: "16px 12px 6px", textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        Agents
      </div>

      {agents.map((agent) => (
        <Link
          key={agent.id}
          href={`/agent/${agent.id}`}
          onClick={() => { setActiveAgent(agent.id); setMobileOpen(false); }}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: "var(--radius)",
            textDecoration: "none", fontSize: "0.875rem",
            fontWeight: isActive(agent.id) ? 500 : 400,
            color: isActive(agent.id) ? "var(--text)" : "var(--text-dim)",
            background: isActive(agent.id) ? "#fff" : "transparent",
            boxShadow: isActive(agent.id) ? "var(--shadow-sm)" : "none",
            transition: "all 0.12s",
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>{agent.icon}</span>
          <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {agent.name}
          </span>
        </Link>
      ))}
    </>
  );

  // ── Sidebar content (shared between desktop & mobile) ──
  const SidebarContent = () => (
    <>
      <div style={{
        padding: "16px 16px 12px", display: "flex", alignItems: "center", gap: 10,
        borderBottom: "1px solid var(--border)",
      }}>
        <span style={{ fontSize: "1.4rem" }}>👑</span>
        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>Argentic OS</span>
        <button
          onClick={() => { setCollapsed(!collapsed); setMobileOpen(false); }}
          style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem", padding: 4, borderRadius: 6 }}
        >
          {isMobile ? "✕" : collapsed ? "›" : "‹"}
        </button>
      </div>

      <nav style={{ padding: "8px", flex: 1, overflowY: "auto" }}>
        <NavLinks />
      </nav>

      <div style={{ padding: "12px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: "0.8rem", flexShrink: 0 }}>
          {user?.email?.[0]?.toUpperCase() || "?"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user?.email || "..."}
          </div>
        </div>
        <button onClick={logout} title="Déconnexion"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.9rem", padding: 4, borderRadius: 6 }}>
          ⇥
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", position: "relative" }}>
      {/* ── Mobile top bar ── */}
      {isMobile && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 90,
          height: 48, background: "var(--surface)", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", padding: "0 12px", gap: 10,
        }}>
          <button onClick={() => setMobileOpen(!mobileOpen)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", padding: "4px 8px", borderRadius: 6, color: "var(--text)", lineHeight: 1 }}>
            ☰
          </button>
          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)" }}>👑 Argentic OS</span>
        </div>
      )}

      {/* ── Mobile sidebar overlay ── */}
      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 98, background: "rgba(0,0,0,0.3)" }} />
      )}

      {/* ── Mobile sidebar drawer ── */}
      {isMobile && (
        <aside
          style={{
            position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 99,
            width: SIDEBAR_W, background: "var(--sidebar)", borderRight: "1px solid var(--border)",
            display: "flex", flexDirection: "column",
            transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: mobileOpen ? "4px 0 20px rgba(0,0,0,0.1)" : "none",
          }}
        >
          <SidebarContent />
        </aside>
      )}

      {/* ── Desktop sidebar ── */}
      {!isMobile && (
        <aside
          style={{
            width: collapsed ? 64 : SIDEBAR_W,
            background: "var(--sidebar)", borderRight: "1px solid var(--border)",
            display: "flex", flexDirection: "column", flexShrink: 0,
            transition: "width 0.2s",
          }}
        >
          <SidebarContent />
        </aside>
      )}

      {/* ── Main content ── */}
      <main style={{
        flex: 1, overflow: "hidden", display: "flex", flexDirection: "column",
        paddingTop: isMobile ? 48 : 0,
      }}>
        {children}
      </main>
    </div>
  );
}