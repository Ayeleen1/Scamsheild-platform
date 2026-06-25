from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from app.core.database import db
from app.core.security import hash_password, verify_password, create_access_token
from jose import JWTError, jwt
from app.core.config import settings

router = APIRouter(tags=["auth"])
security = HTTPBearer()

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/register")
async def register(req: RegisterRequest):
    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(400, "Email already registered")
    
    if len(req.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    
    user = {
        "name": req.name,
        "email": req.email,
        "password_hash": hash_password(req.password),
        "role": "user",
        "total_scans": 0
    }
    result = await db.users.insert_one(user)
    token = create_access_token({"sub": str(result.inserted_id)})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    
    token = create_access_token({"sub": str(user["_id"])})
    return {"access_token": token, "token_type": "bearer"}