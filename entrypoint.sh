#!/bin/sh
set -e

# Ejecutar migraciones automáticas si DATABASE_URL está presente
if [ -n "$DATABASE_URL" ]; then
  echo "🚀 Ejecutando migraciones de PostgreSQL con Drizzle..."
  node migrate.js || echo "⚠️ Advertencia: No se pudieron aplicar las migraciones automáticamente (verifica DATABASE_URL)."
fi

echo "🌟 Iniciando servidor Next.js..."
exec node server.js
