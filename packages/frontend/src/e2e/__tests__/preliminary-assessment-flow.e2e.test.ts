/**
 * End-to-End Tests for Preliminary Assessment to Incident Creation Flow
 * 
 * These tests verify the complete user journey from creating a preliminary assessment
 * to seeing the incident created and coordinator notifications sent.
 */

import { test, expect, Page } from '@playwright/test';
import { IncidentType, IncidentSeverity } from '@dms/shared';

// Test data
const testAssessment = {
  incidentType: IncidentType.FLOOD,
  incidentSubType: 'Flash flood in urban area',
  severity: IncidentSeverity.SEVERE,
  affectedPopulation: 500,
  affectedHouseholds: 100,
  immediateNeeds: 'Shelter and clean water needed urgently. Medical assistance required for elderly.',
  accessibilityStatus: 'ACCESSIBLE',
  priorityLevel: 'HIGH',
  additionalDetails: 'Bridge damaged, access limited from north. Emergency vehicles can reach via southern route.'
};

const testUser = {
  name: 'John Doe',
  id: 'assessor-123',
  role: 'FIELD_ASSESSOR'
};

class PreliminaryAssessmentPage {
  constructor(private page: Page) {}

  async navigateToAssessmentCreation() {
    await this.page.goto('/assessments/new');
    await this.page.waitForLoadState('networkidle');
  }

  async selectPreliminaryAssessment() {
    await this.page.click('[data-testid="assessment-type-preliminary"]');
    await this.page.waitForSelector('[data-testid="preliminary-assessment-form"]');
  }

  async fillAssessmentForm() {
    // Fill incident type
    await this.page.selectOption('[data-testid="incident-type"]', testAssessment.incidentType);
    
    // Fill incident sub-type
    await this.page.fill('[data-testid="incident-subtype"]', testAssessment.incidentSubType);
    
    // Select severity
    await this.page.selectOption('[data-testid="severity"]', testAssessment.severity);
    
    // Fill population estimates
    await this.page.fill('[data-testid="affected-population"]', testAssessment.affectedPopulation.toString());
    await this.page.fill('[data-testid="affected-households"]', testAssessment.affectedHouseholds.toString());
    
    // Fill immediate needs description
    await this.page.fill('[data-testid="immediate-needs"]', testAssessment.immediateNeeds);
    
    // Select accessibility status
    await this.page.selectOption('[data-testid="accessibility-status"]', testAssessment.accessibilityStatus);
    
    // Select priority level
    await this.page.selectOption('[data-testid="priority-level"]', testAssessment.priorityLevel);
    
    // Fill additional details
    await this.page.fill('[data-testid="additional-details"]', testAssessment.additionalDetails);
  }

  async captureGPS() {
    await this.page.click('[data-testid="capture-gps"]');
    await this.page.waitForSelector('[data-testid="gps-coordinates"]');
    
    // Verify GPS coordinates are displayed
    const coordinates = await this.page.textContent('[data-testid="gps-coordinates"]');
    expect(coordinates).toContain('Lat:');
    expect(coordinates).toContain('Lng:');
  }

  async addMediaAttachment() {
    // Upload a test image
    const fileInput = this.page.locator('[data-testid="media-upload"] input[type="file"]');
    await fileInput.setInputFiles('./test-assets/emergency-photo.jpg');
    
    // Wait for upload confirmation
    await this.page.waitForSelector('[data-testid="media-attachment-0"]');
  }

  async submitAssessment() {
    await this.page.click('[data-testid="submit-assessment"]');
    
    // Wait for submission process to complete
    await this.page.waitForSelector('[data-testid="submission-success"]', { timeout: 10000 });
  }

  async verifyPriorityIndicator() {
    const priorityBadge = this.page.locator('[data-testid="priority-indicator"]');
    await expect(priorityBadge).toBeVisible();
    await expect(priorityBadge).toHaveText('🚨 HIGH PRIORITY');
    await expect(priorityBadge).toHaveClass(/bg-red-100.*text-red-800/);
  }

  async verifyFormValidation() {
    // Try to submit empty form
    await this.page.click('[data-testid="submit-assessment"]');
    
    // Check for validation errors
    await expect(this.page.locator('[data-testid="error-affected-population"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="error-affected-households"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="error-immediate-needs"]')).toBeVisible();
  }

