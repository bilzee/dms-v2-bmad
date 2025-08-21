# Disaster Management PWA - Complete Fullstack Architecture Document

## Document Metadata

* **Template:** Fullstack Architecture Template v2.0
* **Version:** 1.0
* **Date:** January 2025
* **Author:** Winston (BMad-Method Architect)
* **Status:** Complete
* **Optimized For:** LLM-Driven Development with Claude Code

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Tech Stack](#2-tech-stack)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Data Models](#4-data-models)
5. [API Specification](#5-api-specification)
6. [Component Architecture](#6-component-architecture)
7. [Sequence Diagrams](#7-sequence-diagrams)
8. [Database Schema](#8-database-schema)
9. [Frontend Architecture Details](#9-frontend-architecture-details)
10. [Backend Architecture Details](#10-backend-architecture-details)
11. [Security Architecture](#11-security-architecture)
12. [Deployment Architecture](#12-deployment-architecture)
13. [Development Guidelines for LLM-Driven Development](#13-development-guidelines-for-llm-driven-development)
14. [Testing Strategy](#14-testing-strategy)
15. [Next Steps \& Implementation Order](#15-next-steps--implementation-order)

---

## 1\. Introduction

This document defines the comprehensive fullstack architecture for the Disaster Management Progressive Web App (DM-PWA) serving humanitarian operations in Borno State, Nigeria. The architecture prioritizes **offline-first operation**, **data integrity**, and **field reliability** over aesthetic sophistication, ensuring zero data loss in challenging connectivity environments.

### System Overview

The DM-PWA is a humanitarian coordination platform enabling rapid assessment and response during disaster scenarios. The system supports four primary user roles (Assessors, Responders, Coordinators, Donors) through a unified PWA interface with sophisticated offline capabilities and intelligent synchronization.

### Architectural Philosophy

**User Experience Drives Architecture** - Every technical decision stems from field worker needs:

* **Offline-First, Not Offline-Sometimes**: 100% core functionality without connectivity
* **Progressive Complexity**: Simple to start, scales with organizational maturity
* **Boring Technology Where Possible**: Proven, stable choices for critical paths
* **Exciting Where Necessary**: Modern PWA capabilities for offline excellence
* **Zero Data Loss Tolerance**: Multiple redundancy layers for data preservation

### Key Design Decisions

1. **Next.js 14 with App Router**: Server components for initial load performance, client components for offline capability
2. **IndexedDB + Dexie.js**: Robust offline storage with encryption and sync queue management
3. **PostgreSQL + Prisma**: Type-safe database access with migration management
4. **Zustand**: Lightweight state management optimized for offline scenarios
5. **Service Worker Architecture**: Background sync, cache management, and offline resilience

### Architecture Constraints

* **Device Reality**: Mid-range Android devices with limited CPU/RAM
* **Network Reality**: 2G/3G networks with frequent disconnections
* **User Reality**: High-stress scenarios requiring foolproof interfaces
* **Data Criticality**: Human lives depend on data integrity

---

## 2\. Tech Stack

The technology stack balances stability with modern capabilities, optimizing for offline-first PWA requirements while maintaining developer productivity.

### Frontend Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Framework | Next.js | 14.2.x | PWA foundation | App Router for performance, built-in PWA support |
| UI Library | React | 18.3.x | Component architecture | Industry standard, extensive ecosystem |
| State Management | Zustand | 4.5.x | Global state \\\& offline queue | Lightweight, persistence-friendly |
| Component Library | Shadcn/ui | Latest | UI components | Customizable, accessible, lightweight |
| Styling | Tailwind CSS | 3.4.x | Utility-first CSS | Rapid development, consistent design |
| PWA | next-pwa | 5.6.x | Service worker management | Workbox integration, offline caching |
| Offline Storage | Dexie.js | 4.0.x | IndexedDB wrapper | Simplified offline data management |
| Forms | React Hook Form | 7.51.x | Form handling | Performance, validation, minimal re-renders |
| Validation | Zod | 3.23.x | Schema validation | Type-safe validation, Prisma alignment |
| Maps | Leaflet | 1.9.x | Offline mapping | Lightweight, offline tile support |

### Backend Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Runtime | Node.js | 20.x LTS | Server runtime | Stable LTS, broad support |
| API Framework | Next.js API Routes | 14.2.x | API endpoints | Unified codebase, serverless-ready |
| Database | PostgreSQL | 16.x | Primary datastore | ACID compliance, JSON support |
| ORM | Prisma | 5.14.x | Database access | Type safety, migrations |
| Authentication | NextAuth.js | 4.24.x | Auth management | Flexible providers, session management |
| File Storage | AWS S3 / Local | Latest | Media storage | Scalable media handling |
| Queue | BullMQ | 5.7.x | Background jobs | Reliable job processing |
| Cache | Redis | 7.2.x | Session \\\& cache | Performance optimization |
| Monitoring | Sentry | 8.7.x | Error tracking | Production debugging |

### Infrastructure \& DevOps

| Category | Technology | Purpose |
|----------|------------|---------|
| Deployment | Vercel / AWS | Serverless deployment, global CDN |
| Container | Docker | Local development, consistent environments |
| CI/CD | GitHub Actions | Automated testing and deployment |
| Monitoring | Datadog / CloudWatch | Performance and uptime monitoring |
| Backup | AWS Backup | Automated database backups |

---

## 3\. High-Level Architecture

### System Architecture Diagram

```mermaid
graph TB
    subgraph "Field Devices"
        PWA\\\[PWA Client]
        SW\\\[Service Worker]
        IDB\\\[IndexedDB]
        PWA --> SW
        SW --> IDB
    end
    
    subgraph "Edge Layer"
        CDN\\\[CDN/Static Assets]
        API\\\[API Gateway]
    end
    
    subgraph "Application Layer"
        NEXT\\\[Next.js Server]
        AUTH\\\[Auth Service]
        SYNC\\\[Sync Engine]
        QUEUE\\\[Job Queue]
    end
    
    subgraph "Data Layer"
        PG\\\[(PostgreSQL)]
        REDIS\\\[(Redis Cache)]
        S3\\\[S3 Storage]
    end
    
    PWA -.->|Offline| IDB
    PWA -->|Online| CDN
    PWA -->|API Calls| API
    API --> NEXT
    NEXT --> AUTH
    NEXT --> SYNC
    SYNC --> QUEUE
    NEXT --> PG
    NEXT --> REDIS
    SYNC --> S3
```

### Architectural Layers

#### 1\. Presentation Layer (PWA Client)

* **Responsibility**: User interface, offline operation, local data management
* **Technologies**: Next.js, React, Zustand, IndexedDB
* **Key Features**: Offline forms, GPS integration, media capture, sync queue

#### 2\. Service Worker Layer

* **Responsibility**: Network interception, cache management, background sync
* **Technologies**: Workbox, next-pwa
* **Key Features**: Offline fallback, sync retry, cache strategies

#### 3\. Application Layer

* **Responsibility**: Business logic, authentication, API endpoints
* **Technologies**: Next.js API Routes, NextAuth.js, Prisma
* **Key Features**: Role-based access, verification workflows, data validation

#### 4\. Synchronization Layer

* **Responsibility**: Conflict resolution, queue processing, data reconciliation
* **Technologies**: Custom sync engine, BullMQ, PostgreSQL
* **Key Features**: Priority sync, conflict detection, automatic retry

#### 5\. Data Layer

* **Responsibility**: Data persistence, caching, file storage
* **Technologies**: PostgreSQL, Redis, S3
* **Key Features**: ACID compliance, audit trails, media management

---

## 4\. Data Models

### LLM Development Notes

All models use TypeScript interfaces for type safety. These interfaces are shared between frontend and backend through a `shared/types` directory. Prisma generates matching types from the schema, ensuring consistency.

### Core Entity Interfaces

```typescript
// shared/types/entities.ts

export interface Incident {
  id: string; // UUID
  name: string;
  type: IncidentType;
  subType?: IncidentSubType;
  source?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  date: Date;
  preliminaryAssessmentIds: string\\\[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AffectedEntity {
  id: string; // UUID
  type: 'CAMP' | 'COMMUNITY';
  name: string;
  lga: string;
  ward: string;
  longitude: number;
  latitude: number;
  campDetails?: CampDetails;
  communityDetails?: CommunityDetails;
  createdAt: Date;
  updatedAt: Date;
}

export interface RapidAssessment {
  id: string; // UUID
  type: AssessmentType;
  date: Date;
  affectedEntityId: string;
  assessorName: string;
  assessorId: string;
  verificationStatus: VerificationStatus;
  syncStatus: SyncStatus;
  offlineId?: string; // For offline-created records
  data: AssessmentData; // Polymorphic based on type
  mediaAttachments: MediaAttachment\\\[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RapidResponse {
  id: string; // UUID
  responseType: ResponseType;
  status: ResponseStatus;
  plannedDate: Date;
  deliveredDate?: Date;
  affectedEntityId: string;
  assessmentId: string;
  responderId: string;
  responderName: string;
  donorId?: string;
  donorName?: string;
  verificationStatus: VerificationStatus;
  syncStatus: SyncStatus;
  offlineId?: string;
  data: ResponseData; // Polymorphic based on type
  otherItemsDelivered: { item: string; quantity: number; unit: string }[]; // Generic items for all response types
  deliveryEvidence: MediaAttachment\\\[];
  createdAt: Date;
  updatedAt: Date;
}

// Enums for type safety
export enum IncidentType {
  FLOOD = 'FLOOD',
  FIRE = 'FIRE',
  LANDSLIDE = 'LANDSLIDE',
  CYCLONE = 'CYCLONE',
  CONFLICT = 'CONFLICT',
  EPIDEMIC = 'EPIDEMIC',
  OTHER = 'OTHER'
}

export enum IncidentSeverity {
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  CATASTROPHIC = 'CATASTROPHIC'
}

export enum IncidentStatus {
  ACTIVE = 'ACTIVE',
  CONTAINED = 'CONTAINED',
  RESOLVED = 'RESOLVED'
}

export enum AssessmentType {
  HEALTH = 'HEALTH',
  WASH = 'WASH',
  SHELTER = 'SHELTER',
  FOOD = 'FOOD',
  SECURITY = 'SECURITY',
  POPULATION = 'POPULATION'
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  AUTO\\\_VERIFIED = 'AUTO\\\_VERIFIED',
  REJECTED = 'REJECTED'
}

export enum SyncStatus {
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  CONFLICT = 'CONFLICT',
  FAILED = 'FAILED'
}

export enum ResponseStatus {
  PLANNED = 'PLANNED',
  IN\\\_PROGRESS = 'IN\\\_PROGRESS',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

// Polymorphic assessment data types
export type AssessmentData = 
  | HealthAssessmentData
  | WashAssessmentData
  | ShelterAssessmentData
  | FoodAssessmentData
  | SecurityAssessmentData
  | PopulationAssessmentData;

export interface HealthAssessmentData {
  hasFunctionalClinic: boolean;
  numberHealthFacilities: number;
  healthFacilityType: string;
  qualifiedHealthWorkers: number;
  hasMedicineSupply: boolean;
  hasMedicalSupplies: boolean;
  hasMaternalChildServices: boolean;
  commonHealthIssues: string[];
  additionalDetails?: string;
}

export interface WashAssessmentData {
  isWaterSufficient: boolean;
  waterSource: string[];
  waterQuality: 'Safe' | 'Contaminated' | 'Unknown';
  hasToilets: boolean;
  numberToilets: number;
  toiletType: string;
  hasSolidWasteDisposal: boolean;
  hasHandwashingFacilities: boolean;
  additionalDetails?: string;
}

export interface ShelterAssessmentData {
  areSheltersSufficient: boolean;
  shelterTypes: string[];
  numberShelters: number;
  shelterCondition: 'Good' | 'Fair' | 'Poor' | 'Critical';
  needsRepair: boolean;
  needsTarpaulin: boolean;
  needsBedding: boolean;
  additionalDetails?: string;
}

export interface FoodAssessmentData {
  foodSource: string[];
  availableFoodDurationDays: number;
  additionalFoodRequiredPersons: number;
  additionalFoodRequiredHouseholds: number;
  malnutritionCases: number;
  feedingProgramExists: boolean;
  additionalDetails?: string;
}

export interface SecurityAssessmentData {
  isAreaSecure: boolean;
  securityThreats: string[];
  hasSecurityPresence: boolean;
  securityProvider: string;
  incidentsReported: number;
  restrictedMovement: boolean;
  additionalDetails?: string;
}

export interface PopulationAssessmentData {
  totalHouseholds: number;
  totalPopulation: number;
  populationMale: number;
  populationFemale: number;
  populationUnder5: number;
  pregnantWomen: number;
  lactatingMothers: number;
  personWithDisability: number;
  elderlyPersons: number;
  separatedChildren: number;
  numberLivesLost: number;
  numberInjured: number;
  additionalDetails?: string;
}

// Response data types
export type ResponseData =
  | HealthResponseData
  | WashResponseData
  | ShelterResponseData
  | FoodResponseData
  | SecurityResponseData
  | PopulationResponseData;

export interface HealthResponseData {
  medicinesDelivered: { name: string; quantity: number; unit: string }[];
  medicalSuppliesDelivered: { name: string; quantity: number }[];
  healthWorkersDeployed: number;
  patientsT treated: number;
  additionalDetails?: string;
}

export interface WashResponseData {
  waterDeliveredLiters: number;
  waterContainersDistributed: number;
  toiletsConstructed: number;
  hygieKitsDistributed: number;
  additionalDetails?: string;
}

export interface ShelterResponseData {
  sheltersProvided: number;
  tarpaulinsDistributed: number;
  beddingKitsDistributed: number;
  repairsCompleted: number;
  additionalDetails?: string;
}

export interface FoodResponseData {
  foodItemsDelivered: { item: string; quantity: number; unit: string }[];
  householdsServed: number;
  personsServed: number;
  nutritionSupplementsProvided: number;
  additionalDetails?: string;
}

export interface SecurityResponseData {
  securityPersonnelDeployed: number;
  checkpointsEstablished: number;
  patrolsCompleted: number;
  incidentsResolved: number;
  additionalDetails?: string;
}

export interface PopulationResponseData {
  evacuationsCompleted: number;
  familiesReunited: number;
  documentationProvided: number;
  referralsMade: number;
  additionalDetails?: string;
}

// Similar interfaces for other assessment types...

// User and Role Models
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  organization?: string;
  roles: UserRole\\\[];
  activeRole: UserRole;
  permissions: Permission\\\[];
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  id: string;
  name: 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN';
  permissions: Permission\\\[];
  isActive: boolean;
}

// Offline Queue Management
export interface OfflineQueueItem {
  id: string; // Local UUID
  type: 'ASSESSMENT' | 'RESPONSE' | 'MEDIA';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityId?: string; // Server ID if updating
  data: any; // The actual data to sync
  retryCount: number;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  createdAt: Date;
  lastAttempt?: Date;
  error?: string;
}

// Supporting Types
export interface MediaAttachment {
  id: string;
  url?: string; // S3 URL when synced
  localPath?: string; // Local device path
  thumbnailUrl?: string;
  mimeType: string;
  size: number;
  metadata?: {
    gpsCoordinates?: GPSCoordinates;
    timestamp: Date;
  };
}

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
  captureMethod: 'GPS' | 'MANUAL' | 'MAP\\\_SELECT';
}

export interface CampDetails {
  campName: string;
  campStatus: 'OPEN' | 'CLOSED';
  campCoordinatorName: string;
  campCoordinatorPhone: string;
  superviserName?: string;
  superviserOrganization?: string;
  estimatedPopulation?: number;
}

export interface CommunityDetails {
  communityName: string;
  contactPersonName: string;
  contactPersonPhone: string;
  contactPersonRole: string;
  estimatedHouseholds?: number;
}
```

### LLM Implementation Guidance

**Type Generation Strategy:**

1. Prisma schema is source of truth for database structure
2. Use `prisma generate` to create database types
3. Share domain types through `shared/types` directory
4. Use Zod schemas for runtime validation matching TypeScript types

---

## 5\. API Specification

### LLM Development Notes

API uses RESTful patterns with consistent naming conventions. All endpoints return standardized response formats. Error handling follows RFC 7807 (Problem Details).

### API Design Principles

1. **Consistent URL Patterns**: `/api/v1/{resource}/{id}/{action}`
2. **Standardized Response Format**: All responses include `data`, `meta`, and optional `error`
3. **Offline-Aware Headers**: Include sync metadata in headers
4. **Batch Operations**: Support bulk operations for offline sync

### Core API Endpoints

```typescript
// API Response Types (shared/types/api.ts)

export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    version: string;
    syncToken?: string;
  };
  error?: ApiError;
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T\\\[]> {
  meta: ApiResponse<T>\\\['meta'] \\\& {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}
```

### RESTful Endpoints

```yaml
# OpenAPI 3.0 Specification (Simplified for LLM clarity)

/api/v1/auth:
  /login:
    post:
      body: { email, password }
      returns: { user, token, permissions }
  /logout:
    post:
      returns: { success }
  /refresh:
    post:
      body: { refreshToken }
      returns: { token, refreshToken }

/api/v1/assessments:
  get:
    query: { entityId?, type?, status?, page?, limit? }
    returns: PaginatedResponse<RapidAssessment>
  post:
    body: RapidAssessment
    returns: ApiResponse<RapidAssessment>
  /{id}:
    get:
      returns: ApiResponse<RapidAssessment>
    patch:
      body: Partial<RapidAssessment>
      returns: ApiResponse<RapidAssessment>
  /batch:
    post:
      body: RapidAssessment\\\[]
      returns: ApiResponse<BatchResult>
  /sync:
    post:
      body: { assessments: RapidAssessment\\\[], syncToken: string }
      returns: ApiResponse<SyncResult>

/api/v1/responses:
  get:
    query: { entityId?, type?, status?, page?, limit? }
    returns: PaginatedResponse<RapidResponse>
  post:
    body: RapidResponse
    returns: ApiResponse<RapidResponse>
  /{id}:
    get:
      returns: ApiResponse<RapidResponse>
    patch:
      body: Partial<RapidResponse>
      returns: ApiResponse<RapidResponse>
  /batch:
    post:
      body: RapidResponse\\\[]
      returns: ApiResponse<BatchResult>
  
/api/v1/entities:
  get:
    query: { type?, lga?, ward?, bbox? }
    returns: PaginatedResponse<AffectedEntity>
  /{id}/assessments:
    get:
      returns: PaginatedResponse<RapidAssessment>
  /{id}/responses:
    get:
      returns: PaginatedResponse<RapidResponse>

/api/v1/verification:
  /queue:
    get:
      query: { type?, priority?, status? }
      returns: PaginatedResponse<VerificationItem>
  /verify:
    post:
      body: { itemId, status, notes? }
      returns: ApiResponse<VerificationResult>
  /auto-verify/rules:
    get:
      returns: ApiResponse<AutoVerificationRule\\\[]>
    post:
      body: AutoVerificationRule
      returns: ApiResponse<AutoVerificationRule>

/api/v1/sync:
  /status:
    get:
      returns: ApiResponse<SyncStatus>
  /pull:
    post:
      body: { lastSyncToken, entities: string\\\[] }
      returns: ApiResponse<SyncData>
  /push:
    post:
      body: { changes: ChangeSet\\\[], syncToken: string }
      returns: ApiResponse<SyncResult>
```

### Next.js API Route Implementation Pattern

```typescript
// app/api/v1/assessments/route.ts
// LLM Note: All API routes follow this exact pattern

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { ApiResponse } from '@/shared/types/api';
import { RapidAssessment } from '@/shared/types/entities';

// Define request schema using Zod
const CreateAssessmentSchema = z.object({
  type: z.enum(\\\['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION']),
  affectedEntityId: z.string().uuid(),
  data: z.object({}).passthrough(), // Validated based on type
  // ... other fields
});

export async function GET(request: NextRequest) {
  return withAuth(request, async (user) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      
      const assessments = await prisma.rapidAssessment.findMany({
        skip: (page - 1) \\\* limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
      
      return NextResponse.json<ApiResponse<RapidAssessment\\\[]>>({
        data: assessments,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      });
    } catch (error) {
      return NextResponse.json<ApiResponse<null>>({
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
        error: {
          type: 'internal\\\_error',
          title: 'Internal Server Error',
          status: 500,
          detail: error instanceof Error ? error.message : 'Unknown error',
        },
      }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    try {
      const body = await request.json();
      const validated = CreateAssessmentSchema.parse(body);
      
      // LLM Note: Always validate permissions before database operations
      if (!user.permissions.includes('CREATE\\\_ASSESSMENT')) {
        return NextResponse.json({
          error: {
            type: 'forbidden',
            title: 'Insufficient Permissions',
            status: 403,
          },
        }, { status: 403 });
      }
      
      const assessment = await prisma.rapidAssessment.create({
        data: {
          ...validated,
          assessorId: user.id,
          assessorName: user.name,
        },
      });
      
      return NextResponse.json<ApiResponse<RapidAssessment>>({
        data: assessment,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          error: {
            type: 'validation\\\_error',
            title: 'Validation Failed',
            status: 400,
            detail: error.errors.map(e => e.message).join(', '),
          },
        }, { status: 400 });
      }
      throw error;
    }
  });
}
```

---

## 6\. Component Architecture

### LLM Development Notes

Components follow a strict hierarchy with clear separation of concerns. Each component has a single responsibility and explicit props interface.

### Frontend Component Organization

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth layout group
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/         # Dashboard layout group
│   │   ├── layout.tsx       # Dashboard layout with role-based nav
│   │   ├── assessments/
│   │   ├── responses/
│   │   ├── verification/
│   │   └── monitoring/
│   └── api/                 # API routes
│       └── v1/
├── components/              # React components
│   ├── ui/                 # Shadcn/ui components (don't modify)
│   ├── features/           # Feature-specific components
│   │   ├── assessment/
│   │   │   ├── AssessmentForm.tsx
│   │   │   ├── AssessmentList.tsx
│   │   │   └── AssessmentCard.tsx
│   │   ├── response/
│   │   ├── verification/
│   │   └── sync/
│   │       ├── SyncIndicator.tsx
│   │       ├── SyncQueue.tsx
│   │       └── ConflictResolver.tsx
│   ├── layouts/           # Layout components
│   │   ├── DashboardLayout.tsx
│   │   ├── MobileNav.tsx
│   │   └── RoleSwither.tsx
│   └── shared/            # Shared components
│       ├── OfflineIndicator.tsx
│       ├── GPSCapture.tsx
│       ├── MediaUpload.tsx
│       └── ErrorBoundary.tsx
├── lib/                    # Utility libraries
│   ├── offline/           # Offline functionality
│   │   ├── db.ts         # Dexie.js setup
│   │   ├── sync.ts       # Sync engine
│   │   └── queue.ts      # Queue management
│   ├── auth/             # Authentication
│   ├── api/              # API client
│   └── utils/            # Utilities
├── hooks/                 # Custom React hooks
│   ├── useOffline.ts
│   ├── useSync.ts
│   ├── useRole.ts
│   └── useGPS.ts
├── stores/               # Zustand stores
│   ├── auth.store.ts
│   ├── offline.store.ts
│   ├── sync.store.ts
│   └── ui.store.ts
└── shared/               # Shared with backend
    └── types/
```

### Component Template Pattern

```typescript
// LLM Note: Every feature component follows this exact pattern
// components/features/assessment/AssessmentForm.tsx

'use client';

import { FC, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useOfflineStore } from '@/stores/offline.store';
import { useAuthStore } from '@/stores/auth.store';
import { AssessmentType, RapidAssessment } from '@/shared/types/entities';
import { generateOfflineId } from '@/lib/utils';

// Define props interface explicitly
export interface AssessmentFormProps {
  type: AssessmentType;
  entityId: string;
  onSubmit?: (data: RapidAssessment) => void;
  onCancel?: () => void;
}

// Define form schema
const AssessmentFormSchema = z.object({
  type: z.enum(\\\['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION']),
  data: z.object({}).passthrough(),
  mediaAttachments: z.array(z.any()).optional(),
});

type FormData = z.infer<typeof AssessmentFormSchema>;

/\\\*\\\*
 \\\* AssessmentForm Component
 \\\* 
 \\\* LLM Implementation Notes:
 \\\* - Always handle offline state
 \\\* - Validate data before submission
 \\\* - Queue for sync if offline
 \\\* - Show clear feedback to user
 \\\*/
export const AssessmentForm: FC<AssessmentFormProps> = ({
  type,
  entityId,
  onSubmit,
  onCancel,
}) => {
  const { isOffline, queueAssessment } = useOfflineStore();
  const { user } = useAuthStore();
  
  const form = useForm<FormData>({
    resolver: zodResolver(AssessmentFormSchema),
    defaultValues: {
      type,
      data: {},
      mediaAttachments: \\\[],
    },
  });
  
  const handleSubmit = useCallback(async (data: FormData) => {
    try {
      const assessment: RapidAssessment = {
        id: generateOfflineId(),
        ...data,
        affectedEntityId: entityId,
        assessorId: user!.id,
        assessorName: user!.name,
        date: new Date(),
        verificationStatus: 'PENDING',
        syncStatus: isOffline ? 'PENDING' : 'SYNCING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      if (isOffline) {
        await queueAssessment(assessment);
        // Show success toast
      } else {
        // Submit to API
      }
      
      onSubmit?.(assessment);
    } catch (error) {
      // Handle error with user feedback
    }
  }, \\\[isOffline, entityId, user, queueAssessment, onSubmit]);
  
  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const formData = form.getValues();
      localStorage.setItem(`draft-${type}-${entityId}`, JSON.stringify(formData));
    }, 30000);
    
    return () => clearInterval(interval);
  }, \\\[form, type, entityId]);
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/\\\* Dynamic form fields based on assessment type \\\*/}
        {/\\\* LLM: Generate type-specific fields here \\\*/}
        
        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {isOffline ? 'Save Offline' : 'Submit'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
};
```

---

## 7\. Sequence Diagrams

### LLM Development Notes

These sequences represent the exact flow that must be implemented. Each step includes error handling and offline fallbacks.

### Critical User Workflow: Offline Assessment to Verification

```mermaid
sequenceDiagram
    participant A as Assessor
    participant PWA as PWA Client
    participant SW as Service Worker
    participant IDB as IndexedDB
    participant API as API Server
    participant DB as PostgreSQL
    participant C as Coordinator
    
    %% Offline Assessment Creation
    A->>PWA: Fill Assessment Form
    PWA->>PWA: Validate Input
    PWA->>IDB: Store Assessment (offline)
    IDB-->>PWA: Confirm Storage
    PWA->>IDB: Add to Sync Queue
    PWA-->>A: Show Success (queued)
    
    %% Background Sync Attempt
    SW->>SW: Detect Connectivity
    SW->>IDB: Get Queue Items
    IDB-->>SW: Return Assessments
    SW->>API: POST /api/v1/assessments/batch
    API->>DB: Validate \\\& Store
    DB-->>API: Confirm
    API-->>SW: Return Success/Conflicts
    SW->>IDB: Update Sync Status
    
    %% Verification Flow
    API->>API: Check Auto-Verify Rules
    alt Auto-Verification Passes
        API->>DB: Mark as AUTO\\\_VERIFIED
        API-->>C: Skip Manual Review
    else Manual Verification Required
        C->>PWA: View Verification Queue
        PWA->>API: GET /api/v1/verification/queue
        API->>DB: Fetch Pending Items
        API-->>PWA: Return Queue
        C->>PWA: Verify Assessment
        PWA->>API: POST /api/v1/verification/verify
        API->>DB: Update Status
        API-->>PWA: Confirm
    end
```

### Sync Conflict Resolution Flow

```mermaid
sequenceDiagram
    participant PWA as PWA Client
    participant API as API Server
    participant DB as PostgreSQL
    
    PWA->>API: POST /api/v1/sync/push
    API->>DB: Check for Conflicts
    
    alt No Conflicts
        DB-->>API: Apply Changes
        API-->>PWA: Success
    else Conflict Detected
        DB-->>API: Return Conflict Data
        API-->>PWA: Conflict Response
        PWA->>PWA: Show Conflict UI
        Note over PWA: User chooses resolution
        PWA->>API: POST /api/v1/sync/resolve
        API->>DB: Apply Resolution
        API-->>PWA: Success
    end
```

### Response Planning to Delivery Workflow

```mermaid
sequenceDiagram
    participant R as Responder
    participant PWA as PWA Client
    participant IDB as IndexedDB
    participant API as API Server
    participant DB as PostgreSQL
    participant C as Coordinator
    
    %% Response Planning (Offline)
    R->>PWA: View Verified Assessments
    PWA->>IDB: Get Cached Assessments
    IDB-->>PWA: Return Assessments
    R->>PWA: Create Response Plan
    PWA->>IDB: Store Response (PLANNED)
    PWA->>IDB: Add to Sync Queue
    
    %% Delivery Documentation
    R->>PWA: Update to DELIVERED
    PWA->>PWA: Capture GPS/Photos
    PWA->>IDB: Update Response
    
    %% Sync and Verification
    PWA->>API: POST /api/v1/responses/batch
    API->>DB: Store Responses
    API->>API: Check Auto-Verify Rules
    
    alt Auto-Verification
        API->>DB: Mark AUTO\_VERIFIED
    else Manual Review
        C->>PWA: Review Response
        C->>API: Verify Response
        API->>DB: Update Status
    end
```

### Real-time Monitoring Dashboard Flow

```mermaid
sequenceDiagram
    participant M as Monitor
    participant PWA as PWA Client
    participant WS as WebSocket
    participant API as API Server
    participant DB as PostgreSQL
    participant Field as Field Device
    
    %% Initial Dashboard Load
    M->>PWA: Open Dashboard
    PWA->>API: GET /api/v1/dashboard/overview
    API->>DB: Aggregate Current Data
    DB-->>API: Return Metrics
    API-->>PWA: Dashboard Data
    
    %% WebSocket Connection
    PWA->>WS: Connect WebSocket
    WS-->>PWA: Connection Established
    
    %% Real-time Updates
    Field->>API: Submit Assessment
    API->>DB: Store Assessment
    API->>WS: Broadcast Update
    WS-->>PWA: Real-time Event
    PWA->>PWA: Update Dashboard
    
    %% Drill-down
    M->>PWA: Click Entity
    PWA->>API: GET /api/v1/entities/{id}/details
    API->>DB: Fetch Details
    API-->>PWA: Entity Timeline
```

### Donor Commitment to Verification Flow

```mermaid
sequenceDiagram
    participant D as Donor
    participant PWA as PWA Client
    participant API as API Server
    participant DB as PostgreSQL
    participant R as Responder
    participant C as Coordinator
    
    %% Commitment Registration
    D->>PWA: Register Commitment
    PWA->>API: POST /api/v1/commitments
    API->>DB: Store Commitment
    
    %% Response Linking
    R->>PWA: Create Response
    PWA->>PWA: Link Donor (Optional)
    PWA->>API: POST /api/v1/responses
    API->>DB: Store with Donor Link
    
    %% Delivery \& Verification
    R->>PWA: Document Delivery
    PWA->>API: Update Response
    API->>DB: Update Status
    
    C->>API: Verify Delivery
    API->>DB: Update Verification
    
    %% Donor Notification
    API->>API: Calculate Performance
    API->>DB: Update Donor Score
    API->>D: Send Achievement
```

---

## 8\. Database Schema

### LLM Development Notes

Prisma schema is the source of truth. Run `npx prisma generate` after any schema changes. Use `npx prisma migrate dev` for development migrations.

### Prisma Schema Definition

```prisma
// prisma/schema.prisma
// LLM Note: This is the complete schema - implement exactly as shown

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE\\\_URL")
}

// Core Entities

model Incident {
  id                      String                @id @default(uuid())
  name                    String
  type                    IncidentType
  subType                 String?
  source                  String?
  severity                IncidentSeverity
  status                  IncidentStatus
  date                    DateTime
  preliminaryAssessments  PreliminaryAssessment\\\[]
  affectedEntities        IncidentAffectedEntity\\\[]
  createdAt              DateTime              @default(now())
  updatedAt              DateTime              @updatedAt
  
  @@index(\\\[status, severity])
  @@index(\\\[date])
}

model AffectedEntity {
  id                String                @id @default(uuid())
  type              EntityType
  name              String
  lga               String
  ward              String
  longitude         Float
  latitude          Float
  campDetails       Json?                 // Store as JSON for flexibility
  communityDetails  Json?
  incidents         IncidentAffectedEntity\\\[]
  assessments       RapidAssessment\\\[]
  responses         RapidResponse\\\[]
  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt
  
  @@index(\\\[type])
  @@index(\\\[lga, ward])
  @@index(\\\[longitude, latitude])
}

model RapidAssessment {
  id                 String              @id @default(uuid())
  type               AssessmentType
  date               DateTime
  affectedEntity     AffectedEntity      @relation(fields: \\\[affectedEntityId], references: \\\[id])
  affectedEntityId   String
  assessor           User                @relation(fields: \\\[assessorId], references: \\\[id])
  assessorId         String
  assessorName       String              // Denormalized for performance
  verificationStatus VerificationStatus  @default(PENDING)
  syncStatus         SyncStatus          @default(SYNCED)
  offlineId          String?             @unique
  data               Json                // Type-specific data
  mediaAttachments   MediaAttachment\\\[]
  responses          RapidResponse\\\[]
  verifications      Verification\\\[]
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  
  @@index(\\\[type, verificationStatus])
  @@index(\\\[affectedEntityId])
  @@index(\\\[assessorId])
  @@index(\\\[syncStatus])
  @@index(\\\[offlineId])
}

model RapidResponse {
  id                 String              @id @default(uuid())
  responseType       ResponseType
  status             ResponseStatus
  plannedDate        DateTime
  deliveredDate      DateTime?
  affectedEntity     AffectedEntity      @relation(fields: \\\[affectedEntityId], references: \\\[id])
  affectedEntityId   String
  assessment         RapidAssessment     @relation(fields: \\\[assessmentId], references: \\\[id])
  assessmentId       String
  responder          User                @relation(fields: \\\[responderId], references: \\\[id])
  responderId        String
  responderName      String              // Denormalized
  donor              Donor?              @relation(fields: \\\[donorId], references: \\\[id])
  donorId            String?
  donorName          String?             // Can be typed in
  verificationStatus VerificationStatus  @default(PENDING)
  syncStatus         SyncStatus          @default(SYNCED)
  offlineId          String?             @unique
  data               Json
  deliveryEvidence   MediaAttachment\\\[]
  verifications      Verification\\\[]
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  
  @@index(\\\[responseType, status])
  @@index(\\\[affectedEntityId])
  @@index(\\\[assessmentId])
  @@index(\\\[responderId])
  @@index(\\\[donorId])
  @@index(\\\[syncStatus])
}

// User Management

model User {
  id              String           @id @default(uuid())
  email           String           @unique
  name            String
  phone           String?
  organization    String?
  password        String           // Hashed with bcrypt
  roles           UserRole\\\[]
  activeRoleId    String?
  sessions        Session\\\[]
  assessments     RapidAssessment\\\[]
  responses       RapidResponse\\\[]
  verifications   Verification\\\[]
  lastSync        DateTime?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  
  @@index(\\\[email])
}

model UserRole {
  id          String       @id @default(uuid())
  userId      String
  user        User         @relation(fields: \\\[userId], references: \\\[id], onDelete: Cascade)
  role        Role
  permissions Permission\\\[]
  isActive    Boolean      @default(true)
  createdAt  DateTime     @default(now())
  
  @@unique(\\\[userId, role])
  @@index(\\\[userId])
}

// Sync Management

model SyncLog {
  id           String      @id @default(uuid())
  userId       String
  deviceId     String
  syncType     SyncType
  entityType   String
  entityId     String?
  offlineId    String?
  action       SyncAction
  status       SyncStatus
  conflictData Json?
  resolution   String?
  attempt      Int         @default(1)
  error        String?
  createdAt   DateTime    @default(now())
  completedAt DateTime?
  
  @@index(\\\[userId, deviceId])
  @@index(\\\[status])
  @@index(\\\[createdAt])
}

model AutoVerificationRule {
  id            String         @id @default(uuid())
  name          String
  description   String?
  entityType    String         // 'ASSESSMENT' or 'RESPONSE'
  subType       String?        // AssessmentType or ResponseType
  conditions    Json           // Rule conditions
  isActive      Boolean        @default(true)
  priority      Int            @default(0)
  createdBy     String
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  
  @@index(\\\[entityType, isActive])
}

// Supporting Models

model MediaAttachment {
  id              String           @id @default(uuid())
  url             String?          // S3 URL when synced
  localPath       String?          // Local device path
  thumbnailUrl    String?
  mimeType        String
  size            Int
  metadata        Json?            // GPS coords, timestamp, etc.
  assessmentId    String?
  assessment      RapidAssessment? @relation(fields: \\\[assessmentId], references: \\\[id])
  responseId      String?
  response        RapidResponse?   @relation(fields: \\\[responseId], references: \\\[id])
  syncStatus      SyncStatus       @default(PENDING)
  createdAt       DateTime         @default(now())
  
  @@index(\\\[assessmentId])
  @@index(\\\[responseId])
  @@index(\\\[syncStatus])
}

model Verification {
  id              String              @id @default(uuid())
  assessmentId    String?
  assessment      RapidAssessment?    @relation(fields: \\\[assessmentId], references: \\\[id])
  responseId      String?
  response        RapidResponse?      @relation(fields: \\\[responseId], references: \\\[id])
  verifierId      String
  verifier        User                @relation(fields: \\\[verifierId], references: \\\[id])
  status          VerificationStatus
  notes           String?
  autoVerified    Boolean             @default(false)
  ruleId          String?             // References AutoVerificationRule if auto-verified
  createdAt       DateTime            @default(now())
  
  @@index(\\\[assessmentId])
  @@index(\\\[responseId])
  @@index(\\\[verifierId])
}

model PreliminaryAssessment {
  id                          String      @id @default(uuid())
  incidentId                  String?
  incident                    Incident?   @relation(fields: \\\[incidentId], references: \\\[id])
  reportingDate               DateTime
  reportingLatitude           Float
  reportingLongitude          Float
  reportingLGA                String
  reportingWard               String
  numberLivesLost             Int
  numberInjured               Int
  numberDisplaced             Int
  numberHousesAffected        Int
  schoolsAffected             String?
  medicalFacilitiesAffected   String?
  agriculturalLandsAffected   String?
  reportingAgent              String
  additionalDetails           String?
  createdAt                   DateTime    @default(now())
  
  @@index(\\\[incidentId])
  @@index(\\\[reportingLGA, reportingWard])
}

model IncidentAffectedEntity {
  incidentId       String
  incident         Incident        @relation(fields: \\\[incidentId], references: \\\[id])
  affectedEntityId String
  affectedEntity   AffectedEntity  @relation(fields: \\\[affectedEntityId], references: \\\[id])
  dateAffected     DateTime
  
  @@id(\\\[incidentId, affectedEntityId])
  @@index(\\\[incidentId])
  @@index(\\\[affectedEntityId])
}

model Donor {
  id                String          @id @default(uuid())
  name              String
  organization      String
  email             String          @unique
  phone             String?
  responses         RapidResponse\\\[]
  commitments       DonorCommitment\\\[]
  achievements      DonorAchievement\\\[]
  performanceScore  Int             @default(0)
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  
  @@index(\\\[email])
  @@index(\\\[performanceScore])
}

model DonorCommitment {
  id              String      @id @default(uuid())
  donorId         String
  donor           Donor       @relation(fields: \\\[donorId], references: \\\[id])
  responseType    ResponseType
  quantity        Int
  unit            String
  targetDate      DateTime
  status          String      // PLANNED, DELIVERED, CANCELLED
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  
  @@index(\\\[donorId])
  @@index(\\\[status])
}

model DonorAchievement {
  id              String      @id @default(uuid())
  donorId         String
  donor           Donor       @relation(fields: \\\[donorId], references: \\\[id])
  type            String      // FIRST\\\_DELIVERY, MILESTONE\\\_10, etc.
  title           String
  description     String
  earnedAt        DateTime    @default(now())
  
  @@index(\\\[donorId])
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: \\\[userId], references: \\\[id], onDelete: Cascade)
  token        String   @unique
  deviceId     String?
  userAgent    String?
  ipAddress    String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  
  @@index(\\\[userId])
  @@index(\\\[token])
}

model Permission {
  id          String     @id @default(uuid())
  name        String     @unique
  description String?
  category    String
  userRoles   UserRole\\\[]
  
  @@index(\\\[category])
}

// Enums

enum IncidentType {
  FLOOD
  FIRE
  LANDSLIDE
  CYCLONE
  CONFLICT
  EPIDEMIC
  OTHER
}

enum IncidentSeverity {
  MINOR
  MODERATE
  SEVERE
  CATASTROPHIC
}

enum IncidentStatus {
  ACTIVE
  CONTAINED
  RESOLVED
}

enum EntityType {
  CAMP
  COMMUNITY
}

enum AssessmentType {
  HEALTH
  WASH
  SHELTER
  FOOD
  SECURITY
  POPULATION
}

enum ResponseType {
  HEALTH
  WASH
  SHELTER
  FOOD
  SECURITY
  POPULATION
}

enum ResponseStatus {
  PLANNED
  IN\\\_PROGRESS
  DELIVERED
  CANCELLED
}

enum VerificationStatus {
  PENDING
  VERIFIED
  AUTO\\\_VERIFIED
  REJECTED
}

enum SyncStatus {
  PENDING
  SYNCING
  SYNCED
  CONFLICT
  FAILED
}

enum Role {
  ASSESSOR
  RESPONDER
  COORDINATOR
  DONOR
  ADMIN
}

enum SyncType {
  FULL
  INCREMENTAL
  SELECTIVE
}

enum SyncAction {
  CREATE
  UPDATE
  DELETE
}
```

### Database Migration Strategy for LLM Development

```bash
# LLM Implementation Commands

# 1. Initial setup
npx prisma init

# 2. After schema changes
npx prisma format              # Format schema file
npx prisma validate           # Validate schema
npx prisma generate           # Generate Prisma Client
npx prisma migrate dev        # Create migration

# 3. Production deployment
npx prisma migrate deploy     # Apply migrations

# 4. Seed database (create prisma/seed.ts first)
npx prisma db seed
```

---

## 9\. Frontend Architecture Details

### State Management with Zustand

```typescript
// stores/offline.store.ts
// LLM Note: This is the primary store for offline functionality

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { db } from '@/lib/offline/db';
import { RapidAssessment, RapidResponse } from '@/shared/types/entities';

interface OfflineState {
  isOffline: boolean;
  queueSize: number;
  syncInProgress: boolean;
  lastSyncTime: Date | null;
  conflictCount: number;
  
  // Actions
  setOfflineStatus: (status: boolean) => void;
  queueAssessment: (assessment: RapidAssessment) => Promise<void>;
  queueResponse: (response: RapidResponse) => Promise<void>;
  startSync: () => Promise<void>;
  resolveConflict: (entityId: string, resolution: 'local' | 'remote') => Promise<void>;
  clearQueue: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOffline: !navigator.onLine,
      queueSize: 0,
      syncInProgress: false,
      lastSyncTime: null,
      conflictCount: 0,
      
      setOfflineStatus: (status) => set({ isOffline: status }),
      
      queueAssessment: async (assessment) => {
        try {
          // Store in IndexedDB with offline ID
          await db.assessments.add({
            ...assessment,
            syncStatus: 'PENDING',
            offlineId: assessment.id,
          });
          
          // Add to sync queue
          await db.syncQueue.add({
            type: 'ASSESSMENT',
            action: 'CREATE',
            data: assessment,
            priority: 'NORMAL',
            retryCount: 0,
            createdAt: new Date(),
          });
          
          set((state) => ({ queueSize: state.queueSize + 1 }));
        } catch (error) {
          console.error('Failed to queue assessment:', error);
          throw error;
        }
      },
      
      queueResponse: async (response) => {
        // Similar to queueAssessment
        try {
          await db.responses.add({
            ...response,
            syncStatus: 'PENDING',
            offlineId: response.id,
          });
          
          await db.syncQueue.add({
            type: 'RESPONSE',
            action: 'CREATE',
            data: response,
            priority: 'NORMAL',
            retryCount: 0,
            createdAt: new Date(),
          });
          
          set((state) => ({ queueSize: state.queueSize + 1 }));
        } catch (error) {
          console.error('Failed to queue response:', error);
          throw error;
        }
      },
      
      startSync: async () => {
        if (get().syncInProgress) return;
        
        set({ syncInProgress: true });
        
        try {
          const queueItems = await db.syncQueue
            .where('retryCount')
            .below(5)
            .toArray();
          
          for (const item of queueItems) {
            try {
              const response = await fetch('/api/v1/sync/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  changes: \\\[item],
                  syncToken: localStorage.getItem('syncToken'),
                }),
              });
              
              if (response.ok) {
                await db.syncQueue.delete(item.id);
                set((state) => ({ queueSize: Math.max(0, state.queueSize - 1) }));
              } else if (response.status === 409) {
                // Conflict detected
                set((state) => ({ conflictCount: state.conflictCount + 1 }));
              } else {
                // Retry later
                await db.syncQueue.update(item.id, {
                  retryCount: item.retryCount + 1,
                  lastAttempt: new Date(),
                });
              }
            } catch (error) {
              // Network error - retry later
              console.error('Sync failed for item:', item.id, error);
            }
          }
          
          set({ 
            lastSyncTime: new Date(),
            syncInProgress: false,
          });
        } catch (error) {
          console.error('Sync failed:', error);
          set({ syncInProgress: false });
        }
      },
      
      resolveConflict: async (entityId, resolution) => {
        // Implement conflict resolution
        const conflict = await db.conflicts.get(entityId);
        if (!conflict) return;
        
        if (resolution === 'local') {
          // Keep local version
          await fetch('/api/v1/sync/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityId,
              resolution: 'local',
              data: conflict.localData,
            }),
          });
        } else {
          // Accept remote version
          await db.assessments.update(entityId, conflict.remoteData);
        }
        
        await db.conflicts.delete(entityId);
        set((state) => ({ conflictCount: Math.max(0, state.conflictCount - 1) }));
      },
      
      clearQueue: async () => {
        await db.syncQueue.clear();
        set({ queueSize: 0 });
      },
    }),
    {
      name: 'offline-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);
```

### Offline Database Setup (Dexie.js)

```typescript
// lib/offline/db.ts
// LLM Note: This defines the IndexedDB schema for offline storage

import Dexie, { Table } from 'dexie';
import { RapidAssessment, RapidResponse, AffectedEntity, OfflineQueueItem } from '@/shared/types/entities';

class OfflineDatabase extends Dexie {
  assessments!: Table<RapidAssessment>;
  responses!: Table<RapidResponse>;
  entities!: Table<AffectedEntity>;
  syncQueue!: Table<OfflineQueueItem>;
  conflicts!: Table<any>;
  
  constructor() {
    super('DisasterManagementDB');
    
    this.version(1).stores({
      assessments: 'id, offlineId, affectedEntityId, type, syncStatus, createdAt',
      responses: 'id, offlineId, affectedEntityId, assessmentId, responseType, syncStatus, createdAt',
      entities: 'id, type, lga, ward, \\\[longitude+latitude]',
      syncQueue: '++id, type, action, priority, createdAt',
      conflicts: '++id, entityType, entityId, createdAt',
    });
  }
  
  // Encryption wrapper for sensitive data
  async encryptData(data: any): Promise<string> {
    // LLM: Implement AES-256 encryption using Web Crypto API
    const key = await this.getOrCreateKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(JSON.stringify(data))
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }
  
  async decryptData(encrypted: string): Promise<any> {
    // LLM: Implement decryption
    const key = await this.getOrCreateKey();
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    return JSON.parse(new TextDecoder().decode(decrypted));
  }
  
  private async getOrCreateKey(): Promise<CryptoKey> {
    // LLM: Device-specific key generation
    let keyData = localStorage.getItem('encryptionKey');
    if (!keyData) {
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        \\\['encrypt', 'decrypt']
      );
      const exported = await crypto.subtle.exportKey('jwk', key);
      localStorage.setItem('encryptionKey', JSON.stringify(exported));
      return key;
    }
    
    return crypto.subtle.importKey(
      'jwk',
      JSON.parse(keyData),
      { name: 'AES-GCM' },
      false,
      \\\['encrypt', 'decrypt']
    );
  }
}

