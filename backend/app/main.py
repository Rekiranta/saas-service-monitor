import asyncio
from contextlib import asynccontextmanager
from uuid import UUID
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import structlog

from app.config import get_settings
from app.database import init_db, async_session_maker
from app.routers import auth_router, services_router, environments_router, health_router, teams_router
from app.websocket import manager
from app.services.monitor_service import perform_health_check
from app.models.environment import Environment
from sqlalchemy import select

logger = structlog.get_logger()
settings = get_settings()

# Background task flag
background_task_running = False


async def periodic_health_checks():
    """Background task to perform health checks every 60 seconds"""
    global background_task_running
    background_task_running = True

    while background_task_running:
        try:
            async with async_session_maker() as db:
                result = await db.execute(select(Environment))
                environments = result.scalars().all()

                for env in environments:
                    try:
                        health_check = await perform_health_check(db, env.id)
                        await db.commit()

                        # Broadcast update via WebSocket
                        await manager.broadcast_status_update(
                            service_id=env.service_id,
                            environment_id=env.id,
                            status=health_check.status.value,
                            response_time_ms=health_check.response_time_ms or 0,
                            timestamp=health_check.checked_at.isoformat()
                        )
                    except Exception as e:
                        logger.error("Health check failed", environment_id=str(env.id), error=str(e))

        except Exception as e:
            logger.error("Periodic health check error", error=str(e))

        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting SaaS Service Monitor API")
    await init_db()

    # Start background health check task
    task = asyncio.create_task(periodic_health_checks())

    yield

    # Shutdown
    global background_task_running
    background_task_running = False
    task.cancel()
    logger.info("Shutting down SaaS Service Monitor API")


app = FastAPI(
    title=settings.app_name,
    description="A production-inspired SaaS monitoring platform for tracking service health across environments",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(teams_router)
app.include_router(services_router)
app.include_router(environments_router)
app.include_router(health_router)


@app.get("/")
async def root():
    return {"message": "SaaS Service Monitor API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()

            # Handle subscription messages
            if data.get("type") == "subscribe":
                if "service_id" in data:
                    manager.subscribe_to_service(websocket, UUID(data["service_id"]))
                    await manager.send_personal_message(
                        {"type": "subscribed", "service_id": data["service_id"]},
                        websocket
                    )
                if "environment_id" in data:
                    manager.subscribe_to_environment(websocket, UUID(data["environment_id"]))
                    await manager.send_personal_message(
                        {"type": "subscribed", "environment_id": data["environment_id"]},
                        websocket
                    )

            elif data.get("type") == "unsubscribe":
                if "service_id" in data:
                    manager.unsubscribe_from_service(websocket, UUID(data["service_id"]))
                if "environment_id" in data:
                    manager.unsubscribe_from_environment(websocket, UUID(data["environment_id"]))

            elif data.get("type") == "ping":
                await manager.send_personal_message({"type": "pong"}, websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error("WebSocket error", error=str(e))
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
