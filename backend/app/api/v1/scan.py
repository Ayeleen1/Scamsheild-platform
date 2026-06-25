from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from app.core.security import get_current_user
from app.db import repository as repo
from app.schemas.scan import (
    ImageScanRequest,
    MessageScanRequest,
    ProfileScanRequest,
    ReportCreate,
    ReportResponse,
    ScanDetail,
    ScanResult,
    URLScanRequest,
)
from app.services.ai_analyzer import analyze_message as ai_analyze_message
from app.services.image_service import verify_image
from app.services.profile_service import analyze_profile
from app.services.scan_helpers import ai_json_to_scan_result, heuristic_message_scan
from app.services.urlscanner_service import scan_url
from app.services.malware_service import scan_uploaded_file

router = APIRouter(tags=["scam"])


@router.post("/message/quick", response_model=ScanResult)
async def analyze_message_quick_endpoint(request: MessageScanRequest):
    if len(request.text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Message too short to analyze")
    return heuristic_message_scan(request.text)


@router.post("/message", response_model=ScanResult)
async def analyze_message_endpoint(request: MessageScanRequest):
    if len(request.text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Message too short to analyze")
    data = await ai_analyze_message(request.text)
    return ai_json_to_scan_result(data)


@router.post("/url", response_model=ScanResult)
async def analyze_url_endpoint(request: URLScanRequest):
    result = await scan_url(str(request.url))
    if result.risk_level in ("suspicious", "high_risk"):
        await repo.log_security_event(
            event_type="malicious_url_hit",
            severity="medium" if result.risk_level == "suspicious" else "high",
            actor="scanner",
            target=str(request.url),
            meta={"score": result.score},
        )
    return result


@router.post("/profile", response_model=ScanResult)
async def analyze_profile_endpoint(request: ProfileScanRequest):
    return await analyze_profile(str(request.profile_url), request.platform)


@router.post("/image", response_model=ScanResult)
async def verify_image_endpoint(request: ImageScanRequest):
    return await verify_image(str(request.image_url))


@router.post("/file", response_model=ScanResult)
async def scan_file_endpoint(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    content = await file.read()
    result = await scan_uploaded_file(file.filename or "uploaded_file", content)
    await repo.save_file_scan(
        user_email=current_user["email"],
        filename=file.filename or "uploaded_file",
        content=content,
        risk_level=result.risk_level,
        details=[d.model_dump() for d in result.details],
    )
    if result.risk_level in ("suspicious", "high_risk"):
        await repo.log_security_event(
            event_type="file_scan_alert",
            severity="high" if result.risk_level == "high_risk" else "medium",
            actor=current_user["email"],
            target=file.filename or "uploaded_file",
            ip=request.client.host if request.client else "",
            meta={"score": result.score},
        )
    return result


@router.post("/report", response_model=ReportResponse)
async def create_report_endpoint(
    request_http: Request,
    request: ReportCreate,
    current_user: dict = Depends(get_current_user),
):
    report_doc = {
        "created_by": current_user["email"],
        "created_by_name": current_user["name"],
        "source_type": request.source_type,
        "source_value": request.source_value,
        "summary": request.summary,
        "details": [detail.model_dump() for detail in request.details],
        "created_at": datetime.utcnow().isoformat(),
    }
    report_doc["is_public"] = 1
    report_id = await repo.create_report(report_doc)
    await repo.log_security_event(
        event_type="report_created",
        severity="low",
        actor=current_user["email"],
        target=request.source_value,
        ip=request_http.client.host if request_http.client else "",
        meta={"source_type": request.source_type},
    )
    if request.source_type in ("url", "profile", "message"):
        await repo.add_blacklist(request.source_value, request.source_type, request.summary[:120])
        if await repo.detect_report_spike(request.source_type, request.source_value):
            await repo.log_security_event(
                event_type="report_spike",
                severity="high",
                actor="system",
                target=request.source_value,
                meta={"source_type": request.source_type},
            )
    return ReportResponse(
        id=report_id,
        source_type=report_doc["source_type"],
        source_value=report_doc["source_value"],
        summary=report_doc["summary"],
        details=request.details,
        created_at=datetime.fromisoformat(report_doc["created_at"]),
    )


@router.get("/reports", response_model=List[ReportResponse])
async def list_reports_endpoint(current_user: dict = Depends(get_current_user)):
    reports = []
    for doc in await repo.list_reports_for_user(current_user["email"]):
        details_raw = doc.get("details", [])
        details = (
            [ScanDetail(**d) for d in details_raw]
            if details_raw and isinstance(details_raw[0], dict)
            else details_raw
        )
        reports.append(
            ReportResponse(
                id=str(doc.get("id", doc.get("_id", ""))),
                source_type=doc["source_type"],
                source_value=doc["source_value"],
                summary=doc["summary"],
                details=details,
                created_at=datetime.fromisoformat(doc["created_at"]),
            )
        )
    return reports
