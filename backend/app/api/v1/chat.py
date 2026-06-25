from pydantic import BaseModel, Field

from fastapi import APIRouter

from app.services.chat_service import chat_reply

router = APIRouter(tags=["chat"])


class ChatHistoryItem(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(max_length=1500)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1500)
    history: list[ChatHistoryItem] = []


@router.post("/message")
async def send_chat_message(body: ChatRequest):
    hist = [{"role": h.role, "content": h.content} for h in body.history[-6:]]
    result = await chat_reply(body.message, hist)
    return result
