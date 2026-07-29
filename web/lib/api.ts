const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9151";

function token(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("argentic_token");
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const t = token();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (t) headers["Authorization"] = `Bearer ${t}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401 && !path.includes("/login") && !path.includes("/mfa")) {
    localStorage.removeItem("argentic_token");
    localStorage.removeItem("argentic_user");
    if (typeof window !== "undefined") window.location.href = "/login";
  }
  return res;
}

export const api = {
  setup: (email: string, password: string) =>
    request("/api/setup", { method: "POST", body: JSON.stringify({ email, password }) }),

  login: (email: string, password: string) =>
    request("/api/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  mfa: (sessionId: string, code: string) =>
    request("/api/mfa", { method: "POST", body: JSON.stringify({ session_id: sessionId, code }) }),

  agents: () => request("/api/agents"),

  agent: (id: string) => request(`/api/agents/${id}`),

  models: () => request("/api/models"),

  updateAgentModel: (agentId: string, model: string) =>
    request(`/api/agents/${agentId}/model`, {
      method: "PATCH",
      body: JSON.stringify({ model }),
    }),

  resetAgentModel: (agentId: string) =>
    request(`/api/agents/${agentId}/model`, { method: "DELETE" }),

  chat: (agent: string, message: string) =>
    request("/api/chat", { method: "POST", body: JSON.stringify({ agent, message }) }),

  me: () => request("/api/me"),

  health: () => request("/api/health"),
};