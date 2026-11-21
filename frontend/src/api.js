const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    let message = "Une erreur est survenue";
    if (typeof data?.detail === "string") message = data.detail;
    else if (Array.isArray(data?.detail)) message = "Vérifie les champs du formulaire";
    throw new Error(message);
  }
  return data;
}