#!/bin/bash
curl http://localhost:3000/twilio/voice/dialout \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{ "caller": "+18013604427", "callee": "+16178996495" }'
