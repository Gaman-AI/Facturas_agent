from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import logging
import os
import sys
import asyncio
from pathlib import Path

# CRITICAL: Set event loop policy BEFORE any other imports
if sys.platform.startswith('win'):
    # Use WindowsProactorEventLoopPolicy for subprocess support
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    print("✅ Windows Proactor Event Loop Policy set")

from src.core.config import settings
from src.api.endpoints import tasks, health, browser_agent_realtime
from src.agent.socket_manager import socket_manager
from src.db.database import create_tables

# Enhanced logging configuration
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('app.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# Add playwright-specific logging
playwright_logger = logging.getLogger('playwright')
playwright_logger.setLevel(logging.DEBUG)

async def verify_playwright_installation():
    """Verify Playwright is properly installed and browsers are available"""
    try:
        from playwright.async_api import async_playwright
        logger.info("🔍 Verifying Playwright installation...")
        
        async with async_playwright() as p:
            # Check if chromium is installed
            try:
                browser = await p.chromium.launch(headless=True)
                await browser.close()
                logger.info("✅ Playwright Chromium browser verified")
                return True
            except Exception as e:
                logger.error(f"❌ Chromium browser not available: {e}")
                logger.info("💡 Run: playwright install chromium")
                return False
                
    except ImportError as e:
        logger.error(f"❌ Playwright not installed: {e}")
        logger.info("💡 Run: pip install playwright")
        return False
    except Exception as e:
        logger.error(f"❌ Playwright verification failed: {e}")
        return False

async def check_system_resources():
    """Check system resources and provide warnings"""
    try:
        import psutil
        cpu_percent = psutil.cpu_percent(interval=1)
        memory_percent = psutil.virtual_memory().percent
        
        logger.info(f"💻 System Resources - CPU: {cpu_percent}%, Memory: {memory_percent}%")
        
        if cpu_percent > 80:
            logger.warning(f"⚠️ High CPU usage: {cpu_percent}%")
        if memory_percent > 80:
            logger.warning(f"⚠️ High memory usage: {memory_percent}%")
            
        return cpu_percent < 90 and memory_percent < 90
    except ImportError:
        logger.info("psutil not installed, skipping resource check")
        return True
    except Exception as e:
        logger.warning(f"Resource check failed: {e}")
        return True

async def test_subprocess_creation():
    """Test if subprocess creation works"""
    try:
        logger.info("🧪 Testing subprocess creation...")
        if sys.platform.startswith('win'):
            proc = await asyncio.create_subprocess_exec(
                'cmd', '/c', 'echo', 'test',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
        else:
            proc = await asyncio.create_subprocess_exec(
                'echo', 'test',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
        
        stdout, stderr = await proc.communicate()
        if proc.returncode == 0:
            logger.info("✅ Subprocess creation test passed")
            return True
        else:
            logger.error(f"❌ Subprocess test failed with return code: {proc.returncode}")
            return False
            
    except NotImplementedError as e:
        logger.error(f"❌ NotImplementedError in subprocess test: {e}")
        logger.error("💡 This indicates the event loop doesn't support subprocesses")
        return False
    except Exception as e:
        logger.error(f"❌ Subprocess test failed: {e}")
        return False

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting up the Browser Use Agent API...")
    logger.info(f"🌐 API will be available at: http://{settings.HOST}:{settings.PORT}")
    logger.info(f"🔗 CORS origins: {settings.cors_origins}")
    
    # System checks
    logger.info("🔧 Running system diagnostics...")
    
    # Test subprocess creation
    subprocess_ok = await test_subprocess_creation()
    if not subprocess_ok:
        logger.error("❌ Subprocess creation failed - this will cause Playwright issues")
        logger.info("💡 Try running in a different environment or check Python installation")
    
    # Check system resources
    resources_ok = await check_system_resources()
    if not resources_ok:
        logger.warning("⚠️ System resources are high - this may cause instability")
    
    # Verify Playwright
    playwright_ok = await verify_playwright_installation()
    if not playwright_ok:
        logger.error("❌ Playwright verification failed")
    
    # Database setup
    try:
        await create_tables()
        logger.info("✅ Database tables created/verified successfully")
    except Exception as e:
        logger.error(f"❌ Failed to create database tables: {e}")
        raise
    
    # Summary
    if subprocess_ok and playwright_ok:
        logger.info("✅ All system checks passed - ready to handle browser automation tasks")
    else:
        logger.warning("⚠️ Some system checks failed - browser automation may not work properly")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down the Browser Use Agent API...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API for managing browser automation tasks with real-time updates",
    version="1.0.0",
    lifespan=lifespan
)

# Enhanced CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Enhanced error handling middleware
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"🚨 Global exception handler: {exc}", exc_info=True)
    
    # Special handling for NotImplementedError
    if isinstance(exc, NotImplementedError):
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Subprocess not supported on this system", 
                "error": str(exc),
                "suggestion": "Try running with WindowsProactorEventLoopPolicy or on a different system"
            }
        )
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

