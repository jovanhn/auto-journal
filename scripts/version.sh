#!/bin/sh
# Prints the version of one component (specs/app-versioning.md, ADR 0023).
#
#   scripts/version.sh frontend|backend
#
# Tags <component>/vX.Y.0 set MAJOR.MINOR; PATCH counts the commits since the newest such tag:
#   on main                 -> X.Y.N
#   on any other branch/PR  -> X.Y.N-dev
#   no git / no matching tag -> 0.0.0-local
# With RELEASE_BUILD=true (production builds) a -dev or 0.0.0-local result is an error instead.
set -eu

component="${1:-}"
case "$component" in
  frontend | backend) ;;
  *)
    echo "usage: $0 frontend|backend" >&2
    exit 2
    ;;
esac

release="${RELEASE_BUILD:-false}"

fail() {
  echo "version.sh: $1" >&2
  exit 1
}

fallback() {
  if [ "$release" = "true" ]; then
    fail "$1 A production build needs the full git history and a ${component}/vX.Y.0 tag (checkout with fetch-depth: 0)."
  fi
  echo "0.0.0-local"
  exit 0
}

git rev-parse --git-dir > /dev/null 2>&1 || fallback "not a git repository."

described="$(git describe --tags --long --match "${component}/v*" 2> /dev/null)" \
  || fallback "no ${component}/v* tag reachable from HEAD."

# <component>/vX.Y.Z-<N>-g<sha>
rest="${described#"${component}/v"}"
count="${rest%-g*}"
count="${count##*-}"
tag_version="${rest%-*-g*}"
major="${tag_version%%.*}"
minor_patch="${tag_version#*.}"
minor="${minor_patch%%.*}"

case "$major$minor$count" in
  '' | *[!0-9]*) fail "cannot parse '$described'." ;;
esac

# The branch: GitHub Actions sets GITHUB_REF; locally ask git.
if [ -n "${GITHUB_REF:-}" ]; then
  on_main=$([ "$GITHUB_REF" = "refs/heads/main" ] && echo true || echo false)
else
  on_main=$([ "$(git rev-parse --abbrev-ref HEAD 2> /dev/null)" = "main" ] && echo true || echo false)
fi

version="${major}.${minor}.${count}"
if [ "$on_main" != "true" ]; then
  [ "$release" = "true" ] && fail "production builds run only on main (got ${GITHUB_REF:-a local branch})."
  version="${version}-dev"
fi

echo "$version"
