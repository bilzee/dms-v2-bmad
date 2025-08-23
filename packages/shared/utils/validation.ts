import { z } from 'zod';

// Base validation schemas
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number');

// Enum schemas
export const AssessmentTypeSchema = z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION', 'PRELIMINARY']);
export const VerificationStatusSchema = z.enum(['PENDING', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED']);
export const SyncStatusSchema = z.enum(['PENDING', 'SYNCING', 'SYNCED', 'CONFLICT', 'FAILED']);
export const IncidentTypeSchema = z.enum(['FLOOD', 'FIRE', 'LANDSLIDE', 'CYCLONE', 'CONFLICT', 'EPIDEMIC', 'EARTHQUAKE', 'WILDFIRE', 'OTHER']);
export const IncidentSeveritySchema = z.enum(['MINOR', 'MODERATE', 'SEVERE', 'CATASTROPHIC']);

// GPS Coordinates schema
export const GPSCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  timestamp: z.date(),
  captureMethod: z.enum(['GPS', 'MANUAL', 'MAP_SELECT']),
});

// Media attachment schema
export const MediaAttachmentSchema = z.object({
  id: uuidSchema,
  url: z.string().url().optional(),
  localPath: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  mimeType: z.string(),
  size: z.number().positive(),
  metadata: z.object({
    gpsCoordinates: GPSCoordinatesSchema.optional(),
    timestamp: z.date(),
  }).optional(),
});

// Assessment data schemas
export const HealthAssessmentDataSchema = z.object({
  hasFunctionalClinic: z.boolean(),
  numberHealthFacilities: z.number().int().min(0),
  healthFacilityType: z.string().min(1),
  qualifiedHealthWorkers: z.number().int().min(0),
  hasMedicineSupply: z.boolean(),
  hasMedicalSupplies: z.boolean(),
  hasMaternalChildServices: z.boolean(),
  commonHealthIssues: z.array(z.string()),
  additionalDetails: z.string().optional(),
});

export const WashAssessmentDataSchema = z.object({
  isWaterSufficient: z.boolean(),
  waterSource: z.array(z.string()),
  waterQuality: z.enum(['Safe', 'Contaminated', 'Unknown']),
  hasToilets: z.boolean(),
  numberToilets: z.number().int().min(0),
  toiletType: z.string().min(1),
  hasSolidWasteDisposal: z.boolean(),
  hasHandwashingFacilities: z.boolean(),
  additionalDetails: z.string().optional(),
});

export const ShelterAssessmentDataSchema = z.object({
  areSheltersSufficient: z.boolean(),
  shelterTypes: z.array(z.string()),
  numberShelters: z.number().int().min(0),
  shelterCondition: z.enum(['Good', 'Fair', 'Poor', 'Critical']),
  needsRepair: z.boolean(),
  needsTarpaulin: z.boolean(),
  needsBedding: z.boolean(),
  additionalDetails: z.string().optional(),
});

export const FoodAssessmentDataSchema = z.object({
  foodSource: z.array(z.string()),
  availableFoodDurationDays: z.number().int().min(0),
  additionalFoodRequiredPersons: z.number().int().min(0),
  additionalFoodRequiredHouseholds: z.number().int().min(0),
  malnutritionCases: z.number().int().min(0),
  feedingProgramExists: z.boolean(),
  additionalDetails: z.string().optional(),
});

export const SecurityAssessmentDataSchema = z.object({
  isAreaSecure: z.boolean(),
  securityThreats: z.array(z.string()),
  hasSecurityPresence: z.boolean(),
  securityProvider: z.string().min(1),
  incidentsReported: z.number().int().min(0),
  restrictedMovement: z.boolean(),
  additionalDetails: z.string().optional(),
});

export const PopulationAssessmentDataSchema = z.object({
  totalHouseholds: z.number().int().min(0),
  totalPopulation: z.number().int().min(0),
  populationMale: z.number().int().min(0),
  populationFemale: z.number().int().min(0),
  populationUnder5: z.number().int().min(0),
  pregnantWomen: z.number().int().min(0),
  lactatingMothers: z.number().int().min(0),
  personWithDisability: z.number().int().min(0),
  elderlyPersons: z.number().int().min(0),
  separatedChildren: z.number().int().min(0),
  numberLivesLost: z.number().int().min(0),
  numberInjured: z.number().int().min(0),
  additionalDetails: z.string().optional(),
});

