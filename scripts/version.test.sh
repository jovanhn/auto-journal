#!/bin/sh
# Tests scripts/version.sh in throwaway git repositories (specs/app-versioning.md, AC 1, 2, 9).
#   sh scripts/version.test.sh
set -eu

script="$(cd "$(dirname "$0")" && pwd)/version.sh"
failures=0

check() { # description expected actual
  if [ "$2" = "$3" ]; then
    echo "ok   $1"
  else
    echo "FAIL $1: expected '$2', got '$3'"
    failures=$((failures + 1))
  fi
}

run() { env -u GITHUB_REF -u RELEASE_BUILD "$@"; }

repo="$(mktemp -d)"
trap 'rm -rf "$repo"' EXIT
cd "$repo"
git init -q -b main
git config user.email test@example.com
git config user.name test
git config tag.gpgSign false
git config commit.gpgSign false

check "no git history" "0.0.0-local" "$(cd / && run sh "$script" frontend)"
git commit -q --allow-empty -m a
check "no matching tag" "0.0.0-local" "$(run sh "$script" frontend)"
if run env RELEASE_BUILD=true sh "$script" frontend > /dev/null 2>&1; then r=passed; else r=failed; fi
check "release build without tag fails" "failed" "$r"

git tag -a frontend/v1.0.0 -m frontend
git tag -a backend/v2.1.0 -m backend
check "tagged commit" "1.0.0" "$(run sh "$script" frontend)"
for i in 1 2 3; do git commit -q --allow-empty -m "$i"; done
check "3 commits after the tag on main" "1.0.3" "$(run sh "$script" frontend)"
check "independent streams" "2.1.3" "$(run sh "$script" backend)"
check "release build on main" "1.0.3" "$(run env RELEASE_BUILD=true sh "$script" frontend)"

git checkout -q -b feature
check "branch commit" "1.0.3-dev" "$(run sh "$script" frontend)"
check "CI ref wins over the local branch" "1.0.3" "$(run env GITHUB_REF=refs/heads/main sh "$script" frontend)"
check "pull request ref" "1.0.3-dev" "$(run env GITHUB_REF=refs/pull/7/merge sh "$script" frontend)"
if run env RELEASE_BUILD=true GITHUB_REF=refs/pull/7/merge sh "$script" frontend > /dev/null 2>&1; then r=passed; else r=failed; fi
check "release build off main fails" "failed" "$r"

git checkout -q main
git tag -a frontend/v1.1.0 -m frontend
check "new minor tag restarts PATCH" "1.1.0" "$(run sh "$script" frontend)"

if sh "$script" other > /dev/null 2>&1; then r=passed; else r=failed; fi
check "unknown component" "failed" "$r"

[ "$failures" -eq 0 ] || { echo "$failures failure(s)"; exit 1; }
echo "all version.sh tests passed"
