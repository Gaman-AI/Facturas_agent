#!/usr/bin/env python3
"""
ZEABUR ENTRY POINT - DO NOT DELETE OR RENAME

This file is specifically for Zeabur deployment.
It ensures the correct service is started.
"""

import os
import sys
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent.resolve()
sys.path.insert(0, str(current_dir))

def main():
    """Main entry point for Zeabur deployment"""
    print("🚀 ZEABUR: Starting CFDI Browser Automation Service...")
    print(f"📁 Working directory: {os.getcwd()}")
    print(f"🐍 Python version: {sys.version}")
    print(f"🔧 Environment: {os.environ.get('PYTHON_ENV', 'unknown')}")
    
    try:
        # Import and run the FastAPI server
        import uvicorn
        from api_server import app
        
        print("✅ FastAPI application loaded successfully")
        print("🌐 Starting server on port 9000...")
        
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
        print("📋 Available modules:")
        try:
            import pkg_resources
            installed_packages = [d.project_name for d in pkg_resources.working_set]
            for pkg in sorted(installed_packages):
                if 'browser' in pkg.lower() or 'fastapi' in pkg.lower() or 'uvicorn' in pkg.lower():
                    print(f"  - {pkg}")
        except:
            pass
        sys.exit(1)
    except Exception as e:
        print(f"💥 Failed to start server: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
