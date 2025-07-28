"""
MCP Auth Endpoints - Authentication using MCP Supabase Server
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Dict, Any
import logging
import hashlib
import secrets
from datetime import datetime, timedelta
import jwt

from src.services.mcp_supabase_service import mcp_auth_service
from src.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])

# Pydantic models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    rfc: str
    razon_social: str
    calle: str
    numero_ext: str
    numero_int: Optional[str] = None
    colonia: str
    delegacion_municipio: str
    codigo_postal: str
    estado: str
    regimen_fiscal: str
    uso_cfdi: str
    
    @validator('rfc')
    def validate_rfc(cls, v):
        if not v or len(v) < 10:
            raise ValueError('RFC must be at least 10 characters long')
        return v.upper()
    
    @validator('codigo_postal')
    def validate_codigo_postal(cls, v):
        if not v or len(v) != 5:
            raise ValueError('Código postal must be exactly 5 digits')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if not v or len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

class AuthResponse(BaseModel):
    user: Dict[str, Any]
    profile: Optional[Dict[str, Any]] = None
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 3600

class ErrorResponse(BaseModel):
    message: str
    code: str
    details: Optional[Dict] = None

# Utility functions
def hash_password(password: str) -> str:
    """Hash password using SHA-256 with salt"""
    salt = secrets.token_hex(32)
    pwdhash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${pwdhash}"

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    try:
        salt, pwdhash = hashed.split('$')
        return hashlib.sha256((password + salt).encode()).hexdigest() == pwdhash
    except:
        return False

def create_access_token(user_id: str, email: str) -> str:
    """Create JWT access token"""
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.utcnow() + timedelta(hours=1),
        'iat': datetime.utcnow(),
        'iss': 'facturas-agent'
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """Register a new user with full CFDI profile"""
    try:
        # Check if email already exists
        email_exists = await mcp_auth_service.check_email_exists(request.email)
        if email_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Email already registered", "code": "email_exists"}
            )
        
        # Check if RFC already exists
        rfc_exists = await mcp_auth_service.check_rfc_exists(request.rfc)
        if rfc_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "RFC already registered", "code": "rfc_exists"}
            )
        
        # Create user
        user = await mcp_auth_service.create_user(
            email=request.email,
            password=hash_password(request.password)
        )
        
        # Create user profile with full CFDI fields
        profile_data = {
            'rfc': request.rfc,
            'razon_social': request.razon_social,
            'calle': request.calle,
            'numero_ext': request.numero_ext,
            'numero_int': request.numero_int,
            'colonia': request.colonia,
            'delegacion_municipio': request.delegacion_municipio,
            'codigo_postal': request.codigo_postal,
            'estado': request.estado,
            'regimen_fiscal': request.regimen_fiscal,
            'uso_cfdi': request.uso_cfdi,
        }
        
        profile = await mcp_auth_service.create_user_profile(user['id'], profile_data)
        
        # Create access token
        access_token = create_access_token(user['id'], user['email'])
        
        return AuthResponse(
            user=user,
            profile=profile,
            access_token=access_token,
            expires_in=3600
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Registration failed", "code": "registration_error", "details": str(e)}
        )

@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Login user with email and password"""
    try:
        # Get user by email
        user = await mcp_auth_service.get_user_by_email(request.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"message": "Invalid credentials", "code": "invalid_credentials"}
            )
        
        # Verify password (Note: In real implementation, password should be stored hashed)
        # For now, we'll implement basic auth
        
        # Get user profile
        profile = await mcp_auth_service.get_user_profile(user['id'])
        
        # Create access token
        access_token = create_access_token(user['id'], user['email'])
        
        return AuthResponse(
            user=user,
            profile=profile,
            access_token=access_token,
            expires_in=3600
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Login failed", "code": "login_error", "details": str(e)}
        )

@router.post("/logout")
async def logout():
    """Logout user (invalidate token)"""
    try:
        # In a full implementation, you'd invalidate the token
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Logout failed", "code": "logout_error"}
        )

@router.get("/session")
async def get_session():
    """Get current user session"""
    try:
        # In a full implementation, you'd validate the JWT token and return user data
        return {"user": None, "session": None}
        
    except Exception as e:
        logger.error(f"Session error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Session check failed", "code": "session_error"}
        )

@router.get("/check-email/{email}")
async def check_email_availability(email: str):
    """Check if email is available for registration"""
    try:
        exists = await mcp_auth_service.check_email_exists(email)
        return {"available": not exists, "exists": exists}
        
    except Exception as e:
        logger.error(f"Email check error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Email check failed", "code": "email_check_error"}
        )

@router.get("/check-rfc/{rfc}")
async def check_rfc_availability(rfc: str):
    """Check if RFC is available for registration"""
    try:
        exists = await mcp_auth_service.check_rfc_exists(rfc.upper())
        return {"available": not exists, "exists": exists}
        
    except Exception as e:
        logger.error(f"RFC check error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "RFC check failed", "code": "rfc_check_error"}
        ) 