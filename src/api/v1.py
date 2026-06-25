from fastapi import APIRouter, Depends, HTTPException
from src.models import MessageAnalysisRequest, ScamAnalysisResult, FlaggedScam
from src.services.detector import scam_detector
from src.db.mongodb import get_database
from typing import List
from datetime import datetime

router = APIRouter()

@router.post("/analyze", response_model=ScamAnalysisResult)
async def analyze_message(request: MessageAnalysisRequest, db = Depends(get_database)):
    analysis = await scam_detector.analyze_message(request.text, request.platform)
    
    # Store flagged scams in database if it's a scam
    if analysis.is_scam:
        scam_record = {
            "text": request.text,
            "platform": request.platform,
            "analysis": analysis.dict(),
            "created_at": datetime.now()
        }
        await db.flagged_scams.insert_one(scam_record)
        
    return analysis

@router.get("/scams", response_model=List[dict])
async def get_flagged_scams(limit: int = 10, db = Depends(get_database)):
    cursor = db.flagged_scams.find().sort("created_at", -1).limit(limit)
    scams = []
    async for document in cursor:
        document["_id"] = str(document["_id"])
        scams.append(document)
    return scams
