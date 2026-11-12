#!/bin/sh
# Starts a new MAJOR.MINOR for one component (specs/app-versioning.md, ADR 0023).
#
#   scripts/tag-release.sh frontend|backend X.Y
#
# Creates the annotated tag <component>/vX.Y.0 on origin/main and pushes it. The tag triggers no build;
# the next production deploy of that component is numbered X.Y.N (N = commits since the tag).
set -eu

component="${1:-}"
minor_version="${2:-}"
case "$component" in
  frontend | backend) ;;
  *)
    echo "usage: $0 frontend|backend X.Y" >&2
    exit 2
    ;;
esac
case "$minor_version" in
  *[!0-9.]* | .* | *. | *..* | '') echo "version must be X.Y (for example 1.3)" >&2; exit 2 ;;
esac
[ "$(echo "$minor_version" | tr -cd '.' | wc -c)" -eq 1 ] || { echo "version must be X.Y (for example 1.3)" >&2; exit 2; }

tag="${component}/v${minor_version}.0"
git fetch --quiet --tags origin main
if git rev-parse -q --verify "refs/tags/$tag" > /dev/null; then
  echo "tag $tag already exists; tags are never moved" >&2
  exit 1
fi

git tag -a "$tag" -m "$component $minor_version" origin/main
git push origin "$tag"
echo "Tagged origin/main as $tag. The next $component deploy will be ${minor_version}.N."