export const PreliminaryAssessmentDataSchema = z.object({
  incidentType: IncidentTypeSchema,
  incidentSubType: z.string().optional(),
  severity: IncidentSeveritySchema,
  affectedPopulationEstimate: z.number().int().min(0),
  affectedHouseholdsEstimate: z.number().int().min(0),
  immediateNeedsDescription: z.string().min(1, 'Immediate needs description is required'),
  accessibilityStatus: z.enum(['ACCESSIBLE', 'PARTIALLY_ACCESSIBLE', 'INACCESSIBLE']),
  priorityLevel: z.enum(['HIGH', 'NORMAL', 'LOW']),
  additionalDetails: z.string().optional(),
});

// Union schema for assessment data
export const AssessmentDataSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('HEALTH'), data: HealthAssessmentDataSchema }),
  z.object({ type: z.literal('WASH'), data: WashAssessmentDataSchema }),
  z.object({ type: z.literal('SHELTER'), data: ShelterAssessmentDataSchema }),
  z.object({ type: z.literal('FOOD'), data: FoodAssessmentDataSchema }),
  z.object({ type: z.literal('SECURITY'), data: SecurityAssessmentDataSchema }),
  z.object({ type: z.literal('POPULATION'), data: PopulationAssessmentDataSchema }),
  z.object({ type: z.literal('PRELIMINARY'), data: PreliminaryAssessmentDataSchema }),
]);

