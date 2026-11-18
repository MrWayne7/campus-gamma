import { json, requireAuth } from "./_utils.js";

const RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "JSON inválido" }, 400); }
  const email = (body && body.email || "").trim().toLowerCase();
  if (!RE.test(email)) return json({ error: "Correo inválido" }, 400);
  if (env.CAMPUS_KV) {
    const key = "sub:" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    await env.CAMPUS_KV.put(key, JSON.stringify({
      email, source: (body.source || "web"), at: new Date().toISOString()
    }));
  }
  return json({ ok: true });
}

// Lista de inscritos — solo admin autenticado.
export async function onRequestGet({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: "No autorizado" }, 401);
  if (!env.CAMPUS_KV) return json({ subscribers: [] });
  const out = [];
  let cursor;
  do {
    const list = await env.CAMPUS_KV.list({ prefix: "sub:", cursor });
    for (const k of list.keys) {
      const v = await env.CAMPUS_KV.get(k.name);
      if (v) out.push(JSON.parse(v));
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);
  out.sort((a, b) => (a.at < b.at ? 1 : -1));
  return json({ subscribers: out });
}
