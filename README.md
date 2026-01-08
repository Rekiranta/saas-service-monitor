# SaaS Service Monitor

A production-inspired SaaS monitoring platform for tracking service health across multiple environments (development, staging, production) in real-time.

## Features

- **Multi-environment monitoring**: Track dev, staging, and production environments per service
- **Real-time updates**: WebSocket-powered live status changes
- **Role-based access control**: Admin, member, and viewer permissions
- **Health history**: Visual charts showing uptime and response times
- **Team organization**: Group services by team
- **Docker-ready**: Full containerization for easy deployment

## Tech Stack

### Backend
- **Python 3.12** with FastAPI
- **SQLAlchemy** (async) with PostgreSQL
- **Alembic** for database migrations
- **JWT** authentication with bcrypt
- **WebSockets** for real-time communication
- **Structlog** for structured logging

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Recharts** for data visualization
- **Lucide React** for icons

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.12+ (for local backend development)

### Quick Start with Docker

```bash
# Clone the repository
git clone <repo-url>
cd saas-service-monitor

# Start all services
docker compose up -d

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Local Development

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows
# source .venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run database migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Project Structure

```
saas-service-monitor/
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── routers/         # API routes
│   │   ├── services/        # Business logic
│   │   ├── websocket/       # WebSocket handlers
│   │   └── utils/           # Utilities
│   ├── alembic/             # Database migrations
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom hooks
│   │   ├── context/         # React context
│   │   ├── api/             # API client
│   │   └── types/           # TypeScript types
│   └── package.json
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user

### Teams
- `GET /api/teams` - List teams
- `POST /api/teams` - Create team
- `DELETE /api/teams/{id}` - Delete team

### Services
- `GET /api/services` - List services
- `POST /api/services` - Create service
- `GET /api/services/{id}` - Get service details
- `DELETE /api/services/{id}` - Delete service

### Environments
- `GET /api/services/{id}/environments` - List environments
- `POST /api/services/{id}/environments` - Add environment

### Health Checks
- `POST /api/health-checks/trigger` - Trigger manual check
- `GET /api/health-checks/environment/{id}` - Get check history

### WebSocket
- `WS /ws` - Real-time status updates

## Environment Variables

### Backend
```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/service_monitor
SECRET_KEY=your-secret-key
DEBUG=true
CORS_ORIGINS=["http://localhost:5173"]
```

## License

MIT
