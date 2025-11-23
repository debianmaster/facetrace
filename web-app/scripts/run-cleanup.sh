#!/bin/sh
# Cron job to run cleanup every hour
# Add to crontab: 0 * * * * /app/scripts/run-cleanup.sh

cd /app
node_modules/.bin/tsx scripts/cleanup-unknown-faces.ts
