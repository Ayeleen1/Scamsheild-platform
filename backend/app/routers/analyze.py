from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.ai_analyzer import analyze_message, analyze_profile
from app.services.url_scanner import scan_url

router = APIRouter(tags=["analyze"])

class MessageRequest(BaseModel):
    text: str

class URLRequest(BaseModel):
    url: str

class ProfileRequest(BaseModel):
    platform: str
    username: str
    bio: str = ""
    followers: int = 0
    following: int = 0
    posts: int = 0
    account_age_days: int = 0

@router.post("/message")
async def check_message(req: MessageRequest):
    if len(req.text) < 5:
        raise HTTPException(400, "Message too short")
    result = await analyze_message(req.text)
    return result

@router.post("/url")
async def check_url(req: URLRequest):
    result = await scan_url(req.url)
    return result

@router.post("/profile")
async def check_profile(req: ProfileRequest):
    result = await analyze_profile(
        req.platform, req.username, req.bio,
        req.followers, req.following, 
        req.posts, req.account_age_days
    )
    return result