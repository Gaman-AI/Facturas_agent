#!/usr/bin/env python3
"""
Backend startup script for Browser Use Agent
"""

import os
import sys
import subprocess
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        logger.error("Python 3.8 or higher is required")
        sys.exit(1)
    logger.info(f"Python version: {sys.version}")

def setup_environment():
    """Setup environment variables and check requirements"""
    # Check if .env file exists
    env_file = Path(".env")
    if not env_file.exists():
        logger.warning(".env file not found. Creating from .env.example...")
        example_file = Path(".env.example")
        if example_file.exists():
            import shutil
            shutil.copy(example_file, env_file)
            logger.info("Created .env file from .env.example")
        else:
            logger.warning("No .env.example file found. Please create .env manually")

def install_requirements():
    """Install Python requirements"""
    requirements_file = Path("requirements.txt")
    if requirements_file.exists():
        logger.info("Installing requirements...")
        try:
            subprocess.run([
                sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
            ], check=True)
            logger.info("Requirements installed successfully")
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to install requirements: {e}")
            sys.exit(1)
    else:
        logger.warning("requirements.txt not found")

def start_server():
    """Start the FastAPI server"""
    logger.info("Starting FastAPI server...")
    try:
        # Change to the correct directory if needed
        os.chdir(Path(__file__).parent)
        
        # Start uvicorn server
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload",
            "--log-level", "info"
        ], check=True)
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1)

def main():
    """Main startup function"""
    logger.info("=== Browser Use Agent Backend Startup ===")
    
    # Check Python version
    check_python_version()
    
    # Setup environment
    setup_environment()
    
    # Install requirements
    install_requirements()
    
    # Start server
    start_server()

if __name__ == "__main__":
    main()