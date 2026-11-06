import { json, requireAuth } from "./_utils.js";

const KEY = "content:v1";

export async function onRequestGet({ env }) {
  if (!env.CAMPUS_KV) return json({});
  const v = await env.CAMPUS_KV.get(KEY);
  return json(v ? JSON.parse(v) : {});
}

export async function onRequestPut({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: "No autorizado" }, 401);
  if (!env.CAMPUS_KV) return json({ error: "KV no configurado" }, 500);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "JSON inválido" }, 400); }
  if (!body || typeof body !== "object") return json({ error: "Contenido inválido" }, 400);
  await env.CAMPUS_KV.put(KEY, JSON.stringify(body));
  return json({ ok: true });
}
