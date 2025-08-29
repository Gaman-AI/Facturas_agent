#!/bin/bash
set -e

# Start virtual display for browser automation
if [ "$DISPLAY" = ":99" ]; then
    echo "🖥️  Starting virtual display..."
    Xvfb :99 -screen 0 1920x1080x24 -ac -nolisten tcp -dpi 96 &
    export DISPLAY=:99
fi

# Wait for display to be ready
sleep 2

# Start the application
echo "🚀 Starting CFDI Browser Automation Service..."
exec python zeabur_entry.py
