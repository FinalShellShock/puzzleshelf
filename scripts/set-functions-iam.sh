#!/bin/bash
# Grant allUsers roles/run.invoker on all Cloud Run services.
# Run this after every `firebase deploy --only functions`.
#
# Firebase CLI's invoker="public" in the Python decorator is not serialized
# into functions.yaml, so the CLI doesn't apply the IAM binding automatically.
# This script sets it manually using the Firebase CLI's stored OAuth token.

set -e

PROJECT="puzzle-shelf"
REGION="us-central1"
SERVICES="fetch-crossword generate-sudoku check-puzzle reveal-cells delete-puzzle"

TOKEN=$(cat ~/.config/configstore/firebase-tools.json | python3 -c "import json,sys; print(json.load(sys.stdin)['tokens']['access_token'])")

for SERVICE in $SERVICES; do
  echo "Setting allUsers run.invoker for $SERVICE..."
  RESULT=$(curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"policy":{"bindings":[{"role":"roles/run.invoker","members":["allUsers"]}]}}' \
    "https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/services/${SERVICE}:setIamPolicy")
  echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print('  OK:', d.get('bindings'))" 2>/dev/null || echo "  ERROR: $RESULT"
done

echo "Done."
