#!/bin/bash

# Configuration
BACKUP_FILE=$1
DB_NAME="financial-tracker"
MONGO_HOST="localhost"
MONGO_PORT="27017"
TEMP_DIR="./temp_restore"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore.sh <backup_file.tar.gz>"
    exit 1
fi

# Create temp directory
mkdir -p $TEMP_DIR

# Extract backup
echo "Extracting backup..."
tar -xzf $BACKUP_FILE -C $TEMP_DIR

# Find the backup directory
BACKUP_DIR=$(find $TEMP_DIR -name "$DB_NAME" -type d | head -n 1)
BACKUP_DIR=$(dirname "$BACKUP_DIR")

# Restore database
echo "Restoring database..."
mongorestore --host $MONGO_HOST:$MONGO_PORT --drop --dir $BACKUP_DIR

# Cleanup
rm -rf $TEMP_DIR

echo "Restore completed successfully!"