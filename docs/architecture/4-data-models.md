# 4\. Data Models

## LLM Development Notes

All models use TypeScript interfaces for type safety. These interfaces are shared between frontend and backend through a `shared/types` directory. Prisma generates matching types from the schema, ensuring consistency.

## Core Entity Interfaces

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

## LLM Implementation Guidance

**Type Generation Strategy:**

1. Prisma schema is source of truth for database structure
2. Use `prisma generate` to create database types
3. Share domain types through `shared/types` directory
4. Use Zod schemas for runtime validation matching TypeScript types

---
