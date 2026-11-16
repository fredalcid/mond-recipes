#!/usr/bin/env bash
# Applies all migrations + seed to a throwaway PostgreSQL 15+/16 database and runs the security tests.
# Usage: DATABASE_URL=postgres://postgres@localhost:5432/mond_test scripts/test-db.sh
set -eo pipefail
cd "$(dirname "$0")/.."
PSQL="psql ${DATABASE_URL:?set DATABASE_URL to an EMPTY test database} -v ON_ERROR_STOP=1 -q"
$PSQL -f supabase/tests/supabase_stub.sql
for f in supabase/migrations/*.sql; do echo "applying $f"; $PSQL -f "$f"; done
$PSQL -f supabase/seed.sql
$PSQL -o /dev/null -f supabase/tests/security_test.sql 2>&1 | sed "s/^psql:[^ ]* NOTICE:  //"
$PSQL -f supabase/sample_content.sql
$PSQL -o /dev/null -f supabase/tests/search_test.sql 2>&1 | sed "s/^psql:[^ ]* NOTICE:  //"
$PSQL -o /dev/null -f supabase/tests/admin_test.sql 2>&1 | sed "s/^psql:[^ ]* NOTICE:  //"
$PSQL -o /dev/null -f supabase/tests/phase3_test.sql 2>&1 | sed "s/^psql:[^ ]* NOTICE:  //"
