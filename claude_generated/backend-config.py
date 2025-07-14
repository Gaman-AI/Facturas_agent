import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Browser Use Agent"
    
    # Database Configuration
    DATABASE_URL: str = "sqlite:///./browser_agent.db"
    
    # CORS Settings
    BACKEND_CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5173"]
    
    # Agent Configuration
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    
    # Browser Configuration
    HEADLESS_BROWSER: bool = False
    BROWSER_TYPE: str = "chromium"  # chromium, firefox, webkit
    
    # Task Configuration
    MAX_CONCURRENT_TASKS: int = 5
    TASK_TIMEOUT_SECONDS: int = 3600  # 1 hour
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()