#!/bin/bash
PHONE=$1
HOSTING=$2
echo ${PHONE} ${HOSTING}
curl http://localhost:3000/twilio/conference \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{ "callee": "'${PHONE}'", "host": "'${HOSTING}'" }'
