"""
HIPAA Compliance — Audit Middleware
Automatically logs all API access to the audit_log table.
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from sqlalchemy import text

from app.database import async_session_factory

logger = logging.getLogger(__name__)

# Routes that involve PHI access
PHI_ROUTES = {
    "/api/v1/patients", "/api/v1/consultations", "/api/v1/documents",
    "/api/v1/appointments", "/api/v1/agent",
}

# Routes to skip auditing (health checks, static, etc.)
SKIP_ROUTES = {"/health", "/docs", "/openapi.json", "/redoc", "/"}


class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware that logs all API access for HIPAA compliance."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Skip non-auditable routes
        path = request.url.path
        if any(path.startswith(skip) for skip in SKIP_ROUTES):
            return await call_next(request)

        response = await call_next(request)

        # Fire-and-forget audit log (don't block response)
        try:
            await self._log_access(request, response)
        except Exception as e:
            logger.warning(f"Audit log failed: {e}")

        return response

    async def _log_access(self, request: Request, response: Response):
        """Write an audit entry to the database."""
        path = request.url.path
        method = request.method

        # Determine if PHI was accessed
        is_phi = any(path.startswith(route) for route in PHI_ROUTES)

        # Extract user info from JWT (if available in request state)
        actor_id = None
        actor_type = "system"
        actor_name = None

        # Try to get user from request state (set by auth dependency)
        if hasattr(request.state, "user"):
            user = request.state.user
            actor_id = str(user.user_id)
            actor_type = user.user_type
            actor_name = user.entity.full_name if user.entity else None

        # Determine action from method + path
        action = f"{method.lower()}_{path.split('/')[-1] or 'root'}"

        async with async_session_factory() as session:
            await session.execute(
                text("""
                    INSERT INTO audit_log (
                        audit_id, actor_id, actor_type, actor_name,
                        action, entity_type, ip_address, user_agent,
                        data_sensitivity, is_phi_accessed, created_at
                    ) VALUES (
                        :audit_id, :actor_id, :actor_type, :actor_name,
                        :action, :entity_type, :ip_address, :user_agent,
                        :sensitivity, :is_phi, :created_at
                    )
                """),
                {
                    "audit_id": str(uuid.uuid4()),
                    "actor_id": actor_id or str(uuid.uuid4()),
                    "actor_type": actor_type,
                    "actor_name": actor_name,
                    "action": action[:50],
                    "entity_type": path.split("/")[3] if len(path.split("/")) > 3 else None,
                    "ip_address": request.client.host if request.client else None,
                    "user_agent": request.headers.get("user-agent", "")[:500],
                    "sensitivity": "high" if is_phi else "low",
                    "is_phi": is_phi,
                    "created_at": datetime.now(timezone.utc),
                },
            )
            await session.commit()
