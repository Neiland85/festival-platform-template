#!/usr/bin/env bash
set -e

echo "Checking unresolved @/ imports..."

errors=0

for file in $(git ls-files "*.ts" "*.tsx"); do
  grep -Eo 'from "@\/[^"]+"' "$file" | sed 's/from "\(.*\)"/\1/' | while read import; do
    path="src/${import#@/}"

    if [ ! -f "$path.ts" ] \
    && [ ! -f "$path.tsx" ] \
    && [ ! -f "$path/index.ts" ] \
    && [ ! -f "$path/index.tsx" ]; then
      echo "❌ Broken import: $import in $file"
      errors=1
    fi
  done
done

if [ $errors -ne 0 ]; then
  echo ""
  echo "Broken imports detected."
  exit 1
fi

echo "✔ Imports look valid."
