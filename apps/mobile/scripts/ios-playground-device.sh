#!/usr/bin/env sh
set -e
cd "$(dirname "$0")/.."
. "$(dirname "$0")/playground-device-env.sh"

echo ""
echo "Rebuild/install required after Wi‑Fi IP changes."
echo "If Metro is already running (pnpm start:playground), this only installs/launches the app."
echo ""

DEVICE_ID="${EXPO_IOS_DEVICE_ID:-00008120-001824A20A42201E}"
exec pnpm exec expo run:ios --device "$DEVICE_ID" --no-bundler
