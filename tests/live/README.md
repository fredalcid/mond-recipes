# Live browser flows

End-to-end checks of signed-in features against a real database, used in Phases 4–6.
They need: PostgreSQL 16 with the migrations and test data from `scripts/test-db.sh`,
PostgREST 12 on port 3300 (JWT secret `test-secret-for-local-integration-only-0123456789`),
`auth-stub-proxy.mjs` on port 3301 (forwards `/rest/v1` to PostgREST and answers Supabase's
`/auth/v1/user` for the test members), Chrome, and Python Playwright.

    node tests/live/auth-stub-proxy.mjs &
    NEXT_PUBLIC_SUPABASE_URL=http://localhost:3301 NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon test token> npm run build
    bash tests/live/reset.sh          # paths inside are for the original test machine; adjust them
    python3 tests/live/community_flow.py
    python3 tests/live/admin_flow.py
    python3 tests/live/privacy_flow.py

They don't replace testing with a real Supabase project (see docs/manual-testing.md).
