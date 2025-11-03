#!/bin/bash

echo "🧹 Cleaning up test environment..."

# Dropar banco de teste
psql -U postgres -c "DROP DATABASE IF EXISTS dialcare_test;"

echo "✅ Cleanup complete!"