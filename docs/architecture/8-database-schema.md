# 8\. Database Schema

## LLM Development Notes

Prisma schema is the source of truth. Run `npx prisma generate` after any schema changes. Use `npx prisma migrate dev` for development migrations.

## Prisma Schema Definition

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

## Database Migration Strategy for LLM Development

```bash