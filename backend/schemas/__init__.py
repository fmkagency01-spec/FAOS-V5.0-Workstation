"""Pydantic request/response schemas for FAOS v5 API validation."""

from schemas.erp import (
    EmployeeCreate,
    EmployeeUpdate,
    InventoryCreate,
    InventoryUpdate,
    InvoiceCreate,
    InvoiceUpdate,
    OrderCreate,
    OrderUpdate,
    ProductCreate,
    ProductUpdate,
)
from schemas.workflow import (
    AgentAssign,
    ClientCreate,
    ClientUpdate,
    ProjectCreate,
    ProjectUpdate,
)
from schemas.notifications import NotifyRequest

__all__ = [
    "InvoiceCreate",
    "InvoiceUpdate",
    "InventoryCreate",
    "InventoryUpdate",
    "EmployeeCreate",
    "EmployeeUpdate",
    "OrderCreate",
    "OrderUpdate",
    "ProductCreate",
    "ProductUpdate",
    "ClientCreate",
    "ClientUpdate",
    "ProjectCreate",
    "ProjectUpdate",
    "AgentAssign",
    "NotifyRequest",
]
