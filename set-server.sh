#!/bin/bash

# Usage check

if [ -z "$1" ]; then
    echo "x Usage: ./set-server.sh <SERVER_URL>"
    echo "Example: ./set-server.sh https://vaad-backend.onrender.com"
    exit 1
fi

SERVER_URL=$1;
CONSTANTS_FILE="./scripts/constants.js"

# safety check
if [ ! -f "$CONSTANTS_FILE" ]; then
    echo "X constant.js not found at $CONSTANTS_FILE"
    exit 1
fi

# backup
cp "$CONSTANTS_FILE" "$CONSTANTS_FILE.bak"

# replace SERVER_URI value
sed -i '' -E "s|(SERVER_URI:\s*)\"[^\"]*\"|\1\"$SERVER_URL\"|g" "$CONSTANTS_FILE" 2>/dev/null \
|| sed -i -E "s|(SERVER_URI:\s*)\"[^\"]*\"|\1\"$SERVER_URL\"|g" "$CONSTANTS_FILE"

echo "SERVER_URI updated to: $SERVER_URL"
echo "Backup created:  scripts/constants.js.bak"
