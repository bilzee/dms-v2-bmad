import { z } from 'zod';
import {
  AssessmentFormSchema,
  HealthAssessmentDataSchema,
  WashAssessmentDataSchema,
  ShelterAssessmentDataSchema,
  FoodAssessmentDataSchema,
  SecurityAssessmentDataSchema,
  PopulationAssessmentDataSchema,
  type AssessmentType,
} from '@dms/shared';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
}

export interface OfflineValidationOptions {
  enableWarnings?: boolean;
  strictMode?: boolean;
  requiredFields?: string[];
}

// Offline validation that works without network connectivity
export class OfflineValidator {
  private enableWarnings: boolean;
  private strictMode: boolean;
  private requiredFields: string[];

  constructor(options: OfflineValidationOptions = {}) {
    this.enableWarnings = options.enableWarnings ?? true;
    this.strictMode = options.strictMode ?? false;
    this.requiredFields = options.requiredFields ?? [];
  }

  // Main validation method for assessment forms
  validateAssessmentForm(data: any, assessmentType: AssessmentType): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: {},
      warnings: {},
    };

    try {
      // Basic schema validation
      const schemaResult = this.validateWithSchema(data, assessmentType);
      if (!schemaResult.success) {
        result.isValid = false;
        result.errors = this.formatZodErrors(schemaResult.error);
      }

      // Custom business logic validation
      const businessValidation = this.validateBusinessRules(data, assessmentType);
      if (!businessValidation.isValid) {
        result.isValid = false;
        Object.assign(result.errors, businessValidation.errors);
      }

      // Add warnings if enabled
      if (this.enableWarnings) {
        result.warnings = this.generateWarnings(data, assessmentType);
      }

      // Strict mode additional checks
      if (this.strictMode) {
        const strictValidation = this.validateStrictMode(data, assessmentType);
        if (!strictValidation.isValid) {
          result.isValid = false;
          Object.assign(result.errors, strictValidation.errors);
        }
      }

    } catch (error) {
      result.isValid = false;
      result.errors.general = ['Validation error occurred'];
      console.error('Validation error:', error);
    }

    return result;
  }

  // Schema validation using Zod
  private validateWithSchema(data: any, assessmentType: AssessmentType): z.SafeParseReturnType<any, any> {
    try {
      // Get the appropriate schema based on assessment type
      const schema = this.getSchemaForType(assessmentType);
      return schema.safeParse(data);
    } catch (error) {
      return {
        success: false,
        error: new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: 'Schema validation failed',
            path: [],
          },
        ]),
      };
    }
  }

  // Get the appropriate Zod schema for the assessment type
  private getSchemaForType(assessmentType: AssessmentType): z.ZodSchema {
    const baseFormSchema = z.object({
      type: z.literal(assessmentType),
      affectedEntityId: z.string().uuid(),
      assessorName: z.string().min(1),
      gpsCoordinates: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().positive().optional(),
        timestamp: z.date(),
        captureMethod: z.enum(['GPS', 'MANUAL', 'MAP_SELECT']),
      }).optional(),
      mediaAttachments: z.array(z.any()).default([]),
    });

    switch (assessmentType) {
      case 'HEALTH':
        return baseFormSchema.extend({ data: HealthAssessmentDataSchema });
      case 'WASH':
        return baseFormSchema.extend({ data: WashAssessmentDataSchema });
      case 'SHELTER':
        return baseFormSchema.extend({ data: ShelterAssessmentDataSchema });
      case 'FOOD':
        return baseFormSchema.extend({ data: FoodAssessmentDataSchema });
      case 'SECURITY':
        return baseFormSchema.extend({ data: SecurityAssessmentDataSchema });
      case 'POPULATION':
        return baseFormSchema.extend({ data: PopulationAssessmentDataSchema });
      default:
        throw new Error(`Unsupported assessment type: ${assessmentType}`);
    }
  }

  // Custom business rules validation
  private validateBusinessRules(data: any, assessmentType: AssessmentType): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: {},
      warnings: {},
    };

    if (!data.data) {
      result.isValid = false;
      result.errors.data = ['Assessment data is required'];
      return result;
    }

    switch (assessmentType) {
      case 'HEALTH':
        this.validateHealthBusinessRules(data.data, result);
        break;
      case 'WASH':
        this.validateWashBusinessRules(data.data, result);
        break;
      case 'SHELTER':
        this.validateShelterBusinessRules(data.data, result);
        break;
      case 'FOOD':
        this.validateFoodBusinessRules(data.data, result);
        break;
      case 'SECURITY':
        this.validateSecurityBusinessRules(data.data, result);
        break;
      case 'POPULATION':
        this.validatePopulationBusinessRules(data.data, result);
        break;
    }

    return result;
  }

  // Health-specific business rules
  private validateHealthBusinessRules(data: any, result: ValidationResult): void {
    if (data.hasFunctionalClinic && data.numberHealthFacilities === 0) {
      result.isValid = false;
      result.errors.numberHealthFacilities = result.errors.numberHealthFacilities || [];
      result.errors.numberHealthFacilities.push('Number of health facilities must be greater than 0 if clinic is functional');
    }

    if (data.qualifiedHealthWorkers > data.numberHealthFacilities * 10) {
      if (!result.warnings.qualifiedHealthWorkers) result.warnings.qualifiedHealthWorkers = [];
      result.warnings.qualifiedHealthWorkers.push('Unusually high number of health workers per facility');
    }
  }

  // WASH-specific business rules
  private validateWashBusinessRules(data: any, result: ValidationResult): void {
    if (data.hasToilets && data.numberToilets === 0) {
      result.isValid = false;
      result.errors.numberToilets = result.errors.numberToilets || [];
      result.errors.numberToilets.push('Number of toilets must be greater than 0 if toilets exist');
    }

    if (!data.isWaterSufficient && data.waterQuality === 'Safe') {
      if (!result.warnings.waterQuality) result.warnings.waterQuality = [];
      result.warnings.waterQuality.push('Water quality is safe but insufficient - consider reviewing');
    }
  }

  // Population-specific business rules
  private validatePopulationBusinessRules(data: any, result: ValidationResult): void {
    const totalGender = data.populationMale + data.populationFemale;
    
    if (totalGender > data.totalPopulation) {
      result.isValid = false;
      result.errors.totalPopulation = result.errors.totalPopulation || [];
      result.errors.totalPopulation.push('Male + Female population cannot exceed total population');
    }

    if (data.populationUnder5 > data.totalPopulation) {
      result.isValid = false;
      result.errors.populationUnder5 = result.errors.populationUnder5 || [];
      result.errors.populationUnder5.push('Under 5 population cannot exceed total population');
    }

    if (data.pregnantWomen > data.populationFemale) {
      result.isValid = false;
      result.errors.pregnantWomen = result.errors.pregnantWomen || [];
      result.errors.pregnantWomen.push('Pregnant women cannot exceed female population');
    }
  }

  // Other assessment type business rules
  private validateShelterBusinessRules(data: any, result: ValidationResult): void {
    if (data.areSheltersSufficient && (data.needsRepair || data.needsTarpaulin || data.needsBedding)) {
      if (!result.warnings.shelterCondition) result.warnings.shelterCondition = [];
      result.warnings.shelterCondition.push('Shelters marked as sufficient but needs repairs/supplies');
    }
  }

  private validateFoodBusinessRules(data: any, result: ValidationResult): void {
    if (data.availableFoodDurationDays === 0 && data.malnutritionCases === 0) {
      if (!result.warnings.malnutritionCases) result.warnings.malnutritionCases = [];
      result.warnings.malnutritionCases.push('No food available but no malnutrition cases reported - please verify');
    }
  }

  private validateSecurityBusinessRules(data: any, result: ValidationResult): void {
    if (!data.isAreaSecure && data.incidentsReported === 0) {
      if (!result.warnings.incidentsReported) result.warnings.incidentsReported = [];
      result.warnings.incidentsReported.push('Area marked as insecure but no incidents reported');
    }
  }

  // Strict mode validation
  private validateStrictMode(data: any, assessmentType: AssessmentType): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: {},
      warnings: {},
    };

    // Require GPS coordinates in strict mode
    if (!data.gpsCoordinates) {
      result.isValid = false;
      result.errors.gpsCoordinates = ['GPS coordinates are required in strict mode'];
    }

    // Require additional details in strict mode
    if (!data.data.additionalDetails || data.data.additionalDetails.trim().length < 10) {
      result.isValid = false;
      result.errors.additionalDetails = ['Additional details are required in strict mode (minimum 10 characters)'];
    }

    return result;
  }

  // Generate warnings for common issues
  private generateWarnings(data: any, assessmentType: AssessmentType): Record<string, string[]> {
    const warnings: Record<string, string[]> = {};

    // General warnings
    if (!data.gpsCoordinates) {
      warnings.gpsCoordinates = ['GPS coordinates not captured - location accuracy may be affected'];
    }

    if (data.gpsCoordinates && data.gpsCoordinates.accuracy > 50) {
      warnings.gpsAccuracy = ['GPS accuracy is low (>50m) - consider recapturing location'];
    }

    return warnings;
  }

  // Format Zod errors into a readable format
  private formatZodErrors(error: z.ZodError): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};

    error.issues.forEach(issue => {
      const path = issue.path.join('.');
      if (!formatted[path]) {
        formatted[path] = [];
      }
      formatted[path].push(issue.message);
    });

    return formatted;
  }
}

// Export a default instance for easy use
export const offlineValidator = new OfflineValidator({
  enableWarnings: true,
  strictMode: false,
});

// Validation hook for React components
export function useOfflineValidation(assessmentType: AssessmentType, options?: OfflineValidationOptions) {
  const validator = new OfflineValidator(options);

  const validate = (data: any): ValidationResult => {
    return validator.validateAssessmentForm(data, assessmentType);
  };

  return { validate };
}