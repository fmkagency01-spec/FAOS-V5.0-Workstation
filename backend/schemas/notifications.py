from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class NotifyRequest(BaseModel):
    to: List[EmailStr] = Field(..., min_length=1)
    subject: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=10000)
    template: Optional[str] = None
    meta: Optional[dict] = None
