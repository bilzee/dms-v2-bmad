import { 
  RapidAssessment, 
  PreliminaryAssessmentData, 
  AssessmentType,
  Incident 
} from '@dms/shared';

export interface CreateIncidentFromAssessmentRequest {
  assessmentId: string;
  assessmentData: PreliminaryAssessmentData;
  affectedEntityId: string;
  assessorId: string;
  assessorName: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: string;
    captureMethod: 'GPS' | 'MANUAL' | 'MAP_SELECT';
  };
}

export interface CreateIncidentFromAssessmentResponse {
  success: boolean;
  incident?: {
    id: string;
    name: string;
    type: string;
    severity: string;
    status: string;
    preliminaryAssessmentIds: string[];
  };
  error?: string;
  message?: string;
}

export interface IncidentAssessmentLink {
  incidentId: string;
  assessmentId: string;
  linkedAt: Date;
  linkType: 'CREATED_FROM' | 'RELATED_TO';
}

export class IncidentService {
  private static readonly BASE_URL = '/api/v1/incidents';

  /**
   * Creates an incident from a preliminary assessment
   */
  static async createFromAssessment(
    request: CreateIncidentFromAssessmentRequest
  ): Promise<CreateIncidentFromAssessmentResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}/from-assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to create incident from assessment:', error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Failed to create incident from preliminary assessment'
      );
    }
  }

  /**
   * Checks if an assessment should trigger incident creation
   */
  static shouldCreateIncident(assessment: RapidAssessment): boolean {
    return assessment.type === AssessmentType.PRELIMINARY;
  }

  /**
   * Prepares incident creation request from assessment data
   */
  static prepareIncidentRequest(
    assessment: RapidAssessment,
    gpsCoordinates?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      timestamp: Date;
      captureMethod: 'GPS' | 'MANUAL' | 'MAP_SELECT';
    }
  ): CreateIncidentFromAssessmentRequest | null {
    if (!this.shouldCreateIncident(assessment)) {
      return null;
    }

    const preliminaryData = assessment.data as PreliminaryAssessmentData;

    return {
      assessmentId: assessment.id,
      assessmentData: preliminaryData,
      affectedEntityId: assessment.affectedEntityId,
      assessorId: assessment.assessorId,
      assessorName: assessment.assessorName,
      gpsCoordinates: gpsCoordinates ? {
        latitude: gpsCoordinates.latitude,
        longitude: gpsCoordinates.longitude,
        accuracy: gpsCoordinates.accuracy,
        timestamp: gpsCoordinates.timestamp.toISOString(),
        captureMethod: gpsCoordinates.captureMethod,
      } : undefined,
    };
  }

  /**
   * Links an assessment to an incident
   */
  static async linkAssessmentToIncident(
    assessmentId: string,
    incidentId: string,
    linkType: 'CREATED_FROM' | 'RELATED_TO' = 'CREATED_FROM'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/v1/incidents/link-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessmentId,
          incidentId,
          linkType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to link assessment to incident:', error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Failed to link assessment to incident'
      );
    }
  }

  /**
   * Gets incident information linked to an assessment
   */
  static async getIncidentForAssessment(
    assessmentId: string
  ): Promise<{ incident?: any; error?: string }> {
    try {
      const response = await fetch(`/api/v1/incidents/by-assessment/${assessmentId}`);
      
      if (response.status === 404) {
        return { incident: null };
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to get incident for assessment:', error);
      return {
        error: error instanceof Error 
          ? error.message 
          : 'Failed to get incident for assessment'
      };
    }
  }

  /**
   * Gets all assessments linked to an incident
   */
  static async getAssessmentsForIncident(
    incidentId: string
  ): Promise<{ assessments?: RapidAssessment[]; error?: string }> {
    try {
      const response = await fetch(`/api/v1/incidents/${incidentId}/assessments`);
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to get assessments for incident:', error);
      return {
        error: error instanceof Error 
          ? error.message 
          : 'Failed to get assessments for incident'
      };
    }
  }
}