  async verifyStatusMessages() {
    // Check for incident creation status
    await expect(this.page.locator('[data-testid="incident-creation-status"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="incident-creation-status"]')).toContainText('Creating incident...');
    
    // Wait for success message
    await expect(this.page.locator('[data-testid="incident-created-success"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="coordinators-notified"]')).toBeVisible();
  }
}

class IncidentReviewPage {
  constructor(private page: Page) {}

  async navigateToIncidentQueue() {
    await this.page.goto('/incidents/review-queue');
    await this.page.waitForLoadState('networkidle');
  }

  async verifyIncidentInQueue() {
    // Check that the new incident appears in the review queue
    const incidentCard = this.page.locator('[data-testid^="incident-card-"]').first();
    await expect(incidentCard).toBeVisible();
    
    // Verify incident details
    await expect(incidentCard.locator('[data-testid="incident-type"]')).toContainText('FLOOD');
    await expect(incidentCard.locator('[data-testid="incident-severity"]')).toContainText('SEVERE');
    await expect(incidentCard.locator('[data-testid="incident-status"]')).toContainText('ACTIVE');
  }

  async verifyIncidentDetails() {
    const incidentCard = this.page.locator('[data-testid^="incident-card-"]').first();
    await incidentCard.click();
    
    // Wait for incident details page
    await this.page.waitForSelector('[data-testid="incident-details"]');
    
    // Verify linked preliminary assessment
    await expect(this.page.locator('[data-testid="linked-assessments"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="preliminary-assessment-link"]')).toBeVisible();
    
    // Verify incident was created from assessment
    await expect(this.page.locator('[data-testid="creation-source"]')).toContainText('Created from preliminary assessment');
  }
}

class AssessmentListPage {
  constructor(private page: Page) {}

  async navigateToAssessmentList() {
    await this.page.goto('/assessments');
    await this.page.waitForLoadState('networkidle');
  }

  async verifyAssessmentInList() {
    // Filter to show preliminary assessments
    await this.page.selectOption('[data-testid="assessment-type-filter"]', 'PRELIMINARY');
    
    // Verify assessment appears in list
    const assessmentCard = this.page.locator('[data-testid^="assessment-card-"]').first();
    await expect(assessmentCard).toBeVisible();
    
    // Verify assessment details
    await expect(assessmentCard.locator('[data-testid="assessment-type"]')).toContainText('PRELIMINARY');
    await expect(assessmentCard.locator('[data-testid="emergency-badge"]')).toBeVisible();
  }

  async verifyIncidentStatusInAssessment() {
    const assessmentCard = this.page.locator('[data-testid^="assessment-card-"]').first();
    
    // Verify incident status section
    await expect(assessmentCard.locator('[data-testid="incident-status"]')).toBeVisible();
    await expect(assessmentCard.locator('[data-testid="incident-name"]')).toContainText('FLOOD - SEVERE');
    await expect(assessmentCard.locator('[data-testid="incident-status-badge"]')).toContainText('ACTIVE');
  }
}

