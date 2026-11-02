#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v xcodebuild >/dev/null || { echo "Xcode on macOS is required to archive the iPhone app."; exit 1; }
if [[ -z "${APPLE_DEVELOPMENT_TEAM:-}" ]]; then
  echo "Set APPLE_DEVELOPMENT_TEAM to your Apple team ID, or archive from Xcode after selecting your signing team."
  exit 1
fi
xcodebuild archive -project IlluminatED.xcodeproj -scheme IlluminatED \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath build/IlluminatED.xcarchive \
  DEVELOPMENT_TEAM="$APPLE_DEVELOPMENT_TEAM"
echo "Archive ready at ios/build/IlluminatED.xcarchive. Use Xcode Organizer to validate and distribute to TestFlight."