# Include API routes with proper prefixes
app.include_router(health.router, prefix=settings.API_V1_STR, tags=["health"])
app.include_router(tasks.router, prefix=settings.API_V1_STR, tags=["tasks"])
app.include_router(browser_agent_realtime.router, prefix=settings.API_V1_STR, tags=["browser-agent-realtime"])

# Enhanced WebSocket endpoint with better error handling
@app.websocket("/ws/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    logger.info(f"🔌 WebSocket connection attempt for task {task_id}")
    
    try:
        await socket_manager.connect(websocket, task_id)
        logger.info(f"✅ WebSocket connected for task {task_id}")
        
        while True:
            # Keep connection alive and listen for any client messages
            data = await websocket.receive_text()
            logger.info(f"📨 Received message from client for task {task_id}: {data}")
            
    except WebSocketDisconnect:
        socket_manager.disconnect(websocket, task_id)
        logger.info(f"🔌 Client disconnected from task {task_id}")
    except Exception as e:
        logger.error(f"🚨 WebSocket error for task {task_id}: {e}", exc_info=True)
        socket_manager.disconnect(websocket, task_id)

# Root endpoint with system status
@app.get("/")
async def root():
    return {
        "message": "Browser Use Agent API is running",
        "version": "1.0.0",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
        "system": {
            "platform": sys.platform,
            "python_version": sys.version,
            "event_loop_policy": str(asyncio.get_event_loop_policy()),
        }
    }

# Enhanced health check
@app.get("/health")
async def health_check():
    try:
        # Quick system check
        subprocess_ok = await test_subprocess_creation()
        
        return {
            "status": "healthy" if subprocess_ok else "degraded",
            "service": "Browser Use Agent API",
            "version": "1.0.0",
            "system": {
                "subprocess_support": subprocess_ok,
                "platform": sys.platform,
                "event_loop": str(type(asyncio.get_event_loop()).__name__),
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": "Browser Use Agent API", 
            "version": "1.0.0",
            "error": str(e)
        }

# Debug endpoint to test browser automation
@app.post("/debug/test-browser")
async def test_browser_automation():
    """Test endpoint to verify browser automation works"""
    try:
        from playwright.async_api import async_playwright
        
        logger.info("🧪 Testing browser automation...")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto("https://example.com")
            title = await page.title()
            await browser.close()
            
            logger.info(f"✅ Browser test successful - page title: {title}")
            return {
                "status": "success",
                "message": "Browser automation test passed",
                "page_title": title
            }
            
    except Exception as e:
        logger.error(f"❌ Browser test failed: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "status": "failed",
                "message": "Browser automation test failed",
                "error": str(e)
            }
        )

if __name__ == "__main__":
    # Additional Windows-specific setup
    if sys.platform.startswith('win'):
        # Ensure we're using the right event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        print(f"✅ Event loop set: {type(loop).__name__}")
    
    # Enhanced uvicorn configuration
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level=settings.LOG_LEVEL.lower(),
        loop="asyncio",  # Force asyncio loop
        access_log=True
    )