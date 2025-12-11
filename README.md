# EDUCORE - Contextual Assistant (RAG / Knowledge Graph) Microservice

Central contextual intelligence layer for EDUCORE learning ecosystem.

## Project Structure

```
rag-microservice/
├── BACKEND/          # Backend services (Node.js + Express + gRPC)
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── ...
├── FRONTEND/         # Frontend widget (React + Material-UI)
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── ...
├── DATABASE/         # Database schema and migrations
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.js
│   │   └── migrations/
│   └── proto/        # Protocol Buffer definitions
└── FULLSTACK_TEMPLATES/  # Development templates and documentation
```

## Overview

This microservice provides RAG (Retrieval-Augmented Generation) and Knowledge Graph capabilities for the EDUCORE platform, serving as the central contextual intelligence layer that integrates with 10 other microservices.

## Features

- **RAG Query Processing** - Contextual query answering with source citations
- **Vector Search** - Semantic similarity search using pgvector
- **Knowledge Graph** - Unified knowledge graph integrating all microservices
- **Personalized Assistance** - Role and profile-based responses
- **Access Control** - RBAC, ABAC, and fine-grained permissions
- **Multi-tenant Isolation** - Complete tenant data isolation

## Tech Stack

### Backend
- **Runtime:** Node.js 20 LTS + JavaScript (ES2022+)
- **Framework:** Express.js + @grpc/grpc-js
- **Database:** PostgreSQL 15+ with pgvector
- **ORM:** Prisma
- **Cache:** Redis 7+
- **Message Queue:** Apache Kafka
- **AI:** OpenAI API

### Frontend
- **Framework:** React 18
- **State Management:** Redux Toolkit + RTK Query
- **UI Library:** Material-UI (MUI)
- **Real-time:** Supabase Realtime
- **Build Tool:** Vite

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ with pgvector extension
- Redis 7+
- Kafka (optional for development)

### Backend Setup

```bash
cd BACKEND

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
npm run db:migrate
npm run db:generate
npm run db:seed

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd FRONTEND

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Database Setup

```bash
cd DATABASE

# Generate Prisma client
npx prisma generate --schema=prisma/schema.prisma

# Run migrations
npx prisma migrate dev --schema=prisma/schema.prisma

# Seed database
node prisma/seed.js
```

## Docker Deployment

### Building Images Locally

**Backend:**
```bash
cd BACKEND
docker build -t rag-microservice-backend:latest .
```

**Frontend:**
```bash
cd FRONTEND
docker build -t rag-microservice-frontend:latest .
```

### Running with Docker Compose

1. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

2. **Start all services:**
   ```bash
   docker compose up -d
   ```

3. **View logs:**
   ```bash
   docker compose logs -f
   ```

4. **Stop services:**
   ```bash
   docker compose down
   ```

5. **Stop and remove volumes:**
   ```bash
   docker compose down -v
   ```

The `docker-compose.yaml` file includes:
- **Backend service** - Node.js Express API (port 3000)
- **Frontend service** - React app served via Nginx (port 80)
- **PostgreSQL** - Database with pgvector extension (port 5432)
- **Redis** - Cache service (port 6379)
- **Kafka** - Message queue (port 9092)
- **Zookeeper** - Kafka dependency (port 2181)

All services are connected via a Docker network and can communicate using service names (e.g., `backend`, `postgres`, `redis`).

### Docker Image Optimization

Both Dockerfiles use multi-stage builds to optimize:
- **Image size** - Only production dependencies and built artifacts are included
- **Build time** - Layer caching for faster rebuilds
- **Security** - Non-root user execution

## CI/CD Pipeline

### GitHub Actions Workflows

The repository includes two GitHub Actions workflows:

#### CI Workflow (`.github/workflows/ci.yaml`)

Runs on pull requests to `main` branch:
- **Frontend Tests** - Linting and unit tests
- **Backend Tests** - Linting, unit tests, and integration tests with PostgreSQL and Redis

#### CD Workflow (`.github/workflows/cd.yaml`)

Runs on push to `main` branch:
- **Build Frontend** - Builds and pushes Docker image to Docker Hub
- **Build Backend** - Builds and pushes Docker image to Docker Hub
- **Deploy to EC2** - SSH into EC2 instance and deploy using Docker Compose

### Required GitHub Secrets

Configure the following secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

| Secret Name | Description | Example |
|------------|-------------|---------|
| `DOCKER_USERNAME` | Docker Hub username | `yourusername` |
| `DOCKER_PASSWORD` | Docker Hub password or access token | `yourpassword` |
| `EC2_HOST` | EC2 instance IP or hostname | `ec2-xx-xx-xx-xx.compute-1.amazonaws.com` |
| `EC2_USERNAME` | SSH username (optional, defaults to `ec2-user`) | `ec2-user` or `ubuntu` |
| `EC2_SSH_PRIVATE_KEY` | SSH private key for EC2 access | Contents of `~/.ssh/id_rsa` |
| `EC2_SSH_PORT` | SSH port (optional, defaults to 22) | `22` |
| `EC2_APP_DIR` | Application directory on EC2 (optional, defaults to `/opt/rag-microservice`) | `/opt/rag-microservice` |
| `VITE_API_BASE_URL` | Frontend API base URL (optional, defaults to `http://localhost:3000`) | `https://api.yourdomain.com` or `http://your-ec2-ip:3000` |

