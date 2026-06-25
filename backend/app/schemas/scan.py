from datetime import datetime
from pydantic import BaseModel, HttpUrl
from typing import List, Optional


class MessageScanRequest(BaseModel):
    text: str


class URLScanRequest(BaseModel):
    url: HttpUrl


class ProfileScanRequest(BaseModel):
    profile_url: HttpUrl
    platform: Optional[str] = None


class ImageScanRequest(BaseModel):
    image_url: HttpUrl


class ScanDetail(BaseModel):
    label: str
    value: str


class ScanResult(BaseModel):
    risk_level: str
    score: int
    summary: str
    details: List[ScanDetail]


class ReportCreate(BaseModel):
    source_type: str
    source_value: str
    summary: str
    details: List[ScanDetail] = []


class ReportResponse(BaseModel):
    id: str
    source_type: str
    source_value: str
    summary: str
    details: List[ScanDetail]
    created_at: datetime
