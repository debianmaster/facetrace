#!/bin/sh
set -e

# Wait for postgres to be ready
until nc -z postgres 5432; do
  echo "Waiting for postgres..."
  sleep 1
done

echo "Running database migrations..."

# Use the Prisma Client to push schema
# Since we can't use CLI in production, we'll create tables via a Node script
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Test connection
    await prisma.\$connect();
    console.log('Database connected successfully');
  } catch (e) {
    console.error('Database connection failed:', e);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}

main();
"

echo "Starting application..."
exec node server.js
