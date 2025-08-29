#!/bin/bash
set -e

echo "🚀 Starting CFDI Backend Service..."

# Function to check if service is ready
wait_for_service() {
    local service_url=$1
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for service to be ready at $service_url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$service_url" > /dev/null 2>&1; then
            echo "✅ Service is ready!"
            return 0
        fi
        
        echo "⏳ Attempt $attempt/$max_attempts - Service not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ Service failed to start within expected time"
    return 1
}

# Start virtual display for browser automation if needed
if [ "$DISPLAY" = ":99" ]; then
    echo "🖥️  Starting virtual display..."
    Xvfb :99 -screen 0 1920x1080x24 -ac -nolisten tcp -dpi 96 &
    export DISPLAY=:99
    
    # Wait for display to be ready
    sleep 3
fi

# Check if this is a Python service
if [ -f "zeabur_entry.py" ] || [ -f "api_server.py" ]; then
    echo "🐍 Starting Python Browser Automation Service..."
    
    # Start the Python service
    exec python zeabur_entry.py
elif [ -f "src/index.js" ]; then
    echo "🟢 Starting Node.js Backend Service..."
    
    # Start the Node.js service
    exec node src/index.js
else
    echo "❌ No valid entry point found!"
    echo "Available files:"
    ls -la
    exit 1
fi
