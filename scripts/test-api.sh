#!/usr/bin/env bash
# Integration test: runs the site's community queries through PostgREST (the API Supabase uses)
# against a freshly migrated test database.
#   DATABASE_URL=postgresql://postgres@/mond?host=... POSTGREST=/path/to/postgrest bash scripts/test-api.sh
# Needs: PostgreSQL 16, PostgREST 12 (https://github.com/PostgREST/postgrest/releases), Node 20+.
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL to an empty test database}"
POSTGREST="${POSTGREST:-postgrest}"
command -v "$POSTGREST" >/dev/null || { echo "PostgREST not found. Install it or set POSTGREST=/path/to/postgrest." >POSTGREST="${POSTGREST:-postgrest}"2; exit 1; }
export JWT_SECRET="test-secret-for-local-integration-only-0123456789"
dir=$(mktemp -d)

bash "$(dirname "$0")/test-db.sh" > "$dir/db.log" 2>&1 || { tail -20 "$dir/db.log"; exit 1; }
echo "Database tests passed; starting the API…"

cat > "$dir/pgrst.conf" <<CONF
db-uri = "$DATABASE_URL"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$JWT_SECRET"
server-port = 3300
CONF
"$POSTGREST" "$dir/pgrst.conf" > "$dir/pgrst.log" 2>&1 &
pg=$!
node -e '
const http = require("http");
http.createServer((req, res) => {
  const p = http.request({ host: "127.0.0.1", port: 3300, path: req.url.replace(/^\/rest\/v1/, "") || "/", method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.on("error", (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(p);
}).listen(3301);' &
proxy=$!
trap 'kill $pg $proxy 2>/dev/null || true' EXIT
for _ in $(seq 1 30); do curl -sf localhost:3301/rest/v1/ >/dev/null && break; sleep 0.5; done

API_URL=http://localhost:3301 npx vitest run -c vitest.integration.config.mts
