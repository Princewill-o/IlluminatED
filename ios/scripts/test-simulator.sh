#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v xcodebuild >/dev/null || { echo "Xcode on macOS is required to build and test the iPhone app."; exit 1; }
simulator_id="$(xcrun simctl list devices available -j | /usr/bin/python3 -c 'import json,sys; d=json.load(sys.stdin); print(next(v["udid"] for k,vs in d["devices"].items() if "iOS" in k for v in vs if "iPhone" in v["name"]))')"
swift test
xcodebuild test -project IlluminatED.xcodeproj -scheme IlluminatED \
  -destination "platform=iOS Simulator,id=$simulator_id" \
  -derivedDataPath build/DerivedData -resultBundlePath build/Tests.xcresult \
  CODE_SIGNING_ALLOWED=NO