test.describe('Preliminary Assessment to Incident Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('user', JSON.stringify({
        id: 'assessor-123',
        name: 'John Doe',
        role: 'FIELD_ASSESSOR',
        permissions: ['CREATE_ASSESSMENT', 'VIEW_INCIDENTS']
      }));
    });

    // Mock GPS API
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', {
        value: {
          getCurrentPosition: (success: PositionCallback) => {
            success({
              coords: {
                latitude: 40.7128,
                longitude: -74.0060,
                accuracy: 10,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null
              },
              timestamp: Date.now()
            } as GeolocationPosition);
          }
        }
      });
    });
  });

  test('Complete preliminary assessment to incident creation flow', async ({ page }) => {
    const assessmentPage = new PreliminaryAssessmentPage(page);
    const incidentPage = new IncidentReviewPage(page);
    const listPage = new AssessmentListPage(page);

    // Step 1: Navigate to assessment creation
    await assessmentPage.navigateToAssessmentCreation();

    // Step 2: Select preliminary assessment type
    await assessmentPage.selectPreliminaryAssessment();

    // Step 3: Verify priority indicator appears
    await assessmentPage.fillAssessmentForm();
    await assessmentPage.verifyPriorityIndicator();

    // Step 4: Capture GPS coordinates
    await assessmentPage.captureGPS();

    // Step 5: Add media attachment
    await assessmentPage.addMediaAttachment();

    // Step 6: Submit assessment and verify incident creation
    await assessmentPage.submitAssessment();
    await assessmentPage.verifyStatusMessages();

    // Step 7: Verify incident appears in coordinator review queue
    await incidentPage.navigateToIncidentQueue();
    await incidentPage.verifyIncidentInQueue();
    await incidentPage.verifyIncidentDetails();

    // Step 8: Verify assessment appears in list with incident status
    await listPage.navigateToAssessmentList();
    await listPage.verifyAssessmentInList();
    await listPage.verifyIncidentStatusInAssessment();
  });

  test('Form validation prevents invalid submissions', async ({ page }) => {
    const assessmentPage = new PreliminaryAssessmentPage(page);

    await assessmentPage.navigateToAssessmentCreation();
    await assessmentPage.selectPreliminaryAssessment();

    // Try to submit without filling required fields
    await assessmentPage.verifyFormValidation();
  });

  test('Priority levels display correct visual indicators', async ({ page }) => {
    const assessmentPage = new PreliminaryAssessmentPage(page);

    await assessmentPage.navigateToAssessmentCreation();
    await assessmentPage.selectPreliminaryAssessment();

    // Test HIGH priority
    await page.selectOption('[data-testid="priority-level"]', 'HIGH');
    await expect(page.locator('[data-testid="priority-indicator"]')).toContainText('🚨 HIGH PRIORITY');
    await expect(page.locator('[data-testid="priority-indicator"]')).toHaveClass(/bg-red-100/);

    // Test NORMAL priority
    await page.selectOption('[data-testid="priority-level"]', 'NORMAL');
    await expect(page.locator('[data-testid="priority-indicator"]')).toContainText('📋 NORMAL PRIORITY');
    await expect(page.locator('[data-testid="priority-indicator"]')).toHaveClass(/bg-blue-100/);

    // Test LOW priority
    await page.selectOption('[data-testid="priority-level"]', 'LOW');
    await expect(page.locator('[data-testid="priority-indicator"]')).toContainText('🕐 LOW PRIORITY');
    await expect(page.locator('[data-testid="priority-indicator"]')).toHaveClass(/bg-gray-100/);
  });

  test('Offline mode queues assessment and incident creation', async ({ page }) => {
    const assessmentPage = new PreliminaryAssessmentPage(page);

    // Simulate offline mode
    await page.context().setOffline(true);

    await assessmentPage.navigateToAssessmentCreation();
    await assessmentPage.selectPreliminaryAssessment();

    // Verify offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-warning"]')).toContainText('Incident will be created when back online');

    // Fill and submit form
    await assessmentPage.fillAssessmentForm();
    await assessmentPage.submitAssessment();

    // Verify queued for sync
    await expect(page.locator('[data-testid="queued-for-sync"]')).toBeVisible();

    // Come back online
    await page.context().setOffline(false);
    
    // Wait for sync to complete
    await page.waitForSelector('[data-testid="sync-completed"]', { timeout: 10000 });
  });

  test('Character limits are enforced and displayed', async ({ page }) => {
    const assessmentPage = new PreliminaryAssessmentPage(page);

    await assessmentPage.navigateToAssessmentCreation();
    await assessmentPage.selectPreliminaryAssessment();

    // Test immediate needs character count
    const needsTextarea = page.locator('[data-testid="immediate-needs"]');
    await needsTextarea.fill('Short description');
    await expect(page.locator('[data-testid="immediate-needs-count"]')).toContainText('17/1000');

    // Test additional details character count
    const detailsTextarea = page.locator('[data-testid="additional-details"]');
    await detailsTextarea.fill('Additional details here');
    await expect(page.locator('[data-testid="additional-details-count"]')).toContainText('22/2000');

    // Test validation for exceeding limits
    await needsTextarea.fill('a'.repeat(1001));
    await expect(page.locator('[data-testid="error-immediate-needs-length"]')).toBeVisible();
  });

  test('GPS capture works correctly', async ({ page }) => {
    const assessmentPage = new PreliminaryAssessmentPage(page);

    await assessmentPage.navigateToAssessmentCreation();
    await assessmentPage.selectPreliminaryAssessment();

    // Capture GPS
    await page.click('[data-testid="capture-gps"]');

    // Verify loading state
    await expect(page.locator('[data-testid="capture-gps"]')).toContainText('Capturing...');

    // Verify coordinates are displayed
    await expect(page.locator('[data-testid="gps-coordinates"]')).toBeVisible();
    await expect(page.locator('[data-testid="gps-coordinates"]')).toContainText('Lat: 40.712800');
    await expect(page.locator('[data-testid="gps-coordinates"]')).toContainText('Lng: -74.006000');
  });

  test('Media attachments can be added and removed', async ({ page }) => {
    const assessmentPage = new PreliminaryAssessmentPage(page);

    await assessmentPage.navigateToAssessmentCreation();
    await assessmentPage.selectPreliminaryAssessment();

    // Add media attachment
    const fileInput = page.locator('[data-testid="media-upload"] input[type="file"]');
    await fileInput.setInputFiles('./test-assets/emergency-photo.jpg');

    // Verify attachment appears
    await expect(page.locator('[data-testid="media-attachment-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="media-filename-0"]')).toContainText('emergency-photo.jpg');

    // Remove attachment
    await page.click('[data-testid="remove-attachment-0"]');
    await expect(page.locator('[data-testid="media-attachment-0"]')).not.toBeVisible();
  });

  test('Coordinator notifications are sent and displayed', async ({ page }) => {
    const assessmentPage = new PreliminaryAssessmentPage(page);

    // Mock notification API
    await page.route('/api/v1/notifications/coordinators', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          notificationsSent: 3,
          coordinatorsNotified: [
            { id: 'coord-1', name: 'Alice Johnson' },
            { id: 'coord-2', name: 'Bob Smith' },
            { id: 'coord-3', name: 'Carol Davis' }
          ]
        })
      });
    });

    await assessmentPage.navigateToAssessmentCreation();
    await assessmentPage.selectPreliminaryAssessment();
    await assessmentPage.fillAssessmentForm();
    await assessmentPage.submitAssessment();

    // Verify notification success message
    await expect(page.locator('[data-testid="coordinators-notified"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-count"]')).toContainText('3 coordinators notified');
  });
});

