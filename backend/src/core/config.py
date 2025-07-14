import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List

class Settings(BaseSettings):
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Browser Use Agent"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database Configuration
    DATABASE_URL: str = "sqlite:///./browser_agent.db"
    
    # CORS Settings - Allow frontend origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173", 
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000"
    ]
    
    # Agent Configuration
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    AZURE_OPENAI_ENDPOINT: Optional[str] = None
    AZURE_OPENAI_KEY: Optional[str] = None
    DEEPSEEK_API_KEY: Optional[str] = None
    GROK_API_KEY: Optional[str] = None
    NOVITA_API_KEY: Optional[str] = None
    
    # Default LLM Configuration
    DEFAULT_LLM_PROVIDER: str = "openai"
    DEFAULT_LLM_MODEL: str = "gpt-4o"
    
    # Browser Configuration
    BROWSER_HEADLESS: bool = False
    BROWSER_TYPE: str = "chromium"  # chromium, firefox, webkit
    BROWSER_TIMEOUT: int = 30000
    
    # Task Configuration
    MAX_CONCURRENT_TASKS: int = 5
    TASK_TIMEOUT_SECONDS: int = 3600  # 1 hour
    
    # WebSocket Configuration
    WS_HOST: str = "0.0.0.0"
    WS_PORT: int = 8000
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Security
    SECRET_KEY: str = "your_secret_key_here_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")
    
    @property
    def cors_origins(self) -> List[str]:
        """Get CORS origins as a list"""
        if isinstance(self.BACKEND_CORS_ORIGINS, str):
            return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",")]
        return self.BACKEND_CORS_ORIGINS

# Create settings instance
settings = Settings() 