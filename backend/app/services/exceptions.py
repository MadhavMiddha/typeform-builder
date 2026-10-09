"""Service-layer exception types.

Routers catch these and convert them to the standard HTTP error shape.
"""
from __future__ import annotations


class NotFoundError(Exception):
    """Raised when the requested resource does not exist."""

    def __init__(self, message: str = "Resource not found.", code: str = "NOT_FOUND") -> None:
        self.message = message
        self.code = code
        super().__init__(message)


class ForbiddenError(Exception):
    """Raised when the current user does not own the resource."""

    def __init__(self, message: str = "Access forbidden.") -> None:
        self.message = message
        super().__init__(message)


class ConflictError(Exception):
    """Raised on invalid state transitions (409)."""

    def __init__(self, message: str, code: str = "CONFLICT") -> None:
        self.message = message
        self.code = code
        super().__init__(message)


class ValidationError(Exception):
    """Raised on business-logic validation failures (422)."""

    def __init__(self, message: str, fields: dict | None = None) -> None:
        self.message = message
        self.fields = fields or {}
        super().__init__(message)
