from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class InvoiceCreate(BaseModel):
    client_id: str = ""
    client_name: str = Field(..., min_length=1, max_length=200)
    invoice_number: Optional[str] = None
    amount: float = Field(0, ge=0)
    currency: str = Field("USD", min_length=3, max_length=8)
    status: str = "draft"
    due_date: Optional[str] = None
    line_items: List[Dict[str, Any]] = Field(default_factory=list)
    notes: Optional[str] = None

    @field_validator("client_name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        value = v.strip()
        if not value:
            raise ValueError("client_name is required")
        return value


class InvoiceUpdate(BaseModel):
    client_name: Optional[str] = None
    amount: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    line_items: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None


class InventoryCreate(BaseModel):
    sku: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=200)
    category: str = "General"
    quantity: int = Field(0, ge=0)
    reorder_level: int = Field(10, ge=0)
    unit_cost: float = Field(0, ge=0)
    location: str = "Main Warehouse"
    brand_agent: Optional[str] = None


class InventoryUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = Field(None, ge=0)
    reorder_level: Optional[int] = Field(None, ge=0)
    unit_cost: Optional[float] = Field(None, ge=0)
    location: Optional[str] = None
    brand_agent: Optional[str] = None
    delta: Optional[int] = None


class EmployeeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    role: str = "Staff"
    department: str = "General"
    email: str = ""
    phone: Optional[str] = None
    status: str = "active"
    hire_date: Optional[str] = None
    salary: Optional[float] = None
    notes: Optional[str] = None


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    hire_date: Optional[str] = None
    salary: Optional[float] = None
    notes: Optional[str] = None


class OrderCreate(BaseModel):
    order_number: Optional[str] = None
    client_id: str = ""
    client_name: str = Field(..., min_length=1, max_length=200)
    product_id: str = ""
    product_name: str = ""
    quantity: int = Field(1, ge=1)
    unit_price: float = Field(0, ge=0)
    total: Optional[float] = Field(None, ge=0)
    currency: str = "USD"
    status: str = "pending"
    notes: Optional[str] = None


class OrderUpdate(BaseModel):
    client_name: Optional[str] = None
    product_name: Optional[str] = None
    product_id: Optional[str] = None
    client_id: Optional[str] = None
    quantity: Optional[int] = Field(None, ge=1)
    unit_price: Optional[float] = Field(None, ge=0)
    total: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class ProductCreate(BaseModel):
    sku: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=200)
    category: str = "General"
    description: str = ""
    unit_price: float = Field(0, ge=0)
    currency: str = "USD"
    active: bool = True
    brand_agent: Optional[str] = None


class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    unit_price: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = None
    active: Optional[bool] = None
    brand_agent: Optional[str] = None
