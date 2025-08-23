# DMS v2 Development Setup

This document provides setup instructions for the Disaster Management System v2 backend infrastructure.

## Prerequisites

- Node.js 20.x LTS
- PostgreSQL 16.x
- Redis 7.2.x
- pnpm (workspace manager)

## Database Setup

1. **Install and start PostgreSQL**:
   ```bash
   # On macOS with Homebrew
   brew install postgresql@16
   brew services start postgresql@16

   # On Ubuntu/Debian
   sudo apt-get install postgresql-16
   sudo systemctl start postgresql
   ```

2. **Create database**:
   ```bash
   createdb dms_v2_dev
   ```

3. **Set up environment variables**:
   ```bash
   cd packages/frontend
   cp .env.example .env.local
   # Edit .env.local with your database credentials
   ```

## Redis Setup

1. **Install and start Redis**:
   ```bash
   # On macOS with Homebrew
   brew install redis
   brew services start redis

   # On Ubuntu/Debian
   sudo apt-get install redis-server
   sudo systemctl start redis-server
   ```

## Application Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Generate Prisma client and run migrations**:
   ```bash
   cd packages/frontend
   npx prisma migrate dev --name init
   npx prisma generate
   ```

3. **Seed the database** (optional):
   ```bash
   npx prisma db seed
   ```

4. **Run the development server**:
   ```bash
   pnpm dev
   ```

## Testing Setup

1. **Run unit tests**:
   ```bash
   # Frontend tests
   cd packages/frontend
   npm test

   # Shared package tests
   cd packages/shared
   npm test
   ```

2. **Run integration tests**:
   ```bash
   cd packages/frontend
   npm run test:e2e
   ```

## Queue Processing

The application uses BullMQ for background job processing. To process jobs:

1. **Start queue workers** (in production, use PM2 or similar):
   ```bash
   # This would be a separate worker process
   node -e "
   const { Worker } = require('bullmq');
   const worker = new Worker('incident-processing', async (job) => {
     console.log('Processing incident:', job.data);
     // Add your incident processing logic here
   });
   "
   ```

## Key Features Implemented

✅ **Database Integration**: Prisma ORM with PostgreSQL
✅ **Background Jobs**: BullMQ with Redis for incident and notification processing  
✅ **Notification Services**: Email and push notification infrastructure
✅ **Authentication**: API endpoint authentication middleware
✅ **Testing Framework**: Jest configuration for unit tests
✅ **React Hooks**: Fixed dependency warnings in forms

## API Endpoints

### Incidents

- `POST /api/v1/incidents/from-assessment` - Create incident from preliminary assessment
  - Requires authentication (ASSESSOR role)
  - Saves to database with Prisma
  - Queues background job for processing
  - Sends notifications to coordinators

### Notifications

- `POST /api/v1/notifications/send` - Send notifications
  - Saves to database for audit trail
  - Queues background jobs for delivery
  - Supports email, push, and in-app notifications
  - Priority-based processing (HIGH priority = immediate)

## Development Guidelines

1. **Database Changes**: Always create Prisma migrations for schema changes
2. **Background Jobs**: Use appropriate priority levels for queue jobs
3. **Error Handling**: All API endpoints include comprehensive error handling
4. **Testing**: Write tests for new API endpoints and services
5. **Authentication**: All protected endpoints use the `validateApiAccess` middleware

## Troubleshooting

### Common Issues

1. **Database connection errors**:
   - Check PostgreSQL is running
   - Verify DATABASE_URL in .env.local
   - Run `npx prisma db push` to sync schema

2. **Queue processing issues**:
   - Check Redis is running
   - Verify REDIS_* environment variables
   - Check queue worker processes are running

3. **Authentication errors**:
   - Verify authentication headers in API requests
   - Check user roles and permissions
   - Review API auth middleware logs

## Production Deployment

See `docs/architecture/12-deployment-architecture.md` for production deployment guidelines.