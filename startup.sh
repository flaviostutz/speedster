#!/bin/bash
set -e
set -x

echo "Speedster..."
speedster \
    --loglevel=$LOG_LEVEL \
    --base-dir=$BASE_DIR \
    --mongo-host=$MONGO_HOST \
    --mongo-username=$MONGO_USERNAME \
    --mongo-password=$MONGO_PASSWORD
    


