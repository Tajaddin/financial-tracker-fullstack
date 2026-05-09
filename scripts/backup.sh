#!/bin/bash

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="financial-tracker"
MONGO_HOST="localhost"
MONGO_PORT="27017"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup
echo "Starting backup..."
mongodump --host $MONGO_HOST:$MONGO_PORT --db $DB_NAME --out $BACKUP_DIR/backup_$TIMESTAMP

# Compress backup
tar -czf $BACKUP_DIR/backup_$TIMESTAMP.tar.gz -C $BACKUP_DIR backup_$TIMESTAMP
rm -rf $BACKUP_DIR/backup_$TIMESTAMP

echo "Backup completed: $BACKUP_DIR/backup_$TIMESTAMP.tar.gz"

# Keep only last 7 backups
ls -t $BACKUP_DIR/*.tar.gz | tail -n +8 | xargs -r rm

echo "Old backups cleaned up."