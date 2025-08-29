#!/usr/bin/env python3
"""
CFDI Browser Automation Service Entry Point

This is the main entry point for the containerized Python service.
It should be used instead of the test scripts.
"""

import sys
import os
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent.resolve()
sys.path.insert(0, str(current_dir))

def main():
    """Main entry point for the CFDI Browser Automation Service"""
    print("🚀 Starting CFDI Browser Automation Service...")
    print(f"📁 Working directory: {os.getcwd()}")
    print(f"🐍 Python version: {sys.version}")
    
    try:
        # Import and run the FastAPI server
        import uvicorn
        from api_server import app
        
        print("✅ FastAPI application loaded successfully")
        
        # Start the server
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=9000,
            log_level="info",
            access_log=True
        )
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("💡 Make sure all dependencies are installed")
        sys.exit(1)
    except Exception as e:
        print(f"💥 Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
