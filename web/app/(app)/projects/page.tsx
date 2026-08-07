"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface Project {
  name: string;
  path: string;
  has_git: boolean;
  repo_url: string | null;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.projects.list();
      const data = await res.json();
      setProjects(data.projects || []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await api.projects.create(name.trim(), desc.trim(), isPrivate);
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setName("");
        setDesc("");
        setIsPrivate(false);
        load();
      } else {
        setError(data.error || "Erreur inconnue");
      }
    } catch (err: any) {
      setError(err.message || "Erreur réseau");
    } finally {
      setCreating(false);
    }
  };

  const handlePush = async (projectName: string) => {
    try {
      await api.projects.push(projectName);
      load();
    } catch {}
  };

  return (
    <div style={{ padding: "32px 40px", overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, color: "var(--text)" }}>
            📁 Projets
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-dim)", margin: "4px 0 0" }}>
            {projects.length} projet{projects.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn btn-primary"
          style={{
            padding: "10px 20px",
            borderRadius: "var(--radius)",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          {showCreate ? "✕ Annuler" : "＋ Nouveau projet"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 24,
          marginBottom: 24,
          maxWidth: 500,
        }}>
          <form onSubmit={handleCreate}>
            <input
              autoFocus
              placeholder="Nom du projet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%", padding: "10px 14px", fontSize: "0.9rem",
                borderRadius: "var(--radius)", border: "1px solid var(--border)",
                marginBottom: 12, background: "#fff",
              }}
            />
            <input
              placeholder="Description (optionnelle)"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={{
                width: "100%", padding: "10px 14px", fontSize: "0.9rem",
                borderRadius: "var(--radius)", border: "1px solid var(--border)",
                marginBottom: 12, background: "#fff",
              }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: "0.875rem", cursor: "pointer" }}>
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
              Repo privé
            </label>
            {error && <p style={{ color: "#e53e3e", fontSize: "0.85rem", marginBottom: 12 }}>{error}</p>}
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="btn btn-primary"
              style={{
                padding: "10px 24px", borderRadius: "var(--radius)", border: "none",
                cursor: creating ? "wait" : "pointer", fontWeight: 600, fontSize: "0.875rem",
                opacity: creating || !name.trim() ? 0.6 : 1,
              }}
            >
              {creating ? "Création..." : "Créer le projet"}
            </button>
          </form>
        </div>
      )}

      {/* Project list */}
      {projects.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-dim)" }}>
          <p style={{ fontSize: "1.1rem", marginBottom: 8 }}>Aucun projet</p>
          <p style={{ fontSize: "0.875rem" }}>Créez votre premier projet avec le bouton ci-dessus</p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16,
        }}>
          {projects.map((p) => (
            <div
              key={p.name}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: 24,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: "1.3rem" }}>{p.has_git ? "📦" : "📁"}</span>
                <span style={{ fontWeight: 600, fontSize: "1rem" }}>{p.name}</span>
              </div>
              {p.repo_url && (
                <a
                  href={p.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "var(--primary)",
                    marginBottom: 12,
                    wordBreak: "break-all",
                  }}
                >
                  {p.repo_url.replace("https://github.com/", "")}
                </a>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                {p.has_git && (
                  <button
                    onClick={() => handlePush(p.name)}
                    style={{
                      padding: "6px 14px",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    🔄 Push
                  </button>
                )}
                {p.repo_url && (
                  <a
                    href={p.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "6px 14px",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      textDecoration: "none",
                      color: "var(--text)",
                    }}
                  >
                    🔗 Voir sur GitHub
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}