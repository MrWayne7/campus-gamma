import { json, requireAuth } from "./_utils.js";

export async function onRequestPost({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: "No autorizado" }, 401);
  if (!env.MEDIA) return json({ error: "Almacenamiento R2 (MEDIA) no configurado" }, 500);
  let form;
  try { form = await request.formData(); } catch (e) { return json({ error: "Formulario inválido" }, 400); }
  const file = form.get("file");
  if (!file || typeof file === "string") return json({ error: "No llegó ningún archivo" }, 400);
  const type = file.type || "application/octet-stream";
  let ext = (file.name && file.name.indexOf(".") >= 0) ? file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") : (type.split("/")[1] || "bin");
  if (ext.length > 5) ext = "bin";
  const key = "u/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
  const buf = await file.arrayBuffer();
  await env.MEDIA.put(key, buf, { httpMetadata: { contentType: type } });
  return json({ ok: true, url: "/media/" + key, type: type });
}
