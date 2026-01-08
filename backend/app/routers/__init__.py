from app.routers.auth import router as auth_router
from app.routers.services import router as services_router
from app.routers.environments import router as environments_router
from app.routers.health import router as health_router
from app.routers.teams import router as teams_router

__all__ = ["auth_router", "services_router", "environments_router", "health_router", "teams_router"]
