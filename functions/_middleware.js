import { json, makeToken, verifyToken, getCookie } from "./api/_utils.js";

const COOKIE = "cg_preview";

async function previewOk(request, env) {
  const secret = env.PREVIEW_PASSWORD;
  if (!secret) return true; // sin secret, el portón está apagado
  return await verifyToken(secret, getCookie(request, COOKIE));
}

async function loginHandler({ request, env }) {
  const secret = env.PREVIEW_PASSWORD;
  if (!secret) return json({ ok: true });
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "JSON inválido" }, 400); }
  if (!body || body.password !== secret) return json({ error: "Contraseña incorrecta" }, 401);
  const token = await makeToken(secret, 30);
  const cookie = COOKIE + "=" + token + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=" + (30 * 86400);
  return json({ ok: true }, 200, { "Set-Cookie": cookie });
}

function gatePage() {
  const html = `<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><title>CAMPUS — Acceso privado</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Graduate&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box;margin:0;padding:0}
  body{min-height:100svh;display:grid;place-items:center;background:#08080b;color:#f2e9d2;
    font-family:"Space Grotesk",system-ui,sans-serif;padding:24px;overflow:hidden}
  .glow{position:fixed;width:70vw;height:70vw;border-radius:50%;filter:blur(90px);opacity:.3;pointer-events:none;
    background:radial-gradient(circle,#2dff7f,transparent 65%);top:-20vw;left:-10vw;animation:f 14s ease-in-out infinite alternate}
  .glow2{background:radial-gradient(circle,#2e6bff,transparent 62%);top:auto;bottom:-20vw;left:auto;right:-10vw;animation-duration:18s}
  @keyframes f{to{transform:translate(10vw,8vh) scale(1.2)}}
  .box{position:relative;z-index:1;width:100%;max-width:400px;text-align:center}
  .g{display:inline-grid;place-items:center;width:62px;height:62px;border:1.5px solid #2dff7f;border-radius:16px;
    color:#2dff7f;font-family:"Graduate",serif;font-size:28px;box-shadow:0 0 22px rgba(45,255,127,.4);margin-bottom:22px}
  h1{font-family:"Graduate",serif;font-size:22px;letter-spacing:.06em}
  p{color:#9b958a;font-size:14px;margin-top:8px;line-height:1.5}
  form{margin-top:26px;text-align:left}
  label{display:block;font-size:12px;letter-spacing:.06em;color:#9b958a;margin-bottom:8px}
  input{width:100%;background:#0e0e14;color:#f2e9d2;border:1px solid rgba(242,233,210,.18);border-radius:12px;
    padding:14px 16px;font-family:inherit;font-size:16px}
  input:focus{outline:none;border-color:#2dff7f;box-shadow:0 0 0 3px rgba(45,255,127,.15)}
  button{width:100%;margin-top:14px;background:#2dff7f;color:#06130b;border:none;border-radius:999px;
    padding:15px;font-family:inherit;font-weight:700;font-size:15px;cursor:pointer;letter-spacing:.03em}
  button:hover{box-shadow:0 8px 26px rgba(45,255,127,.4)}
  .msg{min-height:20px;margin-top:12px;font-size:13px;color:#ff7a2b;text-align:center}
  .foot{margin-top:24px;font-size:11px;color:#625d55;letter-spacing:.08em}
</style></head><body>
<div class="glow"></div><div class="glow glow2"></div>
<div class="box">
  <div class="g">&#915;</div>
  <h1>CAMPUS</h1>
  <p>Vista previa privada. Ingresa la contraseña para continuar.</p>
  <form id="f">
    <label for="pw">Contraseña</label>
    <input type="password" id="pw" autocomplete="off" autofocus>
    <button type="submit">Entrar</button>
    <div class="msg" id="m"></div>
  </form>
  <div class="foot">ACCESO RESTRINGIDO</div>
</div>
<script>
  var f=document.getElementById("f"),pw=document.getElementById("pw"),m=document.getElementById("m");
  f.addEventListener("submit",function(e){e.preventDefault();m.textContent="";
    fetch("/api/preview-login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pw.value})})
      .then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j};});})
      .then(function(res){if(res.ok){location.reload();}else{m.textContent=res.j.error||"No se pudo entrar.";pw.value="";pw.focus();}})
      .catch(function(){m.textContent="Error de conexión.";});
  });
</script></body></html>`;
  return new Response(html, { status: 401, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  if (url.pathname === "/api/preview-login" && request.method === "POST") return loginHandler(context);
  if (await previewOk(request, env)) return next();
  return gatePage();
}