export const db = new OfflineDatabase();

// Initialize database on app startup
export async function initializeOfflineDB() {
  try {
    await db.open();
    console.log('Offline database initialized');
    
    // Clean up old sync queue items
    const oldItems = await db.syncQueue
      .where('createdAt')
      .below(new Date(Date.now() - 7 \\\* 24 \\\* 60 \\\* 60 \\\* 1000)) // 7 days old
      .toArray();
    
    if (oldItems.length > 0) {
      await db.syncQueue.bulkDelete(oldItems.map(i => i.id!));
      console.log(`Cleaned up ${oldItems.length} old queue items`);
    }
  } catch (error) {
    console.error('Failed to initialize offline database:', error);
  }
}
```

### Service Worker Configuration

```javascript
// public/sw.js
// LLM Note: Service worker for offline functionality and background sync

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { Queue } from 'workbox-background-sync';

// Precache static assets
precacheAndRoute(self.\\\_\\\_WB\\\_MANIFEST);

// API sync queue for failed requests
const apiQueue = new Queue('api-queue', {
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
      } catch (error) {
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  },
});

// Cache strategies for different routes
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/entities'),
  new NetworkFirst({
    cacheName: 'entities-cache',
    networkTimeoutSeconds: 5,
    plugins: \\\[
      new BackgroundSyncPlugin('entities-sync', {
        maxRetentionTime: 24 \\\* 60, // 24 hours
      }),
    ],
  })
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/assessments'),
  new NetworkFirst({
    cacheName: 'assessments-cache',
    networkTimeoutSeconds: 3,
    plugins: \\\[
      {
        fetchDidFail: async ({ request }) => {
          await apiQueue.pushRequest({ request });
        },
      },
    ],
  })
);

