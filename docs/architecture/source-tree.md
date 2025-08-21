# Source Tree Architecture

## Overview

This document defines the complete source tree structure for the Disaster Management System (DMS) v2, incorporating both frontend and backend components with clear separation of concerns and scalable organization patterns.

## LLM Development Guidelines

- **Strict Hierarchy**: Follow the defined directory structure exactly
- **Single Responsibility**: Each directory and file serves one clear purpose  
- **Component Patterns**: All React components follow the established template pattern
- **Offline-First**: All frontend components must handle offline scenarios
- **Type Safety**: Shared types ensure consistency between frontend and backend

## Complete Project Structure

```
dms-v2-bmad/
├── docs/                           # Project documentation
│   ├── architecture/              # Technical architecture docs
│   ├── prd/                      # Product requirements
│   ├── qa/                       # Quality assurance docs
│   └── stories/                  # Development stories
├── packages/                     # Monorepo packages
│   ├── shared/                   # Shared utilities and types
│   │   ├── types/               # TypeScript definitions
│   │   │   ├── entities.ts      # Core domain entities
│   │   │   ├── api.ts          # API request/response types
│   │   │   ├── auth.ts         # Authentication types
│   │   │   └── index.ts        # Type exports
│   │   ├── utils/               # Shared utilities
│   │   │   ├── validation.ts    # Zod schemas
│   │   │   ├── constants.ts     # Application constants
│   │   │   ├── helpers.ts       # Utility functions
│   │   │   └── offline.ts       # Offline helpers
│   │   └── package.json
│   ├── backend/                 # Node.js backend service
│   │   ├── src/
│   │   │   ├── controllers/     # Route handlers
│   │   │   │   ├── assessment.controller.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── response.controller.ts
│   │   │   │   ├── sync.controller.ts
│   │   │   │   └── verification.controller.ts
│   │   │   ├── services/        # Business logic
│   │   │   │   ├── assessment.service.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── notification.service.ts
│   │   │   │   ├── sync.service.ts
│   │   │   │   └── verification.service.ts
│   │   │   ├── repositories/    # Data access layer
│   │   │   │   ├── assessment.repository.ts
│   │   │   │   ├── user.repository.ts
│   │   │   │   ├── response.repository.ts
│   │   │   │   └── base.repository.ts
│   │   │   ├── middleware/      # Express middleware
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── validation.middleware.ts
│   │   │   │   ├── error.middleware.ts
│   │   │   │   └── logging.middleware.ts
│   │   │   ├── routes/          # API route definitions
│   │   │   │   ├── v1/
│   │   │   │   │   ├── assessments.routes.ts
│   │   │   │   │   ├── auth.routes.ts
│   │   │   │   │   ├── responses.routes.ts
│   │   │   │   │   ├── sync.routes.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   ├── config/          # Configuration
│   │   │   │   ├── database.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── storage.ts
│   │   │   │   └── index.ts
│   │   │   ├── database/        # Database setup and migrations
│   │   │   │   ├── migrations/
│   │   │   │   ├── seeds/
│   │   │   │   └── connection.ts
│   │   │   ├── utils/           # Backend utilities
│   │   │   │   ├── logger.ts
│   │   │   │   ├── errors.ts
│   │   │   │   └── helpers.ts
│   │   │   ├── app.ts           # Express app setup
│   │   │   └── server.ts        # Server entry point
│   │   ├── tests/               # Backend tests
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── fixtures/
│   │   ├── package.json
│   │   └── Dockerfile
│   └── frontend/                # Next.js frontend application
│       ├── src/
│       │   ├── app/            # Next.js App Router
│       │   │   ├── (auth)/     # Auth layout group
│       │   │   │   ├── layout.tsx
│       │   │   │   ├── login/
│       │   │   │   │   └── page.tsx
│       │   │   │   └── register/
│       │   │   │       └── page.tsx
│       │   │   ├── (dashboard)/ # Dashboard layout group
│       │   │   │   ├── layout.tsx
│       │   │   │   ├── page.tsx
│       │   │   │   ├── assessments/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   ├── new/
│       │   │   │   │   │   └── page.tsx
│       │   │   │   │   └── [id]/
│       │   │   │   │       └── page.tsx
│       │   │   │   ├── responses/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   └── [id]/
│       │   │   │   │       └── page.tsx
│       │   │   │   ├── verification/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   └── queue/
│       │   │   │   │       └── page.tsx
│       │   │   │   └── monitoring/
│       │   │   │       ├── page.tsx
│       │   │   │       └── dashboard/
│       │   │   │           └── page.tsx
│       │   │   ├── api/        # API routes
│       │   │   │   └── v1/
│       │   │   │       ├── health/
│       │   │   │       └── sync/
│       │   │   ├── globals.css
│       │   │   ├── layout.tsx  # Root layout
│       │   │   └── page.tsx    # Root page
│       │   ├── components/     # React components
│       │   │   ├── ui/        # Shadcn/ui components (don't modify)
│       │   │   │   ├── button.tsx
│       │   │   │   ├── form.tsx
│       │   │   │   ├── input.tsx
│       │   │   │   ├── toast.tsx
│       │   │   │   └── ...
│       │   │   ├── features/  # Feature-specific components
│       │   │   │   ├── assessment/
│       │   │   │   │   ├── AssessmentForm.tsx
│       │   │   │   │   ├── AssessmentList.tsx
│       │   │   │   │   ├── AssessmentCard.tsx
│       │   │   │   │   ├── AssessmentFilters.tsx
│       │   │   │   │   └── AssessmentDetails.tsx
│       │   │   │   ├── response/
│       │   │   │   │   ├── ResponseForm.tsx
│       │   │   │   │   ├── ResponseList.tsx
│       │   │   │   │   ├── ResponseCard.tsx
│       │   │   │   │   └── ResponseTracking.tsx
│       │   │   │   ├── verification/
│       │   │   │   │   ├── VerificationQueue.tsx
│       │   │   │   │   ├── VerificationCard.tsx
│       │   │   │   │   └── VerificationHistory.tsx
│       │   │   │   └── sync/
│       │   │   │       ├── SyncIndicator.tsx
│       │   │   │       ├── SyncQueue.tsx
│       │   │   │       ├── ConflictResolver.tsx
│       │   │   │       └── OfflineQueue.tsx
│       │   │   ├── layouts/   # Layout components
│       │   │   │   ├── DashboardLayout.tsx
│       │   │   │   ├── AuthLayout.tsx
│       │   │   │   ├── MobileNav.tsx
│       │   │   │   ├── Sidebar.tsx
│       │   │   │   └── RoleSwitcher.tsx
│       │   │   └── shared/    # Shared components
│       │   │       ├── OfflineIndicator.tsx
│       │   │       ├── GPSCapture.tsx
│       │   │       ├── MediaUpload.tsx
│       │   │       ├── ErrorBoundary.tsx
│       │   │       ├── LoadingSpinner.tsx
│       │   │       └── DataTable.tsx
│       │   ├── lib/           # Utility libraries
│       │   │   ├── offline/   # Offline functionality
│       │   │   │   ├── db.ts     # Dexie.js setup
│       │   │   │   ├── sync.ts   # Sync engine
│       │   │   │   ├── queue.ts  # Queue management
│       │   │   │   └── storage.ts # Local storage utilities
│       │   │   ├── auth/      # Authentication
│       │   │   │   ├── client.ts # Auth client setup
│       │   │   │   ├── providers.tsx # Auth providers
│       │   │   │   └── utils.ts  # Auth utilities
│       │   │   ├── api/       # API client
│       │   │   │   ├── client.ts # HTTP client
│       │   │   │   ├── endpoints.ts # API endpoints
│       │   │   │   └── types.ts  # API types
│       │   │   └── utils/     # Utilities
│       │   │       ├── cn.ts     # Class name utility
│       │   │       ├── format.ts # Formatting helpers
│       │   │       ├── validation.ts # Form validation
│       │   │       └── offline-id.ts # Offline ID generation
│       │   ├── hooks/         # Custom React hooks
│       │   │   ├── useOffline.ts
│       │   │   ├── useSync.ts
│       │   │   ├── useAuth.ts
│       │   │   ├── useRole.ts
│       │   │   ├── useGPS.ts
│       │   │   ├── useLocalStorage.ts
│       │   │   └── useDebounce.ts
│       │   ├── stores/        # Zustand stores
│       │   │   ├── auth.store.ts
│       │   │   ├── offline.store.ts
│       │   │   ├── sync.store.ts
│       │   │   ├── ui.store.ts
│       │   │   └── assessment.store.ts
│       │   └── styles/        # Global styles
│       │       ├── globals.css
│       │       └── components.css
│       ├── public/            # Static assets
│       │   ├── icons/
│       │   ├── images/
│       │   └── manifest.json
│       ├── tests/            # Frontend tests
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── stores/
│       │   ├── utils/
│       │   └── setup.ts
│       ├── next.config.js
│       ├── tailwind.config.js
│       ├── package.json
│       └── tsconfig.json
├── infrastructure/            # Deployment and infrastructure
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── frontend.Dockerfile
│   │   └── backend.Dockerfile
│   ├── k8s/                  # Kubernetes manifests
│   └── terraform/            # Infrastructure as code
├── scripts/                  # Build and deployment scripts
│   ├── build.sh
│   ├── deploy.sh
│   └── test.sh
├── .github/                  # GitHub workflows
│   └── workflows/
│       ├── ci.yml
│       ├── cd.yml
│       └── pr-checks.yml
├── .bmad-core/              # BMAD framework files
├── package.json             # Root package.json (workspace)
├── pnpm-workspace.yaml      # Workspace configuration
├── turbo.json              # Turborepo configuration
├── .gitignore
├── .env.example
└── README.md
```

