# Dev Postgres: container devpg on 127.0.0.1:5432, user dev/dev (see README, Requirements). Deployments set DATABASE_URL themselves.
db_url := "postgres://dev:dev@127.0.0.1:5432/studio"
psql := "docker exec -i devpg psql -q -U dev -d studio"
# Encrypts the provider API keys stored in the DB (git-ignored). Deployments set STUDIO_KEY_FILE.
dev_env := "DATABASE_URL=" + db_url + " STUDIO_KEY_FILE=dev.key STUDIO_SKILL_DIR=dev-skill"

# Open http://localhost:5180 once cargo has compiled (until then /api answers 503). Backend on 7700 + Vite dev server (proxies /api to 127.0.0.1:7700). Ctrl+C stops both.
# Works on the local Postgres (starts empty: set a provider in Settings) and dev-skill/, copied once from the skill.
dev origin="": db
    #!/usr/bin/env bash
    trap 'kill 0' EXIT INT TERM
    [ -d dev-skill ] || cp -r skill/app-layout-patterns dev-skill
    (cd web && npm install --silent && npm run dev) &
    STUDIO_ORIGIN={{origin}} {{dev_env}} cargo run -- serve --port 7700

# Same, in multi-user mode (self-hosting for a team; same dev data). Sign up with an email and password; the first account becomes admin.
multi-user: (dev "http://localhost:5180")

# A/B test of the library: same dev data, but the generator gets an empty skill (skill-empty/). Compare with `just dev` on the same briefs and seeds.
ab: db
    #!/usr/bin/env bash
    trap 'kill 0' EXIT INT TERM
    (cd web && npm install --silent && npm run dev) &
    {{dev_env}} STUDIO_SKILL_DIR=skill-empty cargo run -- serve --port 7700

# Drop dev data (the studio database, test databases included) and dev-skill/; the next `just dev` starts empty.
dev-reset:
    echo "SELECT format('DROP DATABASE %I', datname) FROM pg_database WHERE datname LIKE 'studio_test%' \\gexec" | {{psql}}
    docker exec devpg dropdb -U dev --force studio
    docker exec devpg createdb -U dev studio
    rm -rf dev-skill

# Production build: front into web/dist, then the release binary that serves it.
build:
    cd web && npm ci --silent && npm run build
    cargo build --release

# Serve the built front from the binary.
run: build
    DATABASE_URL={{db_url}} STUDIO_KEY_FILE=dev.key ./target/release/studio serve --port 7700

# Example: just pack <generation uuid>  (writes packs/<first 8 hex>-<label>/)
pack id:
    curl -s -X POST http://127.0.0.1:7700/api/generations/{{id}}/pack | python3 -c "import json,sys; print(json.load(sys.stdin)[\"dir\"])"

# One-time: the rango CLI (makemigrations, migrate), same version as the rango-orm dependency.
setup:
    cargo install --git https://github.com/ikarys/rango-orm --tag v0.1.1 rango-orm-cli --locked

# Apply pending migrations (the devpg container must be up).
db:
    DATABASE_URL={{db_url}} rango migrate

# After a change in src/models.rs: write the next migrations/*.sql (commit it with migrations/snapshot.json).
makemigrations:
    rango makemigrations

# Same, for the SQLite set (commit it with its snapshot.json); the two snapshots are compared by a test.
makemigrations-sqlite:
    cd migrations/sqlite && rango makemigrations --output . ../../src

# Rust tests run against a fresh copy of the migrated `studio_test` database each (pg::test_pool).
test:
    echo "SELECT format('DROP DATABASE %I', datname) FROM pg_database WHERE datname LIKE 'studio_test%' \\gexec" | {{psql}}
    {{psql}} -c "CREATE DATABASE studio_test"
    DATABASE_URL=postgres://dev:dev@127.0.0.1:5432/studio_test rango migrate > /dev/null
    DATABASE_URL={{db_url}} cargo test
    cd web && npx tsc --noEmit
    # Generated pages run with scripts: an iframe without the sandbox, or with allow-same-origin, could reach the API as the user.
    perl -0ne 'while(/<iframe\b(?:[^>]|(?<==)>)*>/g){ if($&!~/sandbox="allow-scripts"/ || $&=~/allow-same-origin/){print "$ARGV: iframe without a scripts-only sandbox\n"; $b=1} } END{exit $b}' $(grep -rl '<iframe' web/src)

lint:
    cargo clippy -- -D warnings

# Example screens of the Styles page (web/public/styles/*.jpg): one generation per look, on the dev database.
# Example: just style-examples            (missing ones)  ·  just style-examples glass bento  (redo those)
style-examples *ids: db
    #!/usr/bin/env bash
    set -e
    [ -d dev-skill ] || cp -r skill/app-layout-patterns dev-skill
    cargo build -q
    {{dev_env}} ./target/debug/studio serve --port 7798 &
    server=$!
    trap 'kill $server 2>/dev/null' EXIT
    until curl -s -o /dev/null http://127.0.0.1:7798/api/me; do sleep 1; done
    python3 scripts/style_examples.py {{ids}}
