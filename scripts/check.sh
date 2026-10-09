#!/usr/bin/env bash
# Format, lint, typecheck and test; exits non-zero on the first failure (used before every commit).
set -euo pipefail
yarn -s format >/dev/null
yarn -s lint --quiet
yarn -s typecheck
yarn -s test --reporter=dot
