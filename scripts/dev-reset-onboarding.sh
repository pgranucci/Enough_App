#!/usr/bin/env bash
# Clears EnoughApp / Expo Go data on the booted iOS Simulator so onboarding can be tested fresh.
set -euo pipefail

BOOTED="$(xcrun simctl list devices booted 2>/dev/null | grep -E 'Booted' || true)"
if [ -z "$BOOTED" ]; then
  echo "No booted iOS Simulator found. Open a simulator, or use Profile → Development → Reset onboarding (dev) in the app."
  exit 0
fi

for BUNDLE in com.anonymous.EnoughApp host.exp.Exponent; do
  if xcrun simctl uninstall booted "$BUNDLE" 2>/dev/null; then
    echo "Uninstalled $BUNDLE from booted simulator."
  fi
done

echo "Done. Reopen the app from Expo (scan QR or press i). Sign in again if needed."
