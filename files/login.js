import { json, makeToken } from "./_utils.js";

export async function onRequestPost({ request, env }) {
  const secret = env.ADMIN_PASSWORD;
  if (!secret) return json({ error: "El backend no tiene contraseña configurada (ADMIN_PASSWORD)." }, 500);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "JSON inválido" }, 400); }
  if (!body || body.password !== secret) return json({ error: "Contraseña incorrecta" }, 401);
  const token = await makeToken(secret, 30);
  const cookie = "cg_session=" + token + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=" + (30 * 86400);
  return json({ ok: true }, 200, { "Set-Cookie": cookie });
}
