#!/bin/bash

echo "🔧 Setting up test environment..."

# Criar banco de dados de teste
echo "📊 Creating test database..."
psql -U postgres -c "DROP DATABASE IF EXISTS dialcare_test;"
psql -U postgres -c "CREATE DATABASE dialcare_test;"

# Rodar migrations
echo "📝 Running migrations..."
export DATABASE_URL=$TEST_DATABASE_URL
npm run migrate

# Seed dados de teste (opcional)
echo "🌱 Seeding test data..."
npm run seed:test

echo "✅ Test environment ready!"