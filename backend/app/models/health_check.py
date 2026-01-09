import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, Integer, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.user import GUID


class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"
    UNKNOWN = "unknown"


class HealthCheck(Base):
    __tablename__ = "health_checks"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    environment_id = Column(GUID(), ForeignKey("environments.id", ondelete="CASCADE"), nullable=False)
    status = Column(SQLEnum(HealthStatus), nullable=False)
    response_time_ms = Column(Integer, nullable=True)
    status_code = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    checked_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    environment = relationship("Environment", back_populates="health_checks")