## Architecture Principles

### Frontend Organization

1. **App Router Structure**: Uses Next.js 13+ App Router with route groups for logical organization
2. **Component Hierarchy**: Three-tier component organization (ui/features/shared)
3. **Feature-Based Grouping**: Related components grouped by domain feature
4. **Layout Composition**: Reusable layouts for different application sections
5. **Offline-First Design**: All components handle offline scenarios gracefully

### Backend Organization

1. **Layered Architecture**: Controllers → Services → Repositories → Database
2. **Separation of Concerns**: Clear boundaries between business logic and data access
3. **Middleware Pipeline**: Reusable middleware for cross-cutting concerns
4. **API Versioning**: Versioned routes for backward compatibility
5. **Configuration Management**: Centralized configuration with environment overrides

### Shared Package Strategy

1. **Type Consistency**: Shared TypeScript definitions ensure type safety across packages
2. **Utility Reuse**: Common utilities available to all packages
3. **Validation Schemas**: Shared Zod schemas for consistent data validation
4. **Constants Management**: Centralized application constants

## Component Template Compliance

All frontend components must follow the established pattern from `6-component-architecture.md`:

- **Explicit Props Interface**: Every component defines a clear props interface
- **Form Schema Definition**: Forms use Zod schemas for validation
- **Offline State Handling**: Components gracefully handle offline scenarios
- **Auto-save Functionality**: Forms automatically save drafts
- **Error Boundaries**: Comprehensive error handling with user feedback
- **TypeScript Strict Mode**: Full type safety throughout

