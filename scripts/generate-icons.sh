#!/bin/sh
# Generate every favicon / home-screen icon the app needs from one square source.
#
#   sh scripts/generate-icons.sh <source.png>
#
# Uses only `sips`, which ships with macOS — no extra dependency to install.
#
# Why each size exists, and why the padding differs:
#
#   apple-touch-icon (180)  iOS ignores transparency and composites the icon on
#                           black, so the canvas must be opaque. iOS also applies
#                           its own rounded mask, so the art needs a little inset
#                           or the corners clip it.
#
#   icon-192 / icon-512     Plain PWA icons, shown roughly as-is.
#
#   maskable-192 / -512     Android adaptive icons get cropped to a circle,
#                           squircle or rounded square depending on the launcher.
#                           Only the inner ~80% is guaranteed visible, so the art
#                           is scaled to ~72% of the canvas. Without this the
#                           orbit ring on the SED logo would be sliced off.
set -eu

SRC=${1:-}
if [ -z "$SRC" ] || [ ! -f "$SRC" ]; then
  echo "usage: sh scripts/generate-icons.sh <source.png>" >&2
  exit 1
fi

OUT=$(cd "$(dirname "$0")/.." && pwd)/artifacts/sed-command-center/public
BG=FFFFFF   # opaque background; the SED logo already sits on white
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# emit <canvas> <content-percent> <filename>
# `-s format png` is explicit because the source may be a JPEG that merely
# carries a .png extension; without it sips would emit JPEG bytes under a .png
# name, which some icon consumers reject.
emit() {
  canvas=$1; pct=$2; name=$3
  inner=$(( canvas * pct / 100 ))
  sips -s format png -Z "$inner" "$SRC" --out "$TMP/$name" >/dev/null
  sips -s format png --padToHeightWidth "$canvas" "$canvas" --padColor "$BG" \
       "$TMP/$name" --out "$OUT/$name" >/dev/null
  printf '  %-26s %sx%s (art %s%%)\n' "$name" "$canvas" "$canvas" "$pct"
}

echo "Generating icons into $OUT"
emit  16 100 favicon-16.png
emit  32 100 favicon-32.png
emit 180  88 apple-touch-icon.png
emit 192  92 icon-192.png
emit 512  92 icon-512.png
emit 192  72 icon-maskable-192.png
emit 512  72 icon-maskable-512.png
echo "Done."
