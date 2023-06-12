#!/usr/bin/env bash

set -e

# SRCNAME=${BASH_SOURCE[0]}
# DIRNAME=$(dirname "$SRCNAME")
DIRNAME="$PWD/test"

export GITHUB_WORKSPACE="$DIRNAME/wksp/repo"
export RUNNER_TOOL_CACHE="$DIRNAME/cache"
export RUNNER_TEMP="$DIRNAME/tmp"
export MOCK=1

BINDIR="$DIRNAME/wksp/v-692624b"
BINNAME="$BINDIR/v"

test() {
  echo "----------------------------------------"
  echo "$1"
  echo "----------------------------------------"
  node "$DIRNAME/../dist/index"
  echo "check v"
  if [ ! -f "$BINNAME" ]; then
    echo "missing v"
    exit 1
  fi
}

echo "clean up"
rm -rf "$DIRNAME/cache" "$DIRNAME/tmp" "$DIRNAME/wksp" "$DIRNAME/../dist/mock"

test "install from archive"

test "skip already installed"

rm -rf "$BINNAME"

test "install missing executable from cache"

rm -rf "$BINDIR"

test "install missing directory from cache"

echo "done"
