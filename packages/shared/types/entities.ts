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
  preliminaryAssessmentIds: string[];
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
  mediaAttachments: MediaAttachment[];
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
  deliveryEvidence: MediaAttachment[];
  partialDeliveryData?: PartialDeliveryData; // New field for partial delivery tracking
  deliveryDocumentation?: DeliveryDocumentation; // New field for completion docs
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
  EARTHQUAKE = 'EARTHQUAKE',
  WILDFIRE = 'WILDFIRE',
  OTHER = 'OTHER'
}

export enum IncidentSubType {
  // Flood subtypes
  FLASH_FLOOD = 'FLASH_FLOOD',
  RIVER_FLOOD = 'RIVER_FLOOD',
  COASTAL_FLOOD = 'COASTAL_FLOOD',
  URBAN_FLOOD = 'URBAN_FLOOD',
  // Fire subtypes
  WILDFIRE = 'WILDFIRE',
  STRUCTURAL_FIRE = 'STRUCTURAL_FIRE',
  // Other subtypes can be added as needed
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
  POPULATION = 'POPULATION',
  PRELIMINARY = 'PRELIMINARY'
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  AUTO_VERIFIED = 'AUTO_VERIFIED',
  REJECTED = 'REJECTED'
}

export enum SyncStatus {
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  CONFLICT = 'CONFLICT',
  FAILED = 'FAILED'
}

export enum ResponseType {
  HEALTH = 'HEALTH',
  WASH = 'WASH',
  SHELTER = 'SHELTER',
  FOOD = 'FOOD',
  SECURITY = 'SECURITY',
  POPULATION = 'POPULATION'
}

export enum ResponseStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
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
  | PopulationAssessmentData
  | PreliminaryAssessmentData;

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

export interface PreliminaryAssessmentData {
  incidentType: IncidentType;
  incidentSubType?: string;
  severity: IncidentSeverity;
  affectedPopulationEstimate: number;
  affectedHouseholdsEstimate: number;
  immediateNeedsDescription: string;
  accessibilityStatus: 'ACCESSIBLE' | 'PARTIALLY_ACCESSIBLE' | 'INACCESSIBLE';
  priorityLevel: 'HIGH' | 'NORMAL' | 'LOW';
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
  patientsTreated: number;
  additionalDetails?: string;
}

