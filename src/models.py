from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class MessageAnalysisRequest(BaseModel):
    text: str
    platform: str = "general"  # e.g., WhatsApp, Telegram, Facebook
    sender_info: Optional[dict] = None

class ScamAnalysisResult(BaseModel):
    is_scam: bool
    confidence_score: float = Field(..., ge=0, le=1)
    scam_type: Optional[str] = None
    reasoning: str
    risk_level: str  # Low, Medium, High, Critical
    suggested_actions: List[str]
    detected_at: datetime = Field(default_factory=datetime.now)

class FlaggedScam(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    text: str
    platform: str
    analysis: ScamAnalysisResult
    created_at: datetime = Field(default_factory=datetime.now)
