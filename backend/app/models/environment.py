import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.user import GUID


class EnvironmentType(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class Environment(Base):
    __tablename__ = "environments"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(SQLEnum(EnvironmentType), nullable=False)
    url = Column(String(500), nullable=False)
    service_id = Column(GUID(), ForeignKey("services.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    service = relationship("Service", back_populates="environments")
    health_checks = relationship("HealthCheck", back_populates="environment", cascade="all, delete-orphan")