// Offline fallback page
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async () => {
    try {
      return await fetch(request);
    } catch (error) {
      return caches.match('/offline.html');
    }
  }
);

// Background sync for assessments and responses
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-assessments') {
    event.waitUntil(syncAssessments());
  } else if (event.tag === 'sync-responses') {
    event.waitUntil(syncResponses());
  }
});

async function syncAssessments() {
  // LLM: Implement sync logic
  const cache = await caches.open('sync-cache');
  const requests = await cache.keys();
  
  for (const request of requests) {
    if (request.url.includes('/assessments')) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
        }
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
  }
}

async function syncResponses() {
  // Similar to syncAssessments
  const cache = await caches.open('sync-cache');
  const requests = await cache.keys();
  
  for (const request of requests) {
    if (request.url.includes('/responses')) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
        }
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
  }
}
```

---

## 10\. Backend Architecture Details

### API Middleware Stack

```typescript
// lib/middleware/index.ts
// LLM Note: Middleware composition for all API routes

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimiter } from './rateLimiter';
import { logger } from './logger';
import { errorHandler } from './errorHandler';

export async function withMiddleware(
  request: NextRequest,
  handler: (req: NextRequest, ctx: any) => Promise<NextResponse>
) {
  try {
    // 1. Logging
    logger.info({
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
    });
    
    // 2. Rate limiting
    const rateLimitResult = await rateLimiter.check(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }
    
    // 3. Authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 4. Execute handler
    const response = await handler(request, { session });
    
    // 5. Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    return response;
  } catch (error) {
    return errorHandler(error);
  }
}
```

### Background Job Processing

```typescript
// lib/queue/processor.ts
// LLM Note: Background job processing for sync and verification

