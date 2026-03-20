#!/bin/bash

DURATION_HOURS=6 \
WORKERS=30 \
CHAOS=true \
CHAOS_REDIS_PROXY=true \
npx tsx tests/soak/long-soak-runner.ts | tee soak-output.log
