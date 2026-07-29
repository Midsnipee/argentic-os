"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function MFAPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("mfa_session");
    if (!session) router.push("/login");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sessionId = localStorage.getItem("mfa_session");
    if (!sessionId) return;
    setError("");
    setLoading(true);
    try {
      const res = await api.mfa(sessionId, code);
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Code invalide"); return; }
      localStorage.setItem("argentic_token", data.token);
      localStorage.setItem("argentic_user", JSON.stringify(data.user));
      localStorage.removeItem("mfa_session");
      router.push("/dashboard");
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 24 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 40, width: "100%", maxWidth: 380, boxShadow: "0 4px 24px rgba(0,0,0,0.04)", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>🔐</div>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0, color: "var(--text)" }}>Vérification</h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginTop: 6, marginBottom: 24 }}>
          Entrez le code de votre app d&apos;authentification
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
            autoFocus
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            style={{
              width: "100%", padding: "16px", borderRadius: "var(--radius)",
              border: "1px solid var(--border)", fontSize: "1.5rem", textAlign: "center",
              letterSpacing: "0.4em", fontFamily: "monospace",
              background: "var(--bg)", color: "var(--primary)", fontWeight: 600, marginBottom: 20,
            }}
          />

          {error && (
            <div style={{ background: "#fef2f2", color: "var(--danger)", padding: "10px 14px", borderRadius: "var(--radius)", fontSize: "0.8rem", marginBottom: 16, border: "1px solid #fecaca" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || code.length < 6}
            className="btn btn-primary"
            style={{ width: "100%", padding: "13px", justifyContent: "center", fontSize: "0.9rem", opacity: loading || code.length < 6 ? 0.5 : 1 }}>
            {loading ? "Vérification..." : "Vérifier"}
          </button>

          <button type="button"
            onClick={() => { localStorage.removeItem("mfa_session"); router.push("/login"); }}
            style={{ marginTop: 12, width: "100%", padding: "10px", background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: "0.85rem" }}>
            ← Retour
          </button>
        </form>
      </div>
    </div>
  );
}