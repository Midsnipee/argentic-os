"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(email, password);
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Erreur de connexion");
        return;
      }
      if (data.mfa_required) {
        localStorage.setItem("mfa_session", data.session_id);
        router.push("/mfa");
      } else {
        localStorage.setItem("argentic_token", data.token);
        router.push("/dashboard");
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: 24,
    }}>
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 40,
        width: "100%",
        maxWidth: 400,
        boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>👑</div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "var(--text)" }}>
            Argentic OS
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginTop: 4 }}>
            Connectez-vous pour accéder à vos agents
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, marginBottom: 6, color: "var(--text)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@example.com"
              required
              autoFocus
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                fontSize: "0.9rem",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, marginBottom: 6, color: "var(--text)" }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                fontSize: "0.9rem",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
          </div>

          {error && (
            <div style={{
              background: "#fef2f2",
              color: "var(--danger)",
              padding: "10px 14px",
              borderRadius: "var(--radius)",
              fontSize: "0.8rem",
              marginBottom: 16,
              border: "1px solid #fecaca",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", padding: "13px", justifyContent: "center", fontSize: "0.9rem", marginTop: 8 }}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}