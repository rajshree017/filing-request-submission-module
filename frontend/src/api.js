const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function handleResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed with ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function listFilings() {
  const res = await fetch(`${BASE_URL}/filings`);
  return handleResponse(res);
}

export async function createFiling(payload) {
  const res = await fetch(`${BASE_URL}/filings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function submitFiling(id) {
  const res = await fetch(`${BASE_URL}/filings/${id}/submit`, {
    method: "POST",
  });
  return handleResponse(res);
}

export async function deleteFiling(id) {
  const res = await fetch(`${BASE_URL}/filings/${id}`, {
    method: "DELETE",
  });
  return handleResponse(res);
}
