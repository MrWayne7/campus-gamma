#!/bin/bash
# Campus — publica en Cloudflare Pages (producción) y versiona en GitHub.
# Uso:  bash deploy.sh
cd "$(dirname "$0")" || exit 1
PROY="campus-gamma"

echo "→ 1/3  Almacenamiento de fotos y videos (R2)"
npx --yes wrangler@latest r2 bucket create campus-media >/dev/null 2>&1 && echo "   bucket creado" || echo "   bucket ya existía (o R2 no está activo todavía)"

echo "→ 2/3  Publicando en Cloudflare Pages"
if npx --yes wrangler@latest pages deploy --project-name="$PROY" --branch=production --commit-dirty=true; then
  echo "   ✓ publicado: https://$PROY.pages.dev"
else
  echo "   ✗ el despliegue falló. Si el error menciona R2 o 'MEDIA', activa R2 una vez en tu cuenta de Cloudflare y vuelve a correr este comando."
  exit 1
fi

echo "→ 3/3  Guardando versión en GitHub"
PRIMERA=0
if [ ! -d .git ]; then
  git init -q && git branch -M main && git remote add origin "https://github.com/MrWayne7/$PROY.git"
  PRIMERA=1
fi
git add -A
git commit -q -m "Campus: viaje 3D, reservas, 404, SEO y panel" || true
if [ "$PRIMERA" = "1" ]; then
  git push -q -u --force origin main && echo "   ✓ GitHub actualizado" || echo "   (GitHub no se actualizó; el sitio sí quedó publicado)"
else
  git push -q -u origin main && echo "   ✓ GitHub actualizado" || echo "   (GitHub no se actualizó; el sitio sí quedó publicado)"
fi

echo
echo "Listo:"
echo "  https://$PROY.pages.dev"
echo "  https://$PROY.pages.dev/3d/"
echo "  https://$PROY.pages.dev/reservas/"
echo "  https://$PROY.pages.dev/admin"
