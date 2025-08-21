# 2\. Tech Stack

The technology stack balances stability with modern capabilities, optimizing for offline-first PWA requirements while maintaining developer productivity.

## Frontend Stack

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

## Backend Stack

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

## Infrastructure \& DevOps

| Category | Technology | Purpose |
|----------|------------|---------|
| Deployment | Vercel / AWS | Serverless deployment, global CDN |
| Container | Docker | Local development, consistent environments |
| CI/CD | GitHub Actions | Automated testing and deployment |
| Monitoring | Datadog / CloudWatch | Performance and uptime monitoring |
| Backup | AWS Backup | Automated database backups |

---
