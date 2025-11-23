# Unknown Faces Cleanup Job

This background job cleans up the `UnassignedFace` table by removing duplicates and invalid entries.

## What it does

1. **Removes faces with missing images**: Deletes database entries where the image file doesn't exist
2. **Removes duplicates**: Finds faces with similar embeddings (>70% similarity) within a 5-minute time window and keeps only the oldest one
3. **Cleans up orphaned files**: Deletes image files for removed database entries

## Configuration

Edit `scripts/cleanup-unknown-faces.ts` to adjust:
- `SIMILARITY_THRESHOLD`: 0.7 (70% similarity for duplicates)
- `TIME_WINDOW_MINUTES`: 5 (consider faces within 5 minutes)
- `MIN_DETECTION_SCORE`: 0.3 (minimum detection quality - not currently used)

## Running manually

From the web-app directory:
```bash
npm run cleanup
```

Or from Docker:
```bash
docker compose exec web-app npm run cleanup
```

## Running as a cron job

To run automatically every hour, add to the container's crontab:
```
0 * * * * cd /app && npm run cleanup >> /var/log/cleanup.log 2>&1
```

Or use the provided shell script:
```
0 * * * * /app/scripts/run-cleanup.sh >> /var/log/cleanup.log 2>&1
```

## Output

The script logs:
- Number of faces deleted due to missing images
- Number of duplicate faces removed
- Total remaining unknown faces
