# Workflow Automation Platform

A comprehensive workflow automation platform built with React, Node.js, Fastify, and ActivePieces CE.

## Architecture

This platform follows the architecture described in the HLD and LLD documents:

- **Frontend**: React with TypeScript, Vite, React Router, and Zustand
- **Backend**: Node.js with Fastify, TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **Cache**: Redis
- **Queue**: AWS SQS
- **Workflow Engine**: ActivePieces Community Edition
- **Deployment**: Docker, Kubernetes, Terraform for AWS

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- React Router DOM
- Zustand (state management)
- Axios (HTTP client)

### Backend
- Node.js
- Fastify
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- AWS SDK (SQS, Secrets Manager)

### Infrastructure
- Docker & Docker Compose
- Kubernetes
- Terraform
- AWS (RDS, SQS, Secrets Manager, ALB)

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (for local development)
- Redis (for local development)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd workflow_automation
   ```

2. **Start infrastructure services**
   ```bash
   docker-compose up -d postgres redis activepieces
   ```

3. **Setup Backend**
   ```bash
   cd backend
   npm install
   # Copy and edit environment variables
   npm run prisma:generate
   npm run prisma:migrate
   npm run dev
   ```

4. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - ActivePieces: http://localhost:8080

### Using Docker Compose

For a complete local environment:

```bash
docker-compose up -d
```

## Environment Variables

Create a `.env` file in the backend directory with:

```
DATABASE_URL=postgresql://username:password@localhost:5432/workflow_automation
JWT_SECRET=your-jwt-secret-key
REDIS_URL=redis://localhost:6379
ACTIVEPIECES_API_URL=http://localhost:8080
ACTIVEPIECES_API_KEY=your-activepieces-api-key
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/workflow-queue
SQS_DLQ_URL=https://sqs.us-east-1.amazonaws.com/123456789012/workflow-dlq
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Workflows
- `GET /api/workflows` - List user workflows
- `POST /api/workflows` - Create workflow
- `GET /api/workflows/:id` - Get workflow details
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow

### Triggers
- `POST /api/trigger/webhook/:workflowId` - Webhook trigger
- `POST /api/trigger/api` - API trigger (authenticated)
- `GET /api/trigger/status/:triggerId` - Get trigger status

### Admin (Admin role required)
- `GET /api/admin/users` - List all users
- `GET /api/admin/workflows` - List all workflows
- `GET /api/admin/executions` - List all executions
- `GET /api/admin/stats` - System statistics

## Deployment

### Kubernetes

1. **Apply Kubernetes manifests**
   ```bash
   kubectl apply -f k8s/
   ```

2. **Update secrets**
   ```bash
   # Edit k8s/secret.yaml with your base64 encoded secrets
   kubectl apply -f k8s/secret.yaml
   ```

### AWS with Terraform

1. **Initialize Terraform**
   ```bash
   cd terraform
   terraform init
   ```

2. **Plan deployment**
   ```bash
   terraform plan
   ```

3. **Apply infrastructure**
   ```bash
   terraform apply
   ```

4. **Set required variables**
   ```bash
   export TF_VAR_db_password="your-db-password"
   export TF_VAR_jwt_secret="your-jwt-secret"
   export TF_VAR_activepieces_api_key="your-api-key"
   ```

## Database Schema

The application uses Prisma ORM with the following main models:

- **User**: User accounts and authentication
- **Workflow**: Workflow definitions and metadata
- **WorkflowTrigger**: Trigger events and data
- **WorkflowExecution**: Execution records and status
- **ExecutionCheckpoint**: Execution step tracking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License


MIT License - see LICENSE file for details 