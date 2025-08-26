// shared/types/entities.ts

import { ApiResponse } from './api';

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
  // Story 2.5: Status Review Extensions
  feedbackCount?: number; // Computed field for UI efficiency
  lastFeedbackAt?: Date;  // Quick access for sorting/filtering
  requiresAttention: boolean; // Computed from feedback + verification status
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

// Story 2.5: Response Status Review Types

// Generic Feedback Interface (replaces CoordinatorFeedback)
export interface Feedback {
  id: string;
  targetType: 'ASSESSMENT' | 'RESPONSE';
  targetId: string; // assessmentId or responseId
  coordinatorId: string;
  coordinatorName: string;
  feedbackType: 'REJECTION' | 'CLARIFICATION_REQUEST' | 'APPROVAL_NOTE';
  reason: 'DATA_QUALITY' | 'MISSING_INFO' | 'VALIDATION_ERROR' | 'INSUFFICIENT_EVIDENCE' | 'OTHER';
  comments: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  requiresResponse: boolean;
  createdAt: Date;
  isRead: boolean;
  isResolved: boolean;
  resolvedAt?: Date;
}

// Resubmission Tracking System
export interface ResubmissionLog {
  id: string;
  responseId: string;
  version: number; // 1, 2, 3...
  previousVersion: number;
  resubmittedBy: string;
  resubmittedAt: Date;
  changesDescription: string;
  addressedFeedbackIds: string[];
  dataChanges: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

// Story 3.1: Assessment Verification Dashboard Types

// Assessment Verification Queue Data Structure
export interface AssessmentVerificationQueueItem {
  assessment: RapidAssessment;
  affectedEntity: AffectedEntity;
  assessorName: string;
  feedbackCount: number;
  lastFeedbackAt?: Date;
  requiresAttention: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

// Response Verification Queue Data Structure
export interface ResponseVerificationQueueItem {
  response: RapidResponse;
  affectedEntity: AffectedEntity;
  responderName: string;
  feedbackCount: number;
  lastFeedbackAt?: Date;
  requiresAttention: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface BatchVerificationRequest {
  assessmentIds: string[];
  action: 'APPROVE' | 'REJECT';
  feedback?: {
    reason: 'DATA_QUALITY' | 'MISSING_INFO' | 'VALIDATION_ERROR' | 'INSUFFICIENT_EVIDENCE' | 'OTHER';
    comments: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  };
}

export interface VerificationQueueFilters {
  assessmentTypes?: AssessmentType[];
  verificationStatus?: VerificationStatus[];
  dateRange?: { start: Date; end: Date };
  priority?: ('HIGH' | 'MEDIUM' | 'LOW')[];
  assessorIds?: string[];
}

// Response Verification Queue Filters
export interface ResponseVerificationQueueFilters {
  responseTypes?: ResponseType[];
  verificationStatus?: VerificationStatus[];
  deliveryStatus?: ResponseStatus[];
  dateRange?: { start: Date; end: Date };
  priority?: ('HIGH' | 'MEDIUM' | 'LOW')[];
  responderIds?: string[];
}

// Verification Queue Request/Response Types
export interface VerificationQueueRequest {
  page?: number;
  pageSize?: number;
  sortBy?: 'priority' | 'date' | 'type' | 'assessor';
  sortOrder?: 'asc' | 'desc';
  filters?: VerificationQueueFilters;
}

// Response Verification Queue Request/Response Types
export interface ResponseVerificationQueueRequest {
  page?: number;
  pageSize?: number;
  sortBy?: 'priority' | 'date' | 'type' | 'responder';
  sortOrder?: 'asc' | 'desc';
  filters?: ResponseVerificationQueueFilters;
}

export interface VerificationQueueResponse {
  success: boolean;
  data: {
    queue: AssessmentVerificationQueueItem[];
    queueStats: {
      totalPending: number;
      highPriority: number;
      requiresAttention: number;
      byAssessmentType: Record<AssessmentType, number>;
    };
    pagination: {
      page: number;
      pageSize: number;
      totalPages: number;
      totalCount: number;
    };
  };
  error?: string;
}

export interface ResponseVerificationQueueResponse {
  success: boolean;
  data: {
    queue: ResponseVerificationQueueItem[];
    queueStats: {
      totalPending: number;
      highPriority: number;
      requiresAttention: number;
      byResponseType: Record<ResponseType, number>;
    };
    pagination: {
      page: number;
      pageSize: number;
      totalPages: number;
      totalCount: number;
    };
  };
  error?: string;
}

export interface BatchVerificationResponse {
  success: boolean;
  data: {
    processed: number;
    successful: number;
    failed: number;
    errors: { assessmentId: string; error: string }[];
  };
  error?: string;
}

// Story 3.2: Assessment Approval/Rejection Types

// Assessment Approval Request
export interface AssessmentApprovalRequest {
  assessmentId: string;
  coordinatorId: string;
  coordinatorName: string;
  approvalNote?: string;
  approvalTimestamp: Date;
  notifyAssessor: boolean;
}

// Assessment Rejection Request
export interface AssessmentRejectionRequest {
  assessmentId: string;
  coordinatorId: string;
  coordinatorName: string;
  rejectionReason: 'DATA_QUALITY' | 'MISSING_INFO' | 'VALIDATION_ERROR' | 'INSUFFICIENT_EVIDENCE' | 'OTHER';
  rejectionComments: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  requiresResubmission: boolean;
  notifyAssessor: boolean;
  rejectionTimestamp: Date;
}

// Batch Approval/Rejection Operations
export interface BatchApprovalRequest {
  assessmentIds: string[];
  coordinatorId: string;
  coordinatorName: string;
  batchNote?: string;
  notifyAssessors: boolean;
}

export interface BatchRejectionRequest {
  assessmentIds: string[];
  coordinatorId: string;
  coordinatorName: string;
  rejectionReason: 'DATA_QUALITY' | 'MISSING_INFO' | 'VALIDATION_ERROR' | 'INSUFFICIENT_EVIDENCE' | 'OTHER';
  rejectionComments: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  notifyAssessors: boolean;
}

// Response Approval/Rejection Requests
export interface ResponseApprovalRequest {
  responseId: string;
  coordinatorId: string;
  coordinatorName: string;
  approvalNote?: string;
  approvalTimestamp: Date;
  notifyResponder: boolean;
}

export interface ResponseRejectionRequest {
  responseId: string;
  coordinatorId: string;
  coordinatorName: string;
  rejectionReason: 'DATA_QUALITY' | 'MISSING_INFO' | 'VALIDATION_ERROR' | 'INSUFFICIENT_EVIDENCE' | 'OTHER';
  rejectionComments: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  requiresResubmission: boolean;
  notifyResponder: boolean;
  rejectionTimestamp: Date;
}

// Batch Response Approval/Rejection Operations
export interface BatchResponseApprovalRequest {
  responseIds: string[];
  coordinatorId: string;
  coordinatorName: string;
  batchNote?: string;
  notifyResponders: boolean;
}

export interface BatchResponseRejectionRequest {
  responseIds: string[];
  coordinatorId: string;
  coordinatorName: string;
  rejectionReason: 'DATA_QUALITY' | 'MISSING_INFO' | 'VALIDATION_ERROR' | 'INSUFFICIENT_EVIDENCE' | 'OTHER';
  rejectionComments: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  notifyResponders: boolean;
}

// Story 3.4: Auto-Approval Configuration Data Structures

export interface AutoApprovalRule {
  id: string;
  type: 'ASSESSMENT' | 'RESPONSE';
  assessmentType?: AssessmentType;
  responseType?: ResponseType;
  enabled: boolean;
  qualityThresholds: QualityThreshold;
  conditions: AutoApprovalCondition[];
  priority: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QualityThreshold {
  dataCompletenessPercentage: number;
  requiredFieldsComplete: boolean;
  hasMediaAttachments?: boolean;
  gpsAccuracyMeters?: number;
  assessorReputationScore?: number;
  timeSinceSubmission?: number;
  maxBatchSize?: number;
}

export interface AutoApprovalCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists';
  value: any;
  weight: number;
}

export interface AutoApprovalConfig {
  enabled: boolean;
  rules: AutoApprovalRule[];
  globalSettings: {
    maxAutoApprovalsPerHour: number;
    requireCoordinatorOnline: boolean;
    emergencyOverrideEnabled: boolean;
    auditLogRetentionDays: number;
  };
  coordinatorId: string;
  lastUpdated: Date;
}

export interface AutoApprovalOverride {
  id: string;
  targetType: 'ASSESSMENT' | 'RESPONSE';
  targetId: string;
  originalStatus: VerificationStatus;
  newStatus: VerificationStatus;
  reason: 'EMERGENCY_OVERRIDE' | 'QUALITY_CONCERN' | 'POLICY_CHANGE' | 'OTHER';
  reasonDetails: string;
  coordinatorId: string;
  coordinatorName: string;
  overriddenAt: Date;
  ruleId?: string;
}

export interface AutoApprovalRulesRequest {
  rules: AutoApprovalRule[];
  globalSettings: AutoApprovalConfig['globalSettings'];
}

export interface AutoApprovalRulesResponse extends ApiResponse<{
  rulesCreated: number;
  rulesUpdated: number;
  configId: string;
  config?: AutoApprovalConfig;
  validationErrors?: string[];
}> {}

export interface AutoApprovalOverrideRequest {
  targetType: 'ASSESSMENT' | 'RESPONSE';
  targetIds: string[];
  newStatus: 'PENDING' | 'REJECTED';
  reason: string;
  reasonDetails: string;
  coordinatorId: string;
}

export interface AutoApprovalStatsResponse extends ApiResponse<{
  totalAutoApproved: number;
  autoApprovalRate: number;
  averageProcessingTime: number;
  rulePerformance: {
    ruleId: string;
    applicationsCount: number;
    successRate: number;
  }[];
  overridesCount: number;
  timeRange: string;
}> {}