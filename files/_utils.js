// Utilidades compartidas para las Cloudflare Pages Functions.
// Archivos que empiezan por "_" no se enrutan como endpoints.

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers }
  });
}

function b64url(buf) {
  let s = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return b;
}

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return b64url(sig);
}

export async function makeToken(secret, days = 30) {
  const exp = Date.now() + days * 86400000;
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ exp })));
  const sig = await hmac(secret, payload);
  return payload + "." + sig;
}

export async function verifyToken(secret, token) {
  if (!token || token.indexOf(".") < 0) return false;
  const [payload, sig] = token.split(".");
  const expect = await hmac(secret, payload);
  if (sig !== expect) return false;
  try {
    const { exp } = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload)));
    return exp > Date.now();
  } catch (e) { return false; }
}

export function getCookie(request, name) {
  const c = request.headers.get("Cookie") || "";
  const m = c.match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function requireAuth(request, env) {
  const secret = env.ADMIN_PASSWORD;
  if (!secret) return false;
  return await verifyToken(secret, getCookie(request, "cg_session"));
}
