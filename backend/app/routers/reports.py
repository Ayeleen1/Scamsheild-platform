from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.client import db

router = APIRouter(tags=["reports"])


class ReportRequest(BaseModel):
    platform: str
    username: str
    scam_type: str
    description: str


@router.post("/submit")
async def submit_report(req: ReportRequest):
    report = {
        "platform": req.platform,
        "username": req.username,
        "scam_type": req.scam_type,
        "description": req.description,
        "submitted_at": datetime.utcnow().isoformat(),
        "status": "pending",
    }
    try:
        result = await db.community_reports.insert_one(report)
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable. Start MongoDB or check MONGO_URI.")
    return {
        "message": "Report submitted successfully",
        "report_id": str(result.inserted_id),
    }


@router.get("/list")
async def list_reports():
    reports = []
    try:
        cursor = db.community_reports.find().sort("submitted_at", -1).limit(50)
        async for report in cursor:
            report["_id"] = str(report["_id"])
            reports.append(report)
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable.")
    return {"reports": reports}
