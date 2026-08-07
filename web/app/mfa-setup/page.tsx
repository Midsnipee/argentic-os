"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function MFASetupPage() {
  const router = useRouter();
  const [data, setData] = useState<{ mfa_secret: string; mfa_uri: string; qr_url: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await api.mfaSetup();
      if (!res.ok) { router.push("/login"); return; }
      const d = await res.json();
      setData(d);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleReset = async () => {
    if (!confirm("Cela invalidera votre ancien code. Continuer ?")) return;
    setResetting(true);
    setError("");
    try {
      const res = await api.mfaReset();
      const d = await res.json();
      if (d.success) setData(d);
      else setError("Erreur lors de la régénération");
    } catch {
      setError("Erreur réseau");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ color: "var(--text-dim)" }}>Chargement...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 24 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 40, width: "100%", maxWidth: 440, textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📱</div>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 4px", color: "var(--text)" }}>
          Configurer l&apos;authentification
        </h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginBottom: 24 }}>
          Scannez ce QR code avec votre app d&apos;authentification<br />
          (Google Authenticator, Authy, etc.)
        </p>

        {data?.qr_url ? (
          <>
            <div style={{
              background: "#fff", padding: 16, borderRadius: 12,
              border: "1px solid var(--border)", display: "inline-block", marginBottom: 20,
            }}>
              <img
                src={data.qr_url}
                alt="QR Code MFA"
                width={250}
                height={250}
                style={{ display: "block" }}
              />
            </div>

            <div style={{
              background: "var(--bg)", padding: "14px 18px", borderRadius: "var(--radius)",
              border: "1px solid var(--border)", marginBottom: 20,
            }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Ou entrez cette clé manuellement
              </p>
              <code style={{
                fontSize: "0.95rem", fontWeight: 600, color: "var(--primary)",
                wordBreak: "break-all", fontFamily: "monospace",
              }}>
                {data.mfa_secret.match(/.{1,4}/g)?.join(" ") || data.mfa_secret}
              </code>
            </div>
          </>
        ) : (
          <p style={{ color: "var(--text-dim)" }}>Aucune configuration MFA disponible</p>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={handleReset}
            disabled={resetting}
            style={{
              padding: "10px 20px", borderRadius: "var(--radius)",
              border: "1px solid var(--border)", background: "#fff",
              cursor: resetting ? "wait" : "pointer", fontSize: "0.875rem", color: "var(--text-dim)",
            }}
          >
            {resetting ? "Régénération..." : "🔄 Régénérer"}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="btn btn-primary"
            style={{
              padding: "10px 24px", borderRadius: "var(--radius)", border: "none",
              cursor: "pointer", fontWeight: 600, fontSize: "0.875rem",
            }}
          >
            Terminé
          </button>
        </div>

        {error && (
          <p style={{ color: "#e53e3e", fontSize: "0.85rem", marginTop: 16 }}>{error}</p>
        )}
      </div>
    </div>
  );
}