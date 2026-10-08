#!/usr/bin/env sh
set -e
cd "$(dirname "$0")/.."
export EXPO_PUBLIC_APP_VARIANT=playground
. "$(dirname "$0")/playground-device-env.sh"

if [ -n "$REACT_NATIVE_PACKAGER_HOSTNAME" ]; then
  echo ""
  echo "Playground Metro (scheme: seugi-playground)"
  echo "  1) Mac + iPhone same Wi‑Fi"
  echo "  2) iPhone Camera → scan the QR in this terminal (opens Seugi Playground, not Expo Go)"
  echo "  OR Dev Launcher → pick http://${REACT_NATIVE_PACKAGER_HOSTNAME}:8081"
  echo "  App icon alone only works after: pnpm ios:playground:device (embeds Mac IP in the build)"
  echo ""
else
  echo "Could not detect LAN IP; try: pnpm start:playground:tunnel"
fi

exec pnpm exec expo start --dev-client --scheme seugi-playground --host lan
