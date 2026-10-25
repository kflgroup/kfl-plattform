#!/bin/sh
# Neu bauen und Testserver neu starten
cd "$(dirname "$0")/.." && node build.mjs >/dev/null && node --check dist/staff.check.js && node --check dist/partner.check.js && cp dist/worker.js test/wk.mjs || exit 1
[ -f /tmp/kfl-serve.pid ] && kill "$(cat /tmp/kfl-serve.pid)" 2>/dev/null; sleep 0.5
nohup node --no-warnings test/serve.mjs > "${SERVE_LOG:-/tmp/kfl-serve.log}" 2>&1 &
echo $! > /tmp/kfl-serve.pid
for i in 1 2 3 4 5 6 7 8 9 10; do sleep 1; grep -q Testserver "${SERVE_LOG:-/tmp/kfl-serve.log}" && break; done
grep -v "^$" "${SERVE_LOG:-/tmp/kfl-serve.log}" | head -5
