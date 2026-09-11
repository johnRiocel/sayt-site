#!/usr/bin/env bash
#
# Fill in the real App Store ID once Apple approves Sayt.
#
# The launch pages ship with the placeholder `APPLE_APP_ID` so the branch can
# be reviewed before the app is live. Run this with the numeric ID from the
# App Store listing URL, then merge to main and push.
#
#   https://apps.apple.com/app/id1234567890
#                                ^^^^^^^^^^
#   ./scripts/set-appstore-id.sh 1234567890
#
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <numeric-app-store-id>" >&2
  exit 1
fi

ID="$1"
if ! [[ "$ID" =~ ^[0-9]+$ ]]; then
  echo "error: '$ID' is not a numeric App Store ID" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

if ! grep -lq "APPLE_APP_ID" ./*.html 2>/dev/null; then
  echo "nothing to do - no APPLE_APP_ID placeholder left" >&2
  exit 0
fi

for f in ./*.html; do
  if grep -q "APPLE_APP_ID" "$f"; then
    # macOS and GNU sed disagree about -i, so write through a temp file.
    sed "s/idAPPLE_APP_ID/id${ID}/g" "$f" > "$f.tmp" && mv "$f.tmp" "$f"
    echo "updated $f"
  fi
done

echo
echo "Done. Verify, then ship:"
echo "  grep -rn 'apps.apple.com' ./*.html | head"
echo "  git commit -am 'Point the download links at the App Store listing'"
echo "  git checkout main && git merge launch-v1 && git push site main"