import { Worker, Queue } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { autoVerify } from '@/lib/verification';
import { sendNotification } from '@/lib/notifications';
import { uploadToS3 } from '@/lib/storage';

// Define job queues
export const syncQueue = new Queue('sync', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

export const verificationQueue = new Queue('verification', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

export const mediaQueue = new Queue('media', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

// Sync worker
const syncWorker = new Worker(
  'sync',
  async (job) => {
    const { type, data } = job.data;
    
    switch (type) {
      case 'ASSESSMENT':
        return await processSyncAssessment(data);
      case 'RESPONSE':
        return await processSyncResponse(data);
      case 'MEDIA':
        return await processSyncMedia(data);
      default:
        throw new Error(`Unknown sync type: ${type}`);
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    concurrency: 5,
  }
);

// Verification worker
const verificationWorker = new Worker(
  'verification',
  async (job) => {
    const { entityId, entityType } = job.data;
    
    try {
      // Check auto-verification rules
      const rules = await prisma.autoVerificationRule.findMany({
        where: {
          entityType,
          isActive: true,
        },
        orderBy: { priority: 'desc' },
      });
      
      for (const rule of rules) {
        const result = await autoVerify(entityId, rule);
        if (result.verified) {
          // Update entity status
          const model = entityType === 'ASSESSMENT' 
            ? prisma.rapidAssessment 
            : prisma.rapidResponse;
            
          await model.update({
            where: { id: entityId },
            data: {
              verificationStatus: 'AUTO_VERIFIED',
            },
          });
          
          // Create verification record
          await prisma.verification.create({
            data: {
              assessmentId: entityType === 'ASSESSMENT' ? entityId : undefined,
              responseId: entityType === 'RESPONSE' ? entityId : undefined,
              verifierId: 'SYSTEM',
              status: 'AUTO_VERIFIED',
              autoVerified: true,
              ruleId: rule.id,
              notes: `Auto-verified by rule: ${rule.name}`,
              createdAt: new Date(),
            },
          });
          
          // Send notification
          await sendNotification({
            type: 'AUTO_VERIFICATION',
            entityId,
            entityType,
          });
          
          return { autoVerified: true, ruleId: rule.id };
        }
      }
      
      // Add to manual verification queue
      await prisma.verificationQueue.create({
        data: {
          entityId,
          entityType,
          priority: determinePriority(entityType, entityId),
          status: 'PENDING',
          createdAt: new Date(),
        },
      });
      
      return { autoVerified: false, queuedForManualReview: true };
    } catch (error) {
      console.error('Verification failed:', error);
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    concurrency: 10,
  }
);

// Media processing worker
const mediaWorker = new Worker(
  'media',
  async (job) => {
    const { localPath, entityId, entityType, metadata } = job.data;
    
    try {
      // Upload to S3
      const s3Url = await uploadToS3({
        localPath,
        bucket: process.env.S3_BUCKET,
        key: `${entityType}/${entityId}/${Date.now()}_${path.basename(localPath)}`,
      });
      
      // Generate thumbnail if image
      let thumbnailUrl = null;
      if (metadata.mimeType?.startsWith('image/')) {
        thumbnailUrl = await generateThumbnail(localPath, s3Url);
      }
      
      // Update database reference
      await prisma.mediaAttachment.update({
        where: { id: metadata.attachmentId },
        data: {
          url: s3Url,
          thumbnailUrl,
          syncStatus: 'SYNCED',
        },
      });
      
      return { success: true, url: s3Url };
    } catch (error) {
      console.error('Media upload failed:', error);
      
      // Update with failure status
      await prisma.mediaAttachment.update({
        where: { id: metadata.attachmentId },
        data: {
          syncStatus: 'FAILED',
        },
      });
      
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    concurrency: 3, // Limit concurrent uploads
  }
);

// Helper functions
async function processSyncAssessment(data: any) {
  try {
    // 1. Check for existing record by offlineId
    const existing = await prisma.rapidAssessment.findUnique({
      where: { offlineId: data.offlineId },
    });
    
    if (existing) {
      // 2. Detect conflicts
      if (existing.updatedAt > new Date(data.updatedAt)) {
        // Conflict: server version is newer
        await prisma.syncLog.create({
          data: {
            userId: data.assessorId,
            deviceId: data.deviceId,
            syncType: 'INCREMENTAL',
            entityType: 'ASSESSMENT',
            entityId: existing.id,
            offlineId: data.offlineId,
            action: 'UPDATE',
            status: 'CONFLICT',
            conflictData: {
              local: data,
              remote: existing,
            },
            createdAt: new Date(),
          },
        });
        
        return { status: 'CONFLICT', entityId: existing.id };
      }
      
      // 3. Apply changes
      const updated = await prisma.rapidAssessment.update({
        where: { id: existing.id },
        data: {
          ...data,
          syncStatus: 'SYNCED',
          updatedAt: new Date(),
        },
      });
      
      // 4. Log successful sync
      await prisma.syncLog.create({
        data: {
          userId: data.assessorId,
          deviceId: data.deviceId,
          syncType: 'INCREMENTAL',
          entityType: 'ASSESSMENT',
          entityId: updated.id,
          action: 'UPDATE',
          status: 'SYNCED',
          completedAt: new Date(),
        },
      });
      
      return { status: 'SUCCESS', entityId: updated.id };
    } else {
      // Create new record
      const created = await prisma.rapidAssessment.create({
        data: {
          ...data,
          id: undefined, // Let database generate ID
          offlineId: data.offlineId,
          syncStatus: 'SYNCED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      
      // Queue for verification
      await verificationQueue.add('verify-assessment', {
        entityId: created.id,
        entityType: 'ASSESSMENT',
      });
      
      // Queue media attachments for upload
      if (data.mediaAttachments?.length > 0) {
        for (const attachment of data.mediaAttachments) {
          await mediaQueue.add('upload-media', {
            localPath: attachment.localPath,
            entityId: created.id,
            entityType: 'ASSESSMENT',
            metadata: attachment,
          });
        }
      }
      
      // Log successful sync
      await prisma.syncLog.create({
        data: {
          userId: data.assessorId,
          deviceId: data.deviceId,
          syncType: 'INCREMENTAL',
          entityType: 'ASSESSMENT',
          entityId: created.id,
          offlineId: data.offlineId,
          action: 'CREATE',
          status: 'SYNCED',
          completedAt: new Date(),
        },
      });
      
      return { status: 'SUCCESS', entityId: created.id };
    }
  } catch (error) {
    console.error('Sync assessment failed:', error);
    
    // Log failure
    await prisma.syncLog.create({
      data: {
        userId: data.assessorId,
        deviceId: data.deviceId,
        syncType: 'INCREMENTAL',
        entityType: 'ASSESSMENT',
        offlineId: data.offlineId,
        action: data.id ? 'UPDATE' : 'CREATE',
        status: 'FAILED',
        error: error.message,
        createdAt: new Date(),
      },
    });
    
    throw error;
  }
}

async function processSyncResponse(data: any) {
  try {
    // Similar pattern to processSyncAssessment
    const existing = await prisma.rapidResponse.findUnique({
      where: { offlineId: data.offlineId },
    });
    
    if (existing) {
      // Check for conflicts
      if (existing.updatedAt > new Date(data.updatedAt)) {
        await prisma.syncLog.create({
          data: {
            userId: data.responderId,
            deviceId: data.deviceId,
            syncType: 'INCREMENTAL',
            entityType: 'RESPONSE',
            entityId: existing.id,
            offlineId: data.offlineId,
            action: 'UPDATE',
            status: 'CONFLICT',
            conflictData: {
              local: data,
              remote: existing,
            },
            createdAt: new Date(),
          },
        });
        
        return { status: 'CONFLICT', entityId: existing.id };
      }
      
      // Update existing
      const updated = await prisma.rapidResponse.update({
        where: { id: existing.id },
        data: {
          ...data,
          syncStatus: 'SYNCED',
          updatedAt: new Date(),
        },
      });
      
      return { status: 'SUCCESS', entityId: updated.id };
    } else {
      // Create new response
      const created = await prisma.rapidResponse.create({
        data: {
          ...data,
          id: undefined,
          offlineId: data.offlineId,
          syncStatus: 'SYNCED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      
      // Queue for verification if delivered
      if (created.status === 'DELIVERED') {
        await verificationQueue.add('verify-response', {
          entityId: created.id,
          entityType: 'RESPONSE',
        });
      }
      
      // Queue delivery evidence for upload
      if (data.deliveryEvidence?.length > 0) {
        for (const evidence of data.deliveryEvidence) {
          await mediaQueue.add('upload-media', {
            localPath: evidence.localPath,
            entityId: created.id,
            entityType: 'RESPONSE',
            metadata: evidence,
          });
        }
      }
      
      return { status: 'SUCCESS', entityId: created.id };
    }
  } catch (error) {
    console.error('Sync response failed:', error);
    throw error;
  }
}

async function processSyncMedia(data: any) {
  try {
    const { entityId, entityType, mediaFiles } = data;
    const uploadResults = [];
    
    for (const file of mediaFiles) {
      try {
        // Upload to S3
        const result = await uploadToS3({
          localPath: file.localPath,
          bucket: process.env.S3_BUCKET,
          key: `${entityType}/${entityId}/${file.filename}`,
        });
        
        // Create or update media attachment record
        await prisma.mediaAttachment.upsert({
          where: { id: file.id },
          create: {
            id: file.id,
            url: result.url,
            mimeType: file.mimeType,
            size: file.size,
            metadata: file.metadata,
            assessmentId: entityType === 'ASSESSMENT' ? entityId : undefined,
            responseId: entityType === 'RESPONSE' ? entityId : undefined,
            syncStatus: 'SYNCED',
          },
          update: {
            url: result.url,
            syncStatus: 'SYNCED',
          },
        });
        
        uploadResults.push({ 
          fileId: file.id, 
          status: 'SUCCESS', 
          url: result.url 
        });
      } catch (error) {
        uploadResults.push({ 
          fileId: file.id, 
          status: 'FAILED', 
          error: error.message 
        });
      }
    }
    
    return { 
      status: 'COMPLETED', 
      results: uploadResults 
    };
  } catch (error) {
    console.error('Media sync failed:', error);
    throw error;
  }
}

function determinePriority(entityType: string, entityId: string): string {
  // LLM: Implement priority logic based on business rules
  // For example, HEALTH assessments might be higher priority
  // Or responses with large beneficiary counts
  return 'NORMAL';
}

async function generateThumbnail(localPath: string, s3Url: string): Promise<string> {
  // LLM: Implement thumbnail generation
  // This is a placeholder - actual implementation would use sharp or similar
  return `${s3Url}_thumb`;
}

// Export worker instances for lifecycle management
export const workers = {
  syncWorker,
  verificationWorker,
  mediaWorker,
};

// Graceful shutdown
export async function shutdownWorkers() {
  await Promise.all([
    syncWorker.close(),
    verificationWorker.close(),
    mediaWorker.close(),
  ]);
}

```      

### Synchronization Engine

```typescript

// lib/sync/engine.ts
// LLM Note: Core synchronization logic with conflict resolution

import { prisma } from '@/lib/prisma';
import { SyncStatus, ConflictResolution } from '@/shared/types';

export class SyncEngine {
  private syncToken: string;
  
  constructor(syncToken: string) {
    this.syncToken = syncToken;
  }
  
  async performSync(
    deviceId: string,
    userId: string,
    changes: any\[]
  ): Promise<SyncResult> {
    const results = {
      successful: \[],
      conflicts: \[],
      failed: \[],
    };
    
    for (const change of changes) {
      try {
        const result = await this.processChange(change, deviceId, userId);
        
        if (result.status === 'CONFLICT') {
          results.conflicts.push(result);
        } else if (result.status === 'SUCCESS') {
          results.successful.push(result);
        } else {
          results.failed.push(result);
        }
      } catch (error) {
        results.failed.push({
          entityId: change.entityId,
          error: error.message,
        });
      }
    }
    
    // Generate new sync token
    const newSyncToken = await this.generateSyncToken();
    
    return {
      ...results,
      syncToken: newSyncToken,
    };
  }
  
  private async processChange(
    change: any,
    deviceId: string,
    userId: string
  ): Promise<any> {
    // Check for conflicts using timestamp comparison
    const serverVersion = await this.getServerVersion(
      change.entityType,
      change.entityId
    );
    
    if (serverVersion \&\& serverVersion.updatedAt > change.updatedAt) {
      // Conflict detected
      return {
        status: 'CONFLICT',
        entityId: change.entityId,
        localVersion: change,
        serverVersion: serverVersion,
      };
    }
    
    // Apply change based on action
    switch (change.action) {
      case 'CREATE':
        return await this.handleCreate(change, userId);
      case 'UPDATE':
        return await this.handleUpdate(change, userId);
      case 'DELETE':
        return await this.handleDelete(change, userId);
      default:
        throw new Error(`Unknown action: ${change.action}`);
    }
  }
  
  async resolveConflict(
    entityId: string,
    resolution: ConflictResolution,
    data?: any
  ): Promise<void> {
    switch (resolution) {
      case 'LOCAL\_WINS':
        await this.applyLocalVersion(entityId, data);
        break;
      case 'SERVER\_WINS':
        // No action needed, client will pull server version
        break;
      case 'MERGE':
        await this.mergeVersions(entityId, data);
        break;
    }
  }
  
  private async generateSyncToken(): Promise<string> {
    // Generate unique sync token for tracking sync state
    return `sync\_${Date.now()}\_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### Notification System

```typescript
// lib/notifications/index.ts
// LLM Note: Multi-channel notification system

import { prisma } from '@/lib/prisma';
import { sendEmail } from './email';
import { sendSMS } from './sms';
import { sendPushNotification } from './push';

export interface Notification {
  type: NotificationType;
  recipient: string;
  title: string;
  message: string;
  data?: any;
  channels?: ('EMAIL' | 'SMS' | 'PUSH')\[];
}

export async function sendNotification(notification: Notification) {
  const user = await prisma.user.findUnique({
    where: { id: notification.recipient },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const channels = notification.channels || \['PUSH'];
  const results = \[];
  
  for (const channel of channels) {
    try {
      switch (channel) {
        case 'EMAIL':
          if (user.email) {
            await sendEmail({
              to: user.email,
              subject: notification.title,
              body: notification.message,
              data: notification.data,
            });
            results.push({ channel: 'EMAIL', status: 'SUCCESS' });
          }
          break;
          
        case 'SMS':
          if (user.phone) {
            await sendSMS({
              to: user.phone,
              message: notification.message,
            });
            results.push({ channel: 'SMS', status: 'SUCCESS' });
          }
          break;
          
        case 'PUSH':
          await sendPushNotification({
            userId: user.id,
            title: notification.title,
            body: notification.message,
            data: notification.data,
          });
          results.push({ channel: 'PUSH', status: 'SUCCESS' });
          break;
      }
    } catch (error) {
      results.push({
        channel,
        status: 'FAILED',
        error: error.message,
      });
    }
  }
  
  // Log notification
  await prisma.notificationLog.create({
    data: {
      userId: user.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      channels: channels,
      results: results,
      createdAt: new Date(),
    },
  });
  
  return results;
}

// Notification templates
export const notificationTemplates = {
  ASSESSMENT\_VERIFIED: {
    title: 'Assessment Verified',
    message: 'Your assessment for {{entityName}} has been verified.',
  },
  RESPONSE\_DELIVERED: {
    title: 'Response Delivered',
    message: 'Response delivery to {{entityName}} confirmed.',
  },
  SYNC\_CONFLICT: {
    title: 'Sync Conflict Detected',
    message: 'Conflict detected for {{entityType}}. Manual review required.',
  },
  AUTO\_VERIFICATION: {
    title: 'Auto-Verified',
    message: 'Your {{entityType}} was automatically verified.',
  },
};
```

### Auto-Verification Engine

```typescript
// lib/verification/auto-verify.ts
// LLM Note: Rule-based auto-verification system

import { prisma } from '@/lib/prisma';

export interface AutoVerificationRule {
  id: string;
  entityType: 'ASSESSMENT' | 'RESPONSE';
  subType?: string;
  conditions: RuleCondition\[];
  priority: number;
}

export interface RuleCondition {
  field: string;
  operator: 'EQUALS' | 'GREATER\_THAN' | 'LESS\_THAN' | 'CONTAINS' | 'EXISTS';
  value: any;
  required: boolean;
}

export async function autoVerify(
  entityId: string,
  rule: AutoVerificationRule
): Promise<{ verified: boolean; reason?: string }> {
  try {
    // Fetch entity based on type
    const entity = await fetchEntity(entityId, rule.entityType);
    
    if (!entity) {
      return { verified: false, reason: 'Entity not found' };
    }
    
    // Check all conditions
    for (const condition of rule.conditions) {
      const fieldValue = getFieldValue(entity, condition.field);
      const conditionMet = evaluateCondition(fieldValue, condition);
      
      if (condition.required \&\& !conditionMet) {
        return {
          verified: false,
          reason: `Required condition not met: ${condition.field}`,
        };
      }
    }
    
    // All required conditions met
    return { verified: true };
  } catch (error) {
    console.error('Auto-verification error:', error);
    return { verified: false, reason: error.message };
  }
}

function evaluateCondition(value: any, condition: RuleCondition): boolean {
  switch (condition.operator) {
    case 'EQUALS':
      return value === condition.value;
    case 'GREATER\_THAN':
      return value > condition.value;
    case 'LESS\_THAN':
      return value < condition.value;
    case 'CONTAINS':
      return Array.isArray(value) 
        ? value.includes(condition.value)
        : String(value).includes(condition.value);
    case 'EXISTS':
      return value !== null \&\& value !== undefined;
    default:
      return false;
  }
}

function getFieldValue(entity: any, fieldPath: string): any {
  // Navigate nested fields using dot notation
  const fields = fieldPath.split('.');
  let value = entity;
  
  for (const field of fields) {
    if (value \&\& typeof value === 'object') {
      value = value\[field];
    } else {
      return undefined;
    }
  }
  
  return value;
}

async function fetchEntity(
  entityId: string,
  entityType: string
): Promise<any> {
  if (entityType === 'ASSESSMENT') {
    return prisma.rapidAssessment.findUnique({
      where: { id: entityId },
      include: {
        mediaAttachments: true,
        affectedEntity: true,
      },
    });
  } else if (entityType === 'RESPONSE') {
    return prisma.rapidResponse.findUnique({
      where: { id: entityId },
      include: {
        deliveryEvidence: true,
        assessment: true,
      },
    });
  }
  
  return null;
}
```

---

## 11\. Security Architecture

### LLM Implementation Notes

Security is implemented in layers. Each layer must be explicitly implemented. Never skip security checks for convenience.

### Security Layers

#### 1\. Data Encryption

```typescript
// lib/security/encryption.ts
// LLM Note: AES-256-GCM encryption for offline data

export class EncryptionService {
  private static instance: EncryptionService;
  private key: CryptoKey | null = null;
  
  static getInstance(): EncryptionService {
    if (!this.instance) {
      this.instance = new EncryptionService();
    }
    return this.instance;
  }
  
  async initialize(): Promise<void> {
    // Device-specific key generation
    const storedKey = localStorage.getItem('deviceKey');
    
    if (!storedKey) {
      // Generate new key
      this.key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        \['encrypt', 'decrypt']
      );
      
      // Export and store
      const exported = await crypto.subtle.exportKey('jwk', this.key);
      localStorage.setItem('deviceKey', JSON.stringify(exported));
    } else {
      // Import existing key
      this.key = await crypto.subtle.importKey(
        'jwk',
        JSON.parse(storedKey),
        { name: 'AES-GCM' },
        false,
        \['encrypt', 'decrypt']
      );
    }
  }
  
  async encrypt(data: any): Promise<{ encrypted: string; iv: string }> {
    if (!this.key) await this.initialize();
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.key!,
      encoded
    );
    
    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv)),
    };
  }
  
  async decrypt(encrypted: string, iv: string): Promise<any> {
    if (!this.key) await this.initialize();
    
    const encryptedData = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const ivData = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivData },
      this.key!,
      encryptedData
    );
    
    return JSON.parse(new TextDecoder().decode(decrypted));
  }
}
```

#### 2\. Authentication \& Authorization

```typescript
// lib/auth/index.ts
// LLM Note: NextAuth configuration with role-based access

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 24 \* 60 \* 60, // 24 hours
  },
  
  providers: \[
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            roles: {
              include: {
                permissions: true,
              },
            },
          },
        });
        
        if (!user) {
          throw new Error('User not found');
        }
        
        const isValid = await bcrypt.compare(credentials.password, user.password);
        
        if (!isValid) {
          throw new Error('Invalid password');
        }
        
        // Flatten permissions
        const permissions = user.roles.flatMap(role => 
          role.permissions.map(p => p.name)
        );
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles.map(r => r.role),
          permissions: \[...new Set(permissions)], // Unique permissions
        };
      },
    }),
  ],
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = user.roles;
        token.permissions = user.permissions;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roles = token.roles as string\[];
        session.user.permissions = token.permissions as string\[];
      }
      return session;
    },
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
};

