#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: ./set-server.sh <SERVER_URL>"
    exit 1
fi

SERVER_URL="$1"
CONSTANTS_FILE="./scripts/constants.js"

if [ ! -f "$CONSTANTS_FILE" ]; then
    echo "constants.js not found at $CONSTANTS_FILE"
    exit 1
fi

sed -i.bak -E "s|(SERVER_URI:\s*)\"[^\"]*\"|\1\"$SERVER_URL\"|g" "$CONSTANTS_FILE"

echo "SERVER_URI updated to: $SERVER_URL"
echo "Backup created: scripts/constants.js.bak"
