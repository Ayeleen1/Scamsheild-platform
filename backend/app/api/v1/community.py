from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db import repository as repo

router = APIRouter(tags=["community"])


class AnonymousReport(BaseModel):
    source_type: str = Field(max_length=32)
    source_value: str = Field(max_length=500)
    summary: str = Field(max_length=500)
    platform: str = Field(default="unknown", max_length=32)


@router.get("/reports")
async def community_reports(limit: int = 30):
    limit = min(max(limit, 1), 100)
    return {"reports": await repo.list_community_reports(limit)}


@router.get("/blacklist")
async def community_blacklist(limit: int = 50):
    limit = min(max(limit, 1), 200)
    return {"items": await repo.list_blacklist(limit)}


@router.post("/report-anonymous")
async def anonymous_report(body: AnonymousReport):
    if len(body.summary.strip()) < 5:
        raise HTTPException(400, "Summary too short")
    rid = await repo.create_anonymous_report(
        body.source_type,
        body.source_value.strip(),
        body.summary.strip(),
        body.platform,
    )
    return {"message": "Report added to community database", "id": rid}