test.describe('Error Handling and Edge Cases', () => {
  test('Handles API errors gracefully', async ({ page }) => {
    const assessmentPage = new PreliminaryAssessmentPage(page);

    // Mock API error
    await page.route('/api/v1/incidents/from-assessment', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await assessmentPage.navigateToAssessmentCreation();
    await assessmentPage.selectPreliminaryAssessment();
    await assessmentPage.fillAssessmentForm();
    await assessmentPage.submitAssessment();

    // Verify error message
    await expect(page.locator('[data-testid="incident-creation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Incident creation failed');
  });

  test('Handles GPS permission denied', async ({ page }) => {
    // Mock GPS permission denied
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', {
        value: {
          getCurrentPosition: (success: PositionCallback, error: PositionErrorCallback) => {
            error({
              code: 1, // PERMISSION_DENIED
              message: 'User denied geolocation'
            } as GeolocationPositionError);
          }
        }
      });
    });

    const assessmentPage = new PreliminaryAssessmentPage(page);

    await assessmentPage.navigateToAssessmentCreation();
    await assessmentPage.selectPreliminaryAssessment();

    await page.click('[data-testid="capture-gps"]');

    // Verify error message
    await expect(page.locator('[data-testid="gps-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="gps-error"]')).toContainText('Location permission denied');
  });

  test('Handles file upload errors', async ({ page }) => {
    const assessmentPage = new PreliminaryAssessmentPage(page);

    await assessmentPage.navigateToAssessmentCreation();
    await assessmentPage.selectPreliminaryAssessment();

    // Try to upload an oversized file
    const fileInput = page.locator('[data-testid="media-upload"] input[type="file"]');
    await fileInput.setInputFiles('./test-assets/large-file.jpg'); // > 5MB

    // Verify error message
    await expect(page.locator('[data-testid="file-size-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-size-error"]')).toContainText('File size exceeds 5MB limit');
  });
});