#!/bin/bash

echo "💣 FULL RESET NODE ENV"

rm -rf node_modules
rm -rf package-lock.json
rm -rf ~/.npm

npm cache clean --force

echo "📦 Reinstalling dependencies..."

npm install

echo "📦 Installing tsx clean..."

npm install --save-dev tsx

echo "✅ ENV CLEAN"
