import json
from typing import Dict, Set
from uuid import UUID
from fastapi import WebSocket
import structlog

logger = structlog.get_logger()


class ConnectionManager:
    def __init__(self):
        # Map of service_id -> set of websocket connections
        self.service_connections: Dict[str, Set[WebSocket]] = {}
        # Map of environment_id -> set of websocket connections
        self.environment_connections: Dict[str, Set[WebSocket]] = {}
        # All active connections
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info("WebSocket connected", total_connections=len(self.active_connections))

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

        # Remove from all service subscriptions
        for service_id in list(self.service_connections.keys()):
            self.service_connections[service_id].discard(websocket)
            if not self.service_connections[service_id]:
                del self.service_connections[service_id]

        # Remove from all environment subscriptions
        for env_id in list(self.environment_connections.keys()):
            self.environment_connections[env_id].discard(websocket)
            if not self.environment_connections[env_id]:
                del self.environment_connections[env_id]

        logger.info("WebSocket disconnected", total_connections=len(self.active_connections))

    def subscribe_to_service(self, websocket: WebSocket, service_id: UUID):
        service_key = str(service_id)
        if service_key not in self.service_connections:
            self.service_connections[service_key] = set()
        self.service_connections[service_key].add(websocket)
        logger.info("Subscribed to service", service_id=service_key)

    def subscribe_to_environment(self, websocket: WebSocket, environment_id: UUID):
        env_key = str(environment_id)
        if env_key not in self.environment_connections:
            self.environment_connections[env_key] = set()
        self.environment_connections[env_key].add(websocket)
        logger.info("Subscribed to environment", environment_id=env_key)

    def unsubscribe_from_service(self, websocket: WebSocket, service_id: UUID):
        service_key = str(service_id)
        if service_key in self.service_connections:
            self.service_connections[service_key].discard(websocket)

    def unsubscribe_from_environment(self, websocket: WebSocket, environment_id: UUID):
        env_key = str(environment_id)
        if env_key in self.environment_connections:
            self.environment_connections[env_key].discard(websocket)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error("Failed to send message", error=str(e))

    async def broadcast_to_all(self, message: dict):
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)

        # Clean up disconnected
        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast_to_service(self, service_id: UUID, message: dict):
        service_key = str(service_id)
        if service_key not in self.service_connections:
            return

        disconnected = set()
        for connection in self.service_connections[service_key]:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)

        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast_to_environment(self, environment_id: UUID, message: dict):
        env_key = str(environment_id)
        if env_key not in self.environment_connections:
            return

        disconnected = set()
        for connection in self.environment_connections[env_key]:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)

        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast_status_update(
        self,
        service_id: UUID,
        environment_id: UUID,
        status: str,
        response_time_ms: int,
        timestamp: str
    ):
        message = {
            "type": "status_update",
            "service_id": str(service_id),
            "environment_id": str(environment_id),
            "status": status,
            "response_time_ms": response_time_ms,
            "timestamp": timestamp
        }

        # Broadcast to service subscribers
        await self.broadcast_to_service(service_id, message)
        # Broadcast to environment subscribers
        await self.broadcast_to_environment(environment_id, message)


# Global connection manager instance
manager = ConnectionManager()