// Permission check middleware
export function requirePermission(permission: string) {
  return async (req: NextRequest) => {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.permissions?.includes(permission)) {
      throw new Error('Insufficient permissions');
    }
    
    return session;
  };
}

// Role check middleware  
export function requireRole(role: string) {
  return async (req: NextRequest) => {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.roles?.includes(role)) {
      throw new Error('Insufficient role');
    }
    
    return session;
  };
}
```

#### 3\. API Security Headers

```typescript
// middleware.ts
// LLM Note: Security headers for all API routes

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Clone the response
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self)'
  );
  
  // CORS for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED\_ORIGIN || '\*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  
  return response;
}

export const config = {
  matcher: '/((?!\_next/static|\_next/image|favicon.ico).\*)',
};
```

### Data Privacy \& Compliance

```typescript
// lib/privacy/anonymization.ts
// LLM Note: Data anonymization for compliance

export class DataAnonymizer {
  // Remove PII from exported data
  static anonymizeAssessment(assessment: any): any {
    return {
      ...assessment,
      assessorName: this.hashString(assessment.assessorName),
      assessorId: this.hashString(assessment.assessorId),
      // Keep operational data intact
      affectedEntityId: assessment.affectedEntityId,
      type: assessment.type,
      data: assessment.data,
      verificationStatus: assessment.verificationStatus,
    };
  }
  
