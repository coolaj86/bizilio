#!/bin/bash
curl http://localhost:3000/twilio/voice/dialout \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{ "caller": "+15551119999", "callee": "+15552224444" }'
