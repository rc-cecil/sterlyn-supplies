#!/usr/bin/env bash
set -Eeuo pipefail

EXPECTED="${1:?Expected commit SHA is required}"

[[ "$EXPECTED" =~ ^[a-f0-9]{40}$ ]] || {
  echo "STOP: Invalid commit SHA."
  exit 1
}

ROOT="/opt/rcc/apps/sterlyn-supplies"
INFRA="/opt/rcc/secrets/sterlyn/infrastructure.env"
OVERRIDE="compose.oracle-release.yaml"
HISTORY="$HOME/.sterlyn-release-history"

cd "$ROOT"

exec 9>"$HOME/.sterlyn-deployment.lock"

flock -n 9 || {
  echo "STOP: Another deployment is in progress."
  exit 1
}

check_backup_window() {
  local hour minute clock

  hour="$(date -u +%H)"
  minute="$(date -u +%M)"
  clock=$((10#$hour * 60 + 10#$minute))

  if ((clock >= 150 && clock < 240)); then
    echo "STOP: Deployment blocked from 02:30 to 04:00 UTC."
    exit 1
  fi

  if sudo -n systemctl is-active --quiet sterlyn-backup.service; then
    echo "STOP: Backup service is active."
    exit 1
  fi
}

check_backup_window

test -f "$INFRA"
test -s "$OVERRIDE"

test "$(git branch --show-current)" = main
test -z "$(git status --porcelain --untracked-files=no)" || {
  echo "STOP: Server repository has tracked local modifications."
  exit 1
}

echo "=== Verify current release override ==="

python3 - <<'PY'
from pathlib import Path

lines=[
 line.strip()
 for line in Path("compose.oracle-release.yaml").read_text().splitlines()
 if line.strip() and not line.lstrip().startswith("#")
]

expected=[
 "services:",
 "web:",
 "image:",
 "worker:",
 "image:"
]

shape=[
 "image:" if line.startswith("image:") else line
 for line in lines
]

launch=expected[:3]+['environment:', 'PUBLIC_LAUNCH: "true"']+expected[3:]
if shape not in (expected, launch):
 raise SystemExit(
  "STOP: Release override contains unexpected configuration. "
  "Manual review required."
 )
PY

echo "=== Verify exact commit ==="

git fetch --no-tags origin main

test "$(git rev-parse origin/main)" = "$EXPECTED" || {
  echo "STOP: The requested commit is no longer current main."
  exit 1
}

git merge-base --is-ancestor HEAD origin/main || {
  echo "STOP: Server branch cannot fast-forward."
  exit 1
}

if git diff --name-only HEAD origin/main -- \
  prisma/schema.prisma \
  prisma/migrations \
  prisma.config.ts | grep -q .
then
  echo "STOP: Database changes require separate migration review."
  exit 1
fi

echo "=== Preflight infrastructure ==="

COMPOSE_BASE=(
  sudo -n docker compose -p rcc-sterlyn
  --env-file "$INFRA"
  -f compose.oracle.yaml
  -f compose.oracle-app.yaml
)

compose() {
  "${COMPOSE_BASE[@]}" -f "$OVERRIDE" "$@"
}

compose config --quiet

DB_CID="$(compose ps -q db)"
STORAGE_CID="$(compose ps -q storage)"
SCANNER_CID="$(compose ps -q antivirus)"
PROCESSOR_CID="$(compose ps -q processor)"
WEB_CID="$(compose ps -q web)"
WORKER_CID="$(compose ps -q worker)"

for cid in "$DB_CID" "$STORAGE_CID" "$SCANNER_CID" "$PROCESSOR_CID" "$WEB_CID" "$WORKER_CID"; do
  test -n "$cid"
  test "$(sudo -n docker inspect -f '{{.State.Running}}' "$cid")" = true
done

PREVIOUS_WEB="$(sudo -n docker inspect -f '{{.Config.Image}}' "$WEB_CID")"
PREVIOUS_WORKER="$(sudo -n docker inspect -f '{{.Config.Image}}' "$WORKER_CID")"

sudo -n docker image inspect "$PREVIOUS_WEB" "$PREVIOUS_WORKER" >/dev/null
mapfile -t override_images < <(awk '/^    image: / {print $2}' "$OVERRIDE")
test "${override_images[0]}" = "$PREVIOUS_WEB"
test "${override_images[1]}" = "$PREVIOUS_WORKER"

FREE_KB="$(df -Pk "$ROOT" | awk 'NR==2 {print $4}')"

test "$FREE_KB" -ge 4194304 || {
  echo "STOP: Less than 4 GiB available for image build."
  exit 1
}

echo "=== Fast-forward server source ==="

git merge --ff-only origin/main
test "$(git rev-parse HEAD)" = "$EXPECTED"

IMAGE="sterlyn-app:release-$EXPECTED"

mkdir -p "$HISTORY"
chmod 700 "$HISTORY"

SNAPSHOT="$HISTORY/$(date -u +%Y%m%dT%H%M%SZ)-${EXPECTED:0:12}.yaml"
cp "$OVERRIDE" "$SNAPSHOT"
chmod 600 "$SNAPSHOT"

SWITCHED=0

finish() {
  rc=$?
  trap - EXIT

  if ((rc != 0 && SWITCHED == 1)); then
    echo "Deployment failed. Attempting rollback."

    cp "$SNAPSHOT" "$TMP" && mv "$TMP" "$OVERRIDE" || exit "$rc"

    if compose up -d \
      --no-deps \
      --no-build \
      --force-recreate \
      worker web; then
      if curl --fail --silent --show-error --retry 12 --retry-delay 3 --retry-all-errors --max-time 10 https://sterlynsupplies.com/api/ready >/dev/null; then
        echo "Previous release restored and ready."
      else
        echo "CRITICAL: Restored containers did not become ready."
      fi
    else
      echo "CRITICAL: Automatic rollback failed. Manual intervention required."
    fi
  fi

  rm -f "${TMP:-}"
  exit "$rc"
}

trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

echo "=== Build versioned image ==="

if sudo -n docker image inspect "$IMAGE" >/dev/null 2>&1; then
  test "$(sudo -n docker image inspect "$IMAGE" -f '{{index .Config.Labels "org.opencontainers.image.revision"}}')" = "$EXPECTED"
else
  git archive "$EXPECTED" | sudo -n docker build --label "org.opencontainers.image.revision=$EXPECTED" --tag "$IMAGE" -
fi

check_backup_window
# The build can take minutes. Never switch to a commit superseded while it ran.
git fetch --no-tags origin main
test "$(git rev-parse origin/main)" = "$EXPECTED"

echo "=== Deploy application containers ==="

TMP="${OVERRIDE}.tmp.$$"

printf 'services:\n  web:\n    image: %s\n    environment:\n      PUBLIC_LAUNCH: "true"\n  worker:\n    image: %s\n' \
  "$IMAGE" "$IMAGE" > "$TMP"

SWITCHED=1
mv "$TMP" "$OVERRIDE"

compose config --quiet

compose up -d \
  --no-deps \
  --no-build \
  --force-recreate \
  worker web

echo "=== Verify application ==="

EXPECTED_ID="$(sudo -n docker image inspect "$IMAGE" -f '{{.Id}}')"

for service in web worker; do
  CID="$(compose ps -q "$service")"
  test -n "$CID"

  ACTUAL_ID="$(sudo -n docker inspect -f '{{.Image}}' "$CID")"
  test "$ACTUAL_ID" = "$EXPECTED_ID"
done

WEB_CID="$(compose ps -q web)"
WORKER_CID="$(compose ps -q worker)"

HEALTH=starting

for attempt in $(seq 1 48); do
  HEALTH="$(sudo -n docker inspect \
    -f '{{.State.Health.Status}}' "$WEB_CID")"

  if [ "$HEALTH" = healthy ]; then
    break
  fi

  if [ "$HEALTH" = unhealthy ]; then
    echo "Web container is unhealthy."
    break
  fi

  sleep 5
done

test "$HEALTH" = healthy

test "$(sudo -n docker inspect \
  -f '{{.State.Running}}' "$WORKER_CID")" = true

curl --fail --silent --show-error \
  --retry 8 \
  --retry-delay 3 \
  --retry-all-errors \
  --max-time 15 \
  https://sterlynsupplies.com/api/ready >/dev/null

test "$(compose ps -q db)" = "$DB_CID"
test "$(compose ps -q storage)" = "$STORAGE_CID"
test "$(compose ps -q antivirus)" = "$SCANNER_CID"
test "$(compose ps -q processor)" = "$PROCESSOR_CID"
curl --fail --silent --show-error --max-time 15 https://sterlynsupplies.com/robots.txt | grep -Fx 'Sitemap: https://sterlynsupplies.com/sitemap.xml'

compose ps

echo "SUCCESS: $IMAGE deployed."
echo "Previous release retained in $SNAPSHOT"
