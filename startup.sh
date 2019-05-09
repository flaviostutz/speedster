#!/bin/bash
set -e
set -x

sed -i 's/var MIN_COUNT = 20/var MIN_COUNT = '"$PING_MIN_COUNT"'/g' /opt/speedster.html
sed -i 's/var MAX_COUNT = 40/var MAX_COUNT = '"$PING_MAX_COUNT"'/g' /opt/speedster.html
sed -i 's/var MAX_DURATION = 5000/var MAX_DURATION = '"$PING_MAX_DURATION"'/g' /opt/speedster.html

sed -i 's/MIN_COUNT = 5/var MIN_COUNT = '"$TRANSFER_MIN_COUNT"'/g' /opt/speedster.html
sed -i 's/MAX_COUNT = 10/var MAX_COUNT = '"$TRANSFER_MAX_COUNT"'/g' /opt/speedster.html
sed -i 's/MAX_DURATION = 15000/var MAX_DURATION = '"$TRANSFER_MAX_DURATION"'/g' /opt/speedster.html
sed -i 's/MAX_STEPS = 4/var MAX_STEPS = '"$TRANSFER_MAX_STEPS"'/g' /opt/speedster.html

echo "Speedster..."
speedster \
    --loglevel=$LOG_LEVEL \
    --base-dir=$BASE_DIR \
    --mongo-host=$MONGO_HOST \
    --mongo-username=$MONGO_USERNAME \
    --mongo-password=$MONGO_PASSWORD
    
