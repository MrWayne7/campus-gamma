// Sirve los archivos guardados en R2 de forma pública: /media/<key>
export async function onRequestGet({ params, env }) {
  if (!env.MEDIA) return new Response("Media no configurado", { status: 500 });
  const key = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");
  const obj = await env.MEDIA.get(key);
  if (!obj) return new Response("No encontrado", { status: 404 });
  const h = new Headers();
  h.set("content-type", (obj.httpMetadata && obj.httpMetadata.contentType) || "application/octet-stream");
  h.set("cache-control", "public, max-age=31536000, immutable");
  if (obj.httpEtag) h.set("etag", obj.httpEtag);
  return new Response(obj.body, { headers: h });
}