// Main RapidAssessment schema
export const RapidAssessmentSchema = z.object({
  id: uuidSchema,
  type: AssessmentTypeSchema,
  date: z.date(),
  affectedEntityId: uuidSchema,
  assessorName: z.string().min(1),
  assessorId: uuidSchema,
  verificationStatus: VerificationStatusSchema,
  syncStatus: SyncStatusSchema,
  offlineId: z.string().optional(),
  data: z.union([
    HealthAssessmentDataSchema,
    WashAssessmentDataSchema,
    ShelterAssessmentDataSchema,
    FoodAssessmentDataSchema,
    SecurityAssessmentDataSchema,
    PopulationAssessmentDataSchema,
    PreliminaryAssessmentDataSchema,
  ]),
  mediaAttachments: z.array(MediaAttachmentSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Form validation schemas (for client-side form validation)
export const AssessmentFormSchema = z.object({
  type: AssessmentTypeSchema,
  affectedEntityId: uuidSchema,
  assessorName: z.string().min(1, 'Assessor name is required'),
  gpsCoordinates: GPSCoordinatesSchema.optional(),
  data: z.union([
    HealthAssessmentDataSchema,
    WashAssessmentDataSchema,
    ShelterAssessmentDataSchema,
    FoodAssessmentDataSchema,
    SecurityAssessmentDataSchema,
    PopulationAssessmentDataSchema,
    PreliminaryAssessmentDataSchema,
  ]),
  mediaAttachments: z.array(MediaAttachmentSchema).default([]),
});

// Preliminary assessment form schema
export const PreliminaryAssessmentFormSchema = z.object({
  type: z.literal('PRELIMINARY'),
  affectedEntityId: uuidSchema,
  assessorName: z.string().min(1, 'Assessor name is required'),
  gpsCoordinates: GPSCoordinatesSchema.optional(),
  data: PreliminaryAssessmentDataSchema,
  mediaAttachments: z.array(MediaAttachmentSchema).default([]),
});

// Type exports for use in components
export type AssessmentFormData = z.infer<typeof AssessmentFormSchema>;
export type HealthAssessmentFormData = z.infer<typeof HealthAssessmentDataSchema>;
export type WashAssessmentFormData = z.infer<typeof WashAssessmentDataSchema>;
export type ShelterAssessmentFormData = z.infer<typeof ShelterAssessmentDataSchema>;
export type FoodAssessmentFormData = z.infer<typeof FoodAssessmentDataSchema>;
export type SecurityAssessmentFormData = z.infer<typeof SecurityAssessmentDataSchema>;
export type PopulationAssessmentFormData = z.infer<typeof PopulationAssessmentDataSchema>;
export type PreliminaryAssessmentFormData = z.infer<typeof PreliminaryAssessmentDataSchema>;
export type PreliminaryAssessmentForm = z.infer<typeof PreliminaryAssessmentFormSchema>;

// Entity validation schemas
export const EntityTypeSchema = z.enum(['CAMP', 'COMMUNITY']);

export const CampDetailsSchema = z.object({
  campName: z.string().min(1, 'Camp name is required'),
  campStatus: z.enum(['OPEN', 'CLOSED']),
  campCoordinatorName: z.string().min(1, 'Camp coordinator name is required'),
  campCoordinatorPhone: phoneSchema,
  superviserName: z.string().optional(),
  superviserOrganization: z.string().optional(),
  estimatedPopulation: z.number().int().min(0).optional(),
});

export const CommunityDetailsSchema = z.object({
  communityName: z.string().min(1, 'Community name is required'),
  contactPersonName: z.string().min(1, 'Contact person name is required'),
  contactPersonPhone: phoneSchema,
  contactPersonRole: z.string().min(1, 'Contact person role is required'),
  estimatedHouseholds: z.number().int().min(0).optional(),
});

// Discriminated union for entity details based on type
export const AffectedEntitySchema = z.discriminatedUnion('type', [
  z.object({
    id: uuidSchema,
    type: z.literal('CAMP'),
    name: z.string().min(1, 'Entity name is required'),
    lga: z.string().min(1, 'LGA is required'),
    ward: z.string().min(1, 'Ward is required'),
    longitude: z.number().min(-180).max(180),
    latitude: z.number().min(-90).max(90),
    campDetails: CampDetailsSchema,
    communityDetails: z.undefined().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
  z.object({
    id: uuidSchema,
    type: z.literal('COMMUNITY'),
    name: z.string().min(1, 'Entity name is required'),
    lga: z.string().min(1, 'LGA is required'),
    ward: z.string().min(1, 'Ward is required'),
    longitude: z.number().min(-180).max(180),
    latitude: z.number().min(-90).max(90),
    campDetails: z.undefined().optional(),
    communityDetails: CommunityDetailsSchema,
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
]);

// Form validation schema for entity creation/editing
export const EntityManagementFormSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('CAMP'),
    name: z.string().min(1, 'Entity name is required'),
    lga: z.string().min(1, 'LGA is required'),
    ward: z.string().min(1, 'Ward is required'),
    longitude: z.number().min(-180).max(180),
    latitude: z.number().min(-90).max(90),
    gpsCoordinates: GPSCoordinatesSchema.optional(),
    campDetails: CampDetailsSchema,
  }),
  z.object({
    type: z.literal('COMMUNITY'),
    name: z.string().min(1, 'Entity name is required'),
    lga: z.string().min(1, 'LGA is required'),
    ward: z.string().min(1, 'Ward is required'),
    longitude: z.number().min(-180).max(180),
    latitude: z.number().min(-90).max(90),
    gpsCoordinates: GPSCoordinatesSchema.optional(),
    communityDetails: CommunityDetailsSchema,
  }),
]);

// Type exports for entity management
export type EntityFormData = z.infer<typeof EntityManagementFormSchema>;
export type CampFormData = z.infer<typeof CampDetailsSchema>;
export type CommunityFormData = z.infer<typeof CommunityDetailsSchema>;
export type AffectedEntityData = z.infer<typeof AffectedEntitySchema>;

// Response planning validation schemas
export const ResponseTypeSchema = z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION']);
export const ResponseStatusSchema = z.enum(['PLANNED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED']);

// Item schemas for response planning
export const ItemDeliverySchema = z.object({
  item: z.string().min(1, 'Item name is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unit: z.string().min(1, 'Unit is required'),
});

export const ItemTemplateSchema = z.object({
  id: z.string(),
  responseType: ResponseTypeSchema,
  name: z.string().min(1, 'Template name is required'),
  category: z.string().min(1, 'Category is required'),
  defaultUnit: z.string().min(1, 'Default unit is required'),
  suggestedQuantities: z.array(z.number().int().positive()).optional(),
});

// Response data schemas for planning
export const HealthResponseDataSchema = z.object({
  medicinesDelivered: z.array(ItemDeliverySchema),
  medicalSuppliesDelivered: z.array(z.object({
    name: z.string().min(1, 'Supply name is required'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  })),
  healthWorkersDeployed: z.number().int().min(0),
  patientsTreated: z.number().int().min(0),
  additionalDetails: z.string().optional(),
});

export const WashResponseDataSchema = z.object({
  waterDeliveredLiters: z.number().min(0),
  waterContainersDistributed: z.number().int().min(0),
  toiletsConstructed: z.number().int().min(0),
  hygieneKitsDistributed: z.number().int().min(0),
  additionalDetails: z.string().optional(),
});

export const ShelterResponseDataSchema = z.object({
  sheltersProvided: z.number().int().min(0),
  tarpaulinsDistributed: z.number().int().min(0),
  beddingKitsDistributed: z.number().int().min(0),
  repairsCompleted: z.number().int().min(0),
  additionalDetails: z.string().optional(),
});

export const FoodResponseDataSchema = z.object({
  foodItemsDelivered: z.array(ItemDeliverySchema),
  householdsServed: z.number().int().min(0),
  personsServed: z.number().int().min(0),
  nutritionSupplementsProvided: z.number().int().min(0),
  additionalDetails: z.string().optional(),
});

export const SecurityResponseDataSchema = z.object({
  securityPersonnelDeployed: z.number().int().min(0),
  checkpointsEstablished: z.number().int().min(0),
  patrolsCompleted: z.number().int().min(0),
  incidentsResolved: z.number().int().min(0),
  additionalDetails: z.string().optional(),
});

export const PopulationResponseDataSchema = z.object({
  evacuationsCompleted: z.number().int().min(0),
  familiesReunited: z.number().int().min(0),
  documentationProvided: z.number().int().min(0),
  referralsMade: z.number().int().min(0),
  additionalDetails: z.string().optional(),
});

// Response planning form schema
export const ResponsePlanFormSchema = z.object({
  responseType: ResponseTypeSchema,
  affectedEntityId: uuidSchema,
  assessmentId: uuidSchema.optional(),
  plannedDate: z.date().min(new Date(), 'Planned date cannot be in the past'),
  estimatedDeliveryTime: z.number().int().min(1).optional(),
  travelTimeToLocation: z.number().int().min(0).optional(),
  data: z.union([
    HealthResponseDataSchema,
    WashResponseDataSchema,
    ShelterResponseDataSchema,
    FoodResponseDataSchema,
    SecurityResponseDataSchema,
    PopulationResponseDataSchema,
  ]),
  otherItemsDelivered: z.array(ItemDeliverySchema).default([]),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

// Timeline planning schema
export const DeliveryTimelineSchema = z.object({
  plannedDate: z.date().min(new Date(), 'Planned date cannot be in the past'),
  estimatedTravelTime: z.number().int().min(0).optional(),
  estimatedDeliveryDuration: z.number().int().min(1).optional(),
  contingencyBuffer: z.number().int().min(0).optional(),
  dependencies: z.array(z.string()).optional(),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
});

// Response draft schema (for offline storage)
export const ResponsePlanDraftSchema = z.object({
  id: z.string(),
  responseType: ResponseTypeSchema,
  affectedEntityId: uuidSchema,
  assessmentId: uuidSchema.optional(),
  plannedDate: z.date(),
  estimatedDeliveryTime: z.number().int().min(1).optional(),
  travelTimeToLocation: z.number().int().min(0).optional(),
  data: z.union([
    HealthResponseDataSchema.partial(),
    WashResponseDataSchema.partial(),
    ShelterResponseDataSchema.partial(),
    FoodResponseDataSchema.partial(),
    SecurityResponseDataSchema.partial(),
    PopulationResponseDataSchema.partial(),
  ]).optional(),
  otherItemsDelivered: z.array(ItemDeliverySchema).default([]),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Type exports for response planning
export type ResponsePlanFormData = z.infer<typeof ResponsePlanFormSchema>;
export type HealthResponseFormData = z.infer<typeof HealthResponseDataSchema>;
export type WashResponseFormData = z.infer<typeof WashResponseDataSchema>;
export type ShelterResponseFormData = z.infer<typeof ShelterResponseDataSchema>;
export type FoodResponseFormData = z.infer<typeof FoodResponseDataSchema>;
export type SecurityResponseFormData = z.infer<typeof SecurityResponseDataSchema>;
export type PopulationResponseFormData = z.infer<typeof PopulationResponseDataSchema>;
export type DeliveryTimelineData = z.infer<typeof DeliveryTimelineSchema>;
export type ResponsePlanDraftData = z.infer<typeof ResponsePlanDraftSchema>;
export type ItemDeliveryData = z.infer<typeof ItemDeliverySchema>;
export type ItemTemplateData = z.infer<typeof ItemTemplateSchema>;