  static anonymizeResponse(response: any): any {
    return {
      ...response,
      responderName: this.hashString(response.responderName),
      responderId: this.hashString(response.responderId),
      donorName: response.donorName ? this.hashString(response.donorName) : null,
      // Keep operational data
      affectedEntityId: response.affectedEntityId,
      responseType: response.responseType,
      data: response.data,
      status: response.status,
    };
  }
  
  private static hashString(input: string): string {
    // One-way hash for consistency in reports
    const hash = crypto.createHash('sha256');
    hash.update(input + process.env.ANONYMIZATION\_SALT);
    return hash.digest('hex').substring(0, 8);
  }
}

// Audit logging
export class AuditLogger {
  static async log(action: string, entityType: string, entityId: string, userId: string, metadata?: any) {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        userId,
        metadata: metadata || {},
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        timestamp: new Date(),
      },
    });
  }
}
```

---

## 12\. Deployment Architecture

### LLM Implementation Notes

Deployment is optimized for serverless with fallback to containerized deployment. Use environment variables for all configuration.

### Infrastructure Overview

```mermaid
graph TB
    subgraph "Production Environment"
        subgraph "Edge Network"
            CF\[Cloudflare CDN]
            WAF\[Web Application Firewall]
        end
        
        subgraph "Vercel Platform"
            NEXT\[Next.js Application]
            API\[API Routes]
            ISR\[ISR Cache]
        end
        
        subgraph "AWS Infrastructure"
            RDS\[(PostgreSQL RDS)]
            REDIS\[(ElastiCache Redis)]
            S3\[S3 Media Storage]
            SQS\[SQS Queue]
            LAMBDA\[Lambda Functions]
        end
        
        subgraph "Monitoring"
            SENTRY\[Sentry]
            DD\[Datadog]
            CW\[CloudWatch]
        end
    end
    
    CF --> WAF
    WAF --> NEXT
    NEXT --> API
    API --> RDS
    API --> REDIS
    API --> S3
    API --> SQS
    SQS --> LAMBDA
    NEXT --> SENTRY
    RDS --> CW
    REDIS --> DD
