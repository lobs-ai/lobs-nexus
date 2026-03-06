#!/bin/bash
# Start the Nexus Reflections API on port 8000
cd "$(dirname "$0")"
exec venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload
