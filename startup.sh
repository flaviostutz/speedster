#!/bin/bash
set -e
set -x

echo "Speedster..."
speedster \
    --loglevel=$LOG_LEVEL \
    --base-dir=$BASE_DIR


