import { z } from 'zod';

// Base validation schemas
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number');

// Enum schemas
export const AssessmentTypeSchema = z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION']);
export const VerificationStatusSchema = z.enum(['PENDING', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED']);
export const SyncStatusSchema = z.enum(['PENDING', 'SYNCING', 'SYNCED', 'CONFLICT', 'FAILED']);

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

// Union schema for assessment data
export const AssessmentDataSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('HEALTH'), data: HealthAssessmentDataSchema }),
  z.object({ type: z.literal('WASH'), data: WashAssessmentDataSchema }),
  z.object({ type: z.literal('SHELTER'), data: ShelterAssessmentDataSchema }),
  z.object({ type: z.literal('FOOD'), data: FoodAssessmentDataSchema }),
  z.object({ type: z.literal('SECURITY'), data: SecurityAssessmentDataSchema }),
  z.object({ type: z.literal('POPULATION'), data: PopulationAssessmentDataSchema }),
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
  ]),
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