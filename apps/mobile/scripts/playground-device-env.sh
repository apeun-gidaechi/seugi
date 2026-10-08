#!/usr/bin/env sh
# Source before `expo run:ios` so the debug binary points at Metro on your Mac (not localhost).
export EXPO_PUBLIC_APP_VARIANT=playground

IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
if [ -n "$IP" ]; then
  export REACT_NATIVE_PACKAGER_HOSTNAME="$IP"
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
XCODE_ENV_LOCAL="$ROOT/ios/.xcode.env.local"
NODE_LINE=""
if [ -f "$XCODE_ENV_LOCAL" ]; then
  NODE_LINE="$(grep '^export NODE_BINARY=' "$XCODE_ENV_LOCAL" 2>/dev/null || true)"
fi
if [ -z "$NODE_LINE" ]; then
  NODE_LINE="export NODE_BINARY=$(command -v node)"
fi

{
  echo "$NODE_LINE"
  if [ -n "$IP" ]; then
    echo "export REACT_NATIVE_PACKAGER_HOSTNAME=$IP"
  fi
} > "$XCODE_ENV_LOCAL"

if [ -n "$IP" ]; then
  echo "Packager host for this device build: $IP (written to ios/.xcode.env.local)"
else
  echo "Warning: could not detect LAN IP; device may show Expo Dev Launcher until you connect manually."
fi
