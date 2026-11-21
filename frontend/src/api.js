const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function parse(res) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    let message = "Une erreur est survenue";
    if (typeof data?.detail === "string") message = data.detail;
    else if (Array.isArray(data?.detail)) message = "Vérifie les champs du formulaire";
    throw new Error(message);
  }
  return data;
}

export async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return parse(res);
}

// Pas de Content-Type ici : le navigateur le fixe lui-même pour FormData.
export async function uploadCv(file, token) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/cv/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return parse(res);
}