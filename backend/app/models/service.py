import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.user import GUID


class Service(Base):
    __tablename__ = "services"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    url = Column(String(500), nullable=True)
    team_id = Column(GUID(), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    team = relationship("Team", back_populates="services")
    environments = relationship("Environment", back_populates="service", cascade="all, delete-orphan")