```

### Environment Configuration

```bash
# .env.production
# LLM Note: All sensitive values should be stored in Vercel/AWS Secrets Manager

# Database
DATABASE\_URL="postgresql://user:password@host:5432/disaster\_mgmt?schema=public\&connection\_limit=5"
DATABASE\_POOL\_SIZE=10

# Redis
REDIS\_HOST="elasticache-endpoint.aws.com"
REDIS\_PORT="6379"
REDIS\_PASSWORD="your-redis-password"

# Authentication
NEXTAUTH\_URL="https://yourdomain.com"
NEXTAUTH\_SECRET="generated-secret-min-32-chars"
JWT\_SECRET="separate-jwt-secret"

# AWS Services
AWS\_REGION="us-west-2"
AWS\_ACCESS\_KEY\_ID="AKIA..."
AWS\_SECRET\_ACCESS\_KEY="secret"
S3\_BUCKET="disaster-mgmt-media"
SQS\_QUEUE\_URL="https://sqs.region.amazonaws.com/account/queue"

# Monitoring
SENTRY\_DSN="https://key@sentry.io/project"
DATADOG\_API\_KEY="dd-api-key"

# Security
ENCRYPTION\_KEY="base64-encoded-256-bit-key"
ANONYMIZATION\_SALT="random-salt-for-hashing"