### Setting Up EC2 Instance

1. **Launch EC2 instance** with:
   - Ubuntu 22.04 LTS or Amazon Linux 2023
   - Security group allowing SSH (port 22) and HTTP/HTTPS (ports 80, 443)
   - At least 2GB RAM and 20GB storage

2. **Install Docker and Docker Compose:**
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   sudo apt-get install docker-compose-plugin -y
   
   # Amazon Linux
   sudo yum update -y
   sudo yum install docker -y
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo usermod -aG docker ec2-user
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Set up application directory:**
   ```bash
   sudo mkdir -p /opt/rag-microservice
   sudo chown $USER:$USER /opt/rag-microservice
   cd /opt/rag-microservice
   ```

4. **Create `docker-compose.yaml` and `.env` files** (or clone repository):
   ```bash
   git clone <your-repo-url> .
   cp env.example .env
   # Edit .env with production values
   ```

5. **Generate SSH key pair** (if not already done):
   ```bash
   ssh-keygen -t rsa -b 4096 -C "github-actions"
   # Add public key to EC2 instance's ~/.ssh/authorized_keys
   # Add private key to GitHub Secrets as EC2_SSH_PRIVATE_KEY
   ```

### Deployment Process

When you push to `main` branch:

1. **CI workflow** runs tests (on PRs)
2. **CD workflow** builds Docker images and pushes to Docker Hub
3. **Deploy job** SSH into EC2 and runs:
   ```bash
   docker compose pull
   docker compose up -d
   ```

The deployment automatically:
- Pulls latest images from Docker Hub
- Restarts containers with zero downtime
- Cleans up old Docker images
- Shows running container status

### Manual Deployment

To manually deploy to EC2:

```bash
# SSH into EC2
ssh ec2-user@your-ec2-host

# Navigate to app directory
cd /opt/rag-microservice

# Pull latest images
docker compose pull

# Restart services
docker compose up -d

# Check status
docker compose ps
docker compose logs -f
```

## Development

### Running Tests

**Backend:**
```bash
# Prepare test environment (requires Docker)
cp env.test.example .env.test
npm run test:setup
npm run test:migrate

# Execute test suites
npm test
npm run test:unit
npm run test:integration
npm run test:coverage

# Tear down test environment
npm run test:teardown
```

**Frontend:**
```bash
cd FRONTEND
npm test
npm run test:unit
npm run test:e2e
```

### Test Infrastructure

The backend test suites rely on PostgreSQL (pgvector), Redis, and Kafka. A ready-to-use Docker Compose file is provided:

```bash
docker-compose -f docker-compose.test.yml up -d   # start services
docker-compose -f docker-compose.test.yml down -v # stop and remove services
```

Ensure `.env.test` exists (copy from `env.test.example`) before running integration tests so that the test harness can connect to the infrastructure.

### Code Quality

```bash
# Backend
npm run lint
npm run format

# Frontend
cd FRONTEND
npm run lint
npm run format
```

## API Documentation

See `FULLSTACK_TEMPLATES/Stage_02_System_and_Architecture/ENDPOINTS_SPEC.md` for complete API documentation.

## License

MIT