export interface WashResponseData {
  waterDeliveredLiters: number;
  waterContainersDistributed: number;
  toiletsConstructed: number;
  hygieneKitsDistributed: number;
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

// User and Role Models
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  organization?: string;
  roles: UserRole[];
  activeRole: UserRole;
  permissions: Permission[];
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  id: string;
  name: 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN';
  permissions: Permission[];
  isActive: boolean;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

// Offline Queue Management
export interface OfflineQueueItem {
  id: string; // Local UUID
  type: 'ASSESSMENT' | 'RESPONSE' | 'MEDIA' | 'INCIDENT' | 'ENTITY';
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
  captureMethod: 'GPS' | 'MANUAL' | 'MAP_SELECT';
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

export interface CoordinatorFeedback {
  id: string;
  assessmentId: string;
  coordinatorId: string;
  coordinatorName: string;
  reason: 'DATA_QUALITY' | 'MISSING_INFO' | 'VALIDATION_ERROR' | 'OTHER';
  comments: string;
  createdAt: Date;
  isRead: boolean;
}

// Response Planning Types
export interface ResponsePlanDraft {
  id: string; // Local UUID for draft
  responseType: ResponseType;
  affectedEntityId: string;
  assessmentId?: string;
  plannedDate: Date;
  estimatedDeliveryTime?: number; // minutes
  travelTimeToLocation?: number; // minutes
  data: Partial<ResponseData>; // Will be typed based on response type
  otherItemsDelivered: { item: string; quantity: number; unit: string }[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemTemplate {
  id: string;
  responseType: ResponseType;
  name: string;
  category: string;
  defaultUnit: string;
  suggestedQuantities?: number[];
}

export interface DeliveryTimeline {
  plannedDate: Date;
  estimatedTravelTime?: number; // minutes
  estimatedDeliveryDuration?: number; // minutes
  contingencyBuffer?: number; // minutes
  dependencies?: string[]; // IDs of other responses this depends on
  notes?: string;
}

// Delivery Conversion Types
export interface DeliveryConversion {
  originalPlanId: string;
  conversionTimestamp: Date;
  deliveryTimestamp: Date;
  deliveryLocation: GPSCoordinates;
  actualItemsDelivered: ActualVsPlannedItem[];
  beneficiariesServed: number;
  deliveryNotes?: string;
  challenges?: string;
  completionPercentage: number;
  deliveryEvidence: MediaAttachment[];
}

export interface ActualVsPlannedItem {
  item: string;
  plannedQuantity: number;
  actualQuantity: number;
  unit: string;
  variationReason?: string;
  variationPercentage: number;
}

export interface ResponseConversionRequest {
  deliveryTimestamp: Date;
  deliveryLocation: GPSCoordinates;
  actualData: ResponseData;
  actualItemsDelivered: { item: string; quantity: number; unit: string }[];
  deliveryEvidence: MediaAttachment[];
  beneficiariesServed: number;
  deliveryNotes?: string;
  challenges?: string;
}

export interface ResponseConversionResponse {
  data: RapidResponse;
  conversionLog: {
    convertedAt: Date;
    convertedBy: string;
    originalStatus: ResponseStatus;
    newStatus: ResponseStatus;
    dataChanges: string[];
  };
}

export interface ResponsePlanRequest {
  responseType: ResponseType;
  affectedEntityId: string;
  assessmentId?: string;
  plannedDate: Date;
  data: ResponseData;
  otherItemsDelivered: { item: string; quantity: number; unit: string }[];
  notes?: string;
}

export interface ResponsePlansResponse {
  data: RapidResponse[];
  meta: {
    totalCount: number;
    plannedCount: number;
    inProgressCount: number;
    deliveredCount: number;
  };
}

// Partial Delivery Tracking Types
export interface PartialDeliveryData {
  deliveryId: string;
  totalPercentageComplete: number;
  itemCompletionTracking: ItemCompletionData[];
  reasonCodes: DeliveryReasonCode[];
  followUpRequired: boolean;
  followUpTasks: FollowUpTask[];
  partialDeliveryTimestamp: Date;
  estimatedCompletionDate?: Date;
}

export interface ItemCompletionData {
  item: string;
  plannedQuantity: number;
  deliveredQuantity: number;
  remainingQuantity: number;
  percentageComplete: number;
  unit: string;
  reasonCodes: string[];
  followUpRequired: boolean;
}

export interface DeliveryReasonCode {
  code: string;
  category: 'SUPPLY_SHORTAGE' | 'ACCESS_LIMITATION' | 'SECURITY_ISSUE' | 'WEATHER_DELAY' | 'LOGISTICS_CHALLENGE' | 'BENEFICIARY_UNAVAILABLE' | 'OTHER';
  description: string;
  appliesTo: string[]; // Item names this reason applies to
}

export interface FollowUpTask {
  id: string;
  type: 'COMPLETE_DELIVERY' | 'SUPPLY_PROCUREMENT' | 'ACCESS_NEGOTIATION' | 'SECURITY_CLEARANCE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedDate: Date;
  assignedTo?: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

// Partial Delivery API Request/Response Types
export interface PartialDeliveryUpdateRequest {
  itemCompletionTracking: ItemCompletionData[];
  reasonCodes: DeliveryReasonCode[];
  partialDeliveryTimestamp: Date;
  estimatedCompletionDate?: Date;
  followUpTasks: Omit<FollowUpTask, 'id' | 'status'>[];
}

export interface PartialDeliveryResponse {
  data: RapidResponse;
  trackingMetrics: {
    totalPercentageComplete: number;
    itemsFullyDelivered: number;
    itemsPartiallyDelivered: number;
    itemsPending: number;
    followUpTasksGenerated: number;
  };
}

// Delivery Documentation Types (Story 2.4)
export interface DeliveryDocumentation {
  documentationId: string;
  completionTimestamp: Date;
  deliveryLocation: GPSCoordinates;
  beneficiaryVerification: BeneficiaryVerificationData;
  deliveryNotes: string;
  deliveryConditions: DeliveryCondition[];
  witnessDetails?: WitnessInformation;
  deliveryCompletionStatus: 'FULL' | 'PARTIAL' | 'CANCELLED';
  followUpRequired: boolean;
}

export interface BeneficiaryVerificationData {
  verificationMethod: 'SIGNATURE' | 'THUMBPRINT' | 'PHOTO' | 'VERBAL_CONFIRMATION';
  totalBeneficiariesServed: number;
  householdsServed: number;
  individualsServed: number;
  demographicBreakdown: {
    male: number;
    female: number;
    children: number;
    elderly: number;
    pwD: number; // Persons with Disabilities
  };
  verificationEvidence?: MediaAttachment[];
  verificationTimestamp: Date;
  verificationLocation: GPSCoordinates;
}

export interface DeliveryCondition {
  conditionType: 'WEATHER' | 'SECURITY' | 'ACCESS' | 'INFRASTRUCTURE' | 'OTHER';
  description: string;
  severity: 'MINOR' | 'MODERATE' | 'SEVERE';
  impactOnDelivery: boolean;
}

export interface WitnessInformation {
  witnessName: string;
  witnessRole: string;
  witnessOrganization?: string;
  witnessContact?: string;
  witnessSignature?: MediaAttachment;
}

// Delivery Documentation API Types
export interface DeliveryDocumentationRequest {
  deliveryLocation: GPSCoordinates;
  beneficiaryVerification: BeneficiaryVerificationData;
  deliveryNotes: string;
  deliveryConditions: DeliveryCondition[];
  witnessDetails?: WitnessInformation;
  deliveryEvidence: MediaAttachment[];
  completionTimestamp: Date;
}

export interface DeliveryDocumentationResponse {
  data: RapidResponse;
  documentationMetrics: {
    totalBeneficiariesReached: number;
    documentationCompleteness: number; // Percentage
    evidencePhotoCount: number;
    verificationMethodUsed: string;
    deliveryCompletionTime: Date;
  };
}