## Development Guidelines

### File Naming Conventions

- **Components**: PascalCase (e.g., `AssessmentForm.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useOffline.ts`)
- **Utilities**: camelCase (e.g., `validation.ts`)
- **Stores**: camelCase with `.store.ts` suffix (e.g., `auth.store.ts`)
- **Types**: camelCase (e.g., `entities.ts`)

### Import Organization

1. React/Next.js imports
2. Third-party library imports
3. Internal component imports
4. Utility imports
5. Type imports
6. Relative imports

### Testing Strategy

- **Unit Tests**: Individual components and utilities
- **Integration Tests**: Component interactions and API endpoints
- **E2E Tests**: Critical user workflows
- **Offline Tests**: Offline functionality validation

## Implementation Priority

When implementing this structure, follow the development sequence:

1. **Shared Package**: Establish types and utilities first
2. **Backend Core**: Basic API structure and authentication
3. **Frontend Foundation**: Layout system and routing
4. **Feature Components**: Implement assessment features first
5. **Offline Capabilities**: Add sync and offline functionality
6. **Testing & Polish**: Comprehensive testing and UX improvements

## Technology Integration

This source tree structure supports the complete tech stack:

- **Frontend**: Next.js 13+, React 18, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Node.js, Express, TypeScript, PostgreSQL, Prisma
- **Offline**: Dexie.js for local storage, service workers for caching
- **Authentication**: NextAuth.js with role-based access control
- **State Management**: Zustand for client state
- **Build Tools**: Turborepo for monorepo management
- **Testing**: Jest, React Testing Library, Playwright
- **Deployment**: Docker containers with Kubernetes orchestration

This structure provides a solid foundation for building the disaster management system while maintaining scalability, maintainability, and developer productivity.