# API Rate Limiting
RATE\_LIMIT\_WINDOW="60000" # 1 minute in ms
RATE\_LIMIT\_MAX\_REQUESTS="100"

# Feature Flags
ENABLE\_AUTO\_VERIFICATION="true"
ENABLE\_DONOR\_FEATURES="false"
MAINTENANCE\_MODE="false"
```

### Deployment Configuration

```yaml
# vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "regions": \["iad1", "lhr1", "syd1"],
  "functions": {
    "app/api/v1/sync/push/route.ts": {
      "maxDuration": 30
    },
    "app/api/v1/assessments/batch/route.ts": {
      "maxDuration": 30
    }
  },
  "headers": \[
    {
      "source": "/api/(.\*)",
      "headers": \[
        {
          "key": "Cache-Control",
          "value": "no-store, max-age=0"
        }
      ]
    },
    {
      "source": "/(.\*)",
      "headers": \[
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "rewrites": \[
    {
      "source": "/api/:path\*",
      "destination": "/api/:path\*"
    }
  ]
}
```

### Docker Configuration (Alternative Deployment)

```dockerfile
# Dockerfile
# LLM Note: For self-hosted or AWS ECS deployment

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node\_modules ./node\_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
ENV NEXT\_TELEMETRY\_DISABLED 1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE\_ENV production
ENV NEXT\_TELEMETRY\_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD \["node", "server.js"]
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
# LLM Note: GitHub Actions for automated deployment

name: Deploy to Production

on:
  push:
    branches: \[main]
  pull\_request:
    branches: \[main]

env:
  DATABASE\_URL: ${{ secrets.DATABASE\_URL }}
  NEXTAUTH\_SECRET: ${{ secrets.NEXTAUTH\_SECRET }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run linting
        run: npm run lint
      
      - name: Run tests
        run: npm run test
      
      - name: Run E2E tests
        run: npm run test:e2e
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL\_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL\_ORG\_ID }}
          vercel-project-id: ${{ secrets.VERCEL\_PROJECT\_ID }}
          vercel-args: '--prod'
      
      - name: Run database migrations
        run: |
          npx prisma migrate deploy
        env:
          DATABASE\_URL: ${{ secrets.DATABASE\_URL }}
      
      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment completed'
        if: always()
```

### Monitoring \& Observability

```typescript
// lib/monitoring/index.ts
// LLM Note: Centralized monitoring setup

import \* as Sentry from '@sentry/nextjs';
import { StatsD } from 'hot-shots';

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY\_DSN,
  environment: process.env.NODE\_ENV,
  tracesSampleRate: process.env.NODE\_ENV === 'production' ? 0.1 : 1.0,
  integrations: \[
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  beforeSend(event, hint) {
    // Filter out sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  },
});

// Initialize StatsD for metrics
const statsd = new StatsD({
  host: process.env.DATADOG\_HOST || 'localhost',
  port: 8125,
  prefix: 'disaster\_mgmt.',
});

// Custom metrics
export const metrics = {
  assessmentCreated: () => statsd.increment('assessment.created'),
  syncCompleted: (duration: number) => statsd.timing('sync.duration', duration),
  verificationProcessed: (autoVerified: boolean) => {
    statsd.increment(`verification.${autoVerified ? 'auto' : 'manual'}`);
  },
  offlineQueueSize: (size: number) => statsd.gauge('offline.queue.size', size),
  apiLatency: (endpoint: string, duration: number) => {
    statsd.timing(`api.latency.${endpoint}`, duration);
  },
};

// Health check endpoint
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, boolean>;
}> {
  const checks = {
    database: false,
    redis: false,
    storage: false,
  };
  
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }
  
  try {
    // Check Redis
    await redis.ping();
    checks.redis = true;
  } catch (error) {
    console.error('Redis health check failed:', error);
  }
  
  try {
    // Check S3
    await s3.headBucket({ Bucket: process.env.S3\_BUCKET }).promise();
    checks.storage = true;
  } catch (error) {
    console.error('S3 health check failed:', error);
  }
  
  const healthyCount = Object.values(checks).filter(Boolean).length;
  const status = healthyCount === 3 ? 'healthy' : 
                 healthyCount > 0 ? 'degraded' : 'unhealthy';
  
  return { status, checks };
}
```

---

## 13\. Development Guidelines for LLM-Driven Development

### Code Generation Rules for Claude Code

1. **Always Use TypeScript** - Never generate JavaScript files
2. **Explicit Types** - Define all function parameters and return types
3. **Error Handling** - Wrap all async operations in try-catch
4. **Null Checks** - Always check for null/undefined before access
5. **Exhaustive Switches** - All switch statements must have default case
6. **Consistent Naming** - camelCase for variables, PascalCase for types/components
7. **Comment Complex Logic** - Add explanatory comments for algorithms
8. **Test Everything** - Generate tests alongside implementation

### File Creation Order

When implementing features, create files in this specific order:

1. **Database Schema** (`prisma/schema.prisma`)
2. **Type Definitions** (`shared/types/\*.ts`)
3. **API Routes** (`app/api/v1/\*/route.ts`)
4. **State Stores** (`stores/\*.store.ts`)
5. **Custom Hooks** (`hooks/\*.ts`)
6. **Components** (`components/features/\*/`)
7. **Pages** (`app/(group)/page.tsx`)
8. **Tests** (`\_\_tests\_\_/\*`)

### Component Implementation Pattern

```typescript
// LLM Instruction: Follow this exact pattern for all components

// 1. Imports (grouped and ordered)
import { FC, useState, useEffect } from 'react'; // React
import { useRouter } from 'next/navigation'; // Next.js
import { Button } from '@/components/ui/button'; // UI components
import { useAuthStore } from '@/stores/auth.store'; // Stores
import { api } from '@/lib/api'; // Utilities
import type { Assessment } from '@/shared/types'; // Types

// 2. Interface definitions
interface ComponentProps {
  required: string;
  optional?: number;
  children?: React.ReactNode;
}

// 3. Component implementation
export const ComponentName: FC<ComponentProps> = ({
  required,
  optional = 0,
  children,
}) => {
  // 4. Hooks first
  const router = useRouter();
  const { user } = useAuthStore();
  
  // 5. State
  const \[loading, setLoading] = useState(false);
  
  // 6. Effects
  useEffect(() => {
    // Effect logic
  }, \[/\* dependencies \*/]);
  
  // 7. Handlers
  const handleClick = async () => {
    try {
      setLoading(true);
      // Handler logic
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 8. Render
  return (
    <div>
      {/\* JSX \*/}
    </div>
  );
};
```

### API Route Pattern

```typescript
// LLM Instruction: All API routes must follow this pattern

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { withMiddleware } from '@/lib/middleware';

// Schema definition
const RequestSchema = z.object({
  field: z.string(),
});

// GET handler
export async function GET(request: NextRequest) {
  return withMiddleware(request, async (req, ctx) => {
    // Implementation
    return NextResponse.json({ data: result });
  });
}

// POST handler
export async function POST(request: NextRequest) {
  return withMiddleware(request, async (req, ctx) => {
    const body = await request.json();
    const validated = RequestSchema.parse(body);
    // Implementation
    return NextResponse.json({ data: result }, { status: 201 });
  });
}
```

---

## 14\. Testing Strategy

### LLM Testing Implementation Guide

```typescript
// \_\_tests\_\_/components/AssessmentForm.test.tsx
// LLM Note: Test pattern for components

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssessmentForm } from '@/components/features/assessment/AssessmentForm';
import { useOfflineStore } from '@/stores/offline.store';

// Mock stores
jest.mock('@/stores/offline.store');

describe('AssessmentForm', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });
  
  it('should render form fields', () => {
    render(<AssessmentForm type="HEALTH" entityId="123" />);
    
    expect(screen.getByRole('form')).toBeInTheDocument();
  });
  
  it('should queue assessment when offline', async () => {
    const mockQueue = jest.fn();
    (useOfflineStore as jest.Mock).mockReturnValue({
      isOffline: true,
      queueAssessment: mockQueue,
    });
    
    render(<AssessmentForm type="HEALTH" entityId="123" />);
    
    fireEvent.submit(screen.getByRole('form'));
    
    await waitFor(() => {
      expect(mockQueue).toHaveBeenCalled();
    });
  });
});
```

---

## 15\. Next Steps \& Implementation Order

### Phase 1: Foundation (Weeks 1-2)

1. ✅ Set up Next.js project with TypeScript
2. ✅ Configure Prisma and create database schema
3. ✅ Implement authentication with NextAuth.js
4. ✅ Set up offline storage with Dexie.js
5. ✅ Configure PWA with service worker

### Phase 2: Core Features (Weeks 3-6)

1. ⬜ Implement assessment forms (all 6 types)
2. ⬜ Build offline queue management
3. ⬜ Create sync engine
4. ⬜ Implement verification workflows
5. ⬜ Build response documentation

### Phase 3: Advanced Features (Weeks 7-8)

1. ⬜ Auto-verification rules engine
2. ⬜ Conflict resolution UI
3. ⬜ Monitoring dashboards
4. ⬜ Donor management system
5. ⬜ Performance optimization

### Phase 4: Deployment (Week 9)

1. ⬜ Production environment setup
2. ⬜ Security audit
3. ⬜ Load testing
4. ⬜ User training materials
5. ⬜ Go-live preparation

---

## Architecture Review Checklist

Run this checklist before implementation:

* \[ ] All entities have TypeScript interfaces defined
* \[ ] API endpoints follow RESTful conventions
* \[ ] Offline-first patterns implemented throughout
* \[ ] Security measures in place at all layers
* \[ ] Error handling comprehensive
* \[ ] Monitoring and logging configured
* \[ ] Database indexes optimized
* \[ ] PWA manifest complete
* \[ ] Service worker strategies defined
* \[ ] Environment variables documented
* \[ ] CI/CD pipeline configured
* \[ ] Testing strategy implemented
* \[ ] Documentation complete

---

