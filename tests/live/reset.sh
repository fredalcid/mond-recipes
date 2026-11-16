pkill -f "postgrest pgrst.conf"; sleep 0.5
psql "postgresql://postgres@/postgres?host=/tmp/pgtest&port=54329" -q -c "drop database if exists mond" -c "create database mond"
cd /home/claude/mond-recipes && DATABASE_URL="postgresql://postgres@/mond?host=/tmp/pgtest&port=54329" bash scripts/test-db.sh > /tmp/dbtest.log 2>&1; tail -1 /tmp/dbtest.log
psql "postgresql://postgres@/mond?host=/tmp/pgtest&port=54329" -q <<'SQL'
update public.community_posts set status='approved', approved_at=now() - (random()*interval '3 days') where kind='tip' and author_id='00000000-0000-0000-0000-00000000000c' and body in ('tip 1','tip 2','tip 3');
update public.community_posts set body = 'Toast cumin seeds in a dry pan for a minute before grinding — the aroma doubles.' where body='tip 1';
update public.profiles set is_featured = true where id = '00000000-0000-0000-0000-00000000000b';
SQL
cd /home/claude/tools/pgrst && (nohup ./postgrest pgrst.conf > /tmp/pgrst.log 2>&1 &); sleep 2
# Cached recipe pages hold IDs from the previous database.
pkill -f next-server; sleep 1
cd /home/claude/mond-recipes && find .next/server/route-cache -path '*recipes*' -prune -exec rm -rf {} + 2>/dev/null
(NEXT_PUBLIC_SUPABASE_URL=http://localhost:3301 NEXT_PUBLIC_SUPABASE_ANON_KEY=$(cat /tmp/anon.jwt) PORT=3100 nohup npm start > /tmp/next.log 2>&1 &); sleep 6
