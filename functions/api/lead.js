import { json, requireAuth } from "./_utils.js";

const clean = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);

// Solicitud de reserva desde /reservas
export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: "JSON inválido" }, 400); }
  if (b && b.web) return json({ ok: true });                       // campo trampa: lo llenan los robots
  const nombre = clean(b && b.nombre, 80), celular = clean(b && b.celular, 24).replace(/[^\d+ ]/g, "");
  if (nombre.length < 2) return json({ error: "Escribe tu nombre." }, 400);
  if (celular.replace(/\D/g, "").length < 7) return json({ error: "Escribe un celular válido." }, 400);
  if (!b.acepta) return json({ error: "Debes aceptar el tratamiento de datos." }, 400);
  const sede = ["alfa", "beta", "gamma"].indexOf(b.sede) >= 0 ? b.sede : "";
  const lead = { nombre, celular, sede, ocasion: clean(b.ocasion, 40), detalle: clean(b.detalle, 300), pagina: clean(b.pagina, 60), at: new Date().toISOString() };
  if (env.CAMPUS_KV) {
    const key = "lead:" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    await env.CAMPUS_KV.put(key, JSON.stringify(lead));
  }
  return json({ ok: true, guardado: !!env.CAMPUS_KV });
}

// Lista de reservas — solo admin autenticado.
export async function onRequestGet({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: "No autorizado" }, 401);
  if (!env.CAMPUS_KV) return json({ leads: [] });
  const out = [];
  let cursor;
  do {
    const list = await env.CAMPUS_KV.list({ prefix: "lead:", cursor });
    for (const k of list.keys) { const v = await env.CAMPUS_KV.get(k.name); if (v) out.push(JSON.parse(v)); }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);
  out.sort((a, b) => (a.at < b.at ? 1 : -1));
  return json({ leads: out });
}
