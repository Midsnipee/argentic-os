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
      if (!res.ok) {
        setError(data.detail || "Code invalide");
        return;
      }
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: "var(--primary)" }}>
            Vérification
          </h1>
          <p className="mt-2" style={{ color: "var(--text-dim)" }}>
            Entrez le code de votre application d&apos;authentification
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              autoFocus
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              className="w-full px-4 py-4 rounded-lg border text-center text-2xl tracking-[0.5em] font-mono transition-colors outline-none"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
                color: "var(--primary)",
              }}
              placeholder="000000"
              onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          {error && (
            <div
              className="text-sm p-3 rounded-lg text-center"
              style={{ background: "rgba(255,23,68,0.1)", color: "var(--danger)" }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full py-3 rounded-lg font-semibold text-base transition-all"
            style={{
              background: loading || code.length < 6 ? "var(--primary-dim)" : "var(--primary)",
              color: "#050510",
              opacity: loading || code.length < 6 ? 0.5 : 1,
            }}
          >
            {loading ? "Vérification..." : "Vérifier"}
          </button>

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("mfa_session");
              router.push("/login");
            }}
            className="w-full py-2 text-sm transition-colors"
            style={{ color: "var(--text-dim)" }}
          >
            ← Retour
          </button>
        </form>
      </div>
    </div>
  );
}