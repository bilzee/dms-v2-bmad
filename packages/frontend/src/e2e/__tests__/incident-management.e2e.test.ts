import { test, expect } from '@playwright/test';

test.describe('Incident Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page and authenticate
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'coordinator@dms.test');
    await page.fill('[data-testid="password-input"]', 'test123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for authentication to complete
    await expect(page).toHaveURL('/dashboard');
  });

  test.describe('Incident Management Dashboard', () => {
    test('displays incident management interface', async ({ page }) => {
      // Navigate to incidents page
      await page.click('[data-testid="nav-incidents"]');
      await expect(page).toHaveURL('/dashboard/incidents');

      // Check main interface elements
      await expect(page.locator('h1')).toContainText('Incident Management');
      await expect(page.locator('[data-testid="incident-stats"]')).toBeVisible();
      await expect(page.locator('[data-testid="new-incident-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    });

    test('shows incident statistics correctly', async ({ page }) => {
      await page.goto('/dashboard/incidents');

      // Check statistics cards
      await expect(page.locator('[data-testid="total-incidents-stat"]')).toContainText('2');
      await expect(page.locator('[data-testid="active-incidents-stat"]')).toContainText('1');
      await expect(page.locator('[data-testid="high-priority-stat"]')).toContainText('1');
    });

    test('displays incident cards with correct information', async ({ page }) => {
      await page.goto('/dashboard/incidents');

      // Check incident cards
      const incidentCards = page.locator('[data-testid^="incident-card-"]');
      await expect(incidentCards).toHaveCount(2);

      // Check first incident
      const firstIncident = incidentCards.first();
      await expect(firstIncident).toContainText('Test Flood Incident');
      await expect(firstIncident).toContainText('FLOOD');
      await expect(firstIncident).toContainText('SEVERE');
      await expect(firstIncident).toContainText('ACTIVE');
      await expect(firstIncident).toContainText('3 affected entities');
    });

    test('filters incidents by type', async ({ page }) => {
      await page.goto('/dashboard/incidents');

      // Apply flood filter
      await page.selectOption('[data-testid="type-filter"]', 'FLOOD');
      await page.waitForTimeout(500); // Wait for filter to apply

      // Should only show flood incidents
      const incidentCards = page.locator('[data-testid^="incident-card-"]');
      await expect(incidentCards).toHaveCount(1);
      await expect(incidentCards.first()).toContainText('FLOOD');
    });

    test('searches incidents by name', async ({ page }) => {
      await page.goto('/dashboard/incidents');

      // Search for specific incident
      await page.fill('[data-testid="search-input"]', 'flood');
      await page.waitForTimeout(800); // Wait for debounce

      // Should show matching incidents
      const incidentCards = page.locator('[data-testid^="incident-card-"]');
      await expect(incidentCards).toHaveCount(1);
      await expect(incidentCards.first()).toContainText('Flood');
    });
  });

  test.describe('Incident Creation', () => {
    test('creates new incident manually', async ({ page }) => {
      await page.goto('/dashboard/incidents');

      // Open creation form
      await page.click('[data-testid="new-incident-button"]');
      await expect(page.locator('[data-testid="creation-dialog"]')).toBeVisible();

      // Fill manual entry form
      await page.fill('[data-testid="incident-name-input"]', 'E2E Test Incident');
      await page.selectOption('[data-testid="incident-type-select"]', 'FIRE');
      await page.selectOption('[data-testid="severity-select"]', 'MODERATE');
      await page.fill('[data-testid="description-input"]', 'End-to-end test incident');

      // Add location coordinates
      await page.fill('[data-testid="latitude-input"]', '11.8311');
      await page.fill('[data-testid="longitude-input"]', '13.1506');

      // Select affected entities
      await page.check('[data-testid="entity-checkbox-1"]');
      await page.check('[data-testid="entity-checkbox-2"]');

      // Submit form
      await page.click('[data-testid="create-incident-button"]');

      // Wait for creation to complete
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Incident created successfully');
      
      // Verify incident appears in list
      await expect(page.locator('[data-testid^="incident-card-"]')).toContainText('E2E Test Incident');
    });

    test('creates incident from assessment', async ({ page }) => {
      await page.goto('/dashboard/incidents');

      // Open creation form
      await page.click('[data-testid="new-incident-button"]');

      // Switch to assessment tab
      await page.click('[data-testid="from-assessment-tab"]');

      // Select an assessment
      await page.click('[data-testid="assessment-card-1"]');

      // Add incident name
      await page.fill('[data-testid="incident-name-input"]', 'Assessment-Based E2E Test');

      // Submit
      await page.click('[data-testid="create-from-assessment-button"]');

      // Verify creation
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Incident created successfully');
      await expect(page.locator('[data-testid^="incident-card-"]')).toContainText('Assessment-Based E2E Test');
    });

    test('validates required fields', async ({ page }) => {
      await page.goto('/dashboard/incidents');

      // Open creation form
      await page.click('[data-testid="new-incident-button"]');

      // Try to submit without filling required fields
      await page.click('[data-testid="create-incident-button"]');

      // Should show validation errors
      await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');
      await expect(page.locator('[data-testid="type-error"]')).toContainText('Type is required');
      await expect(page.locator('[data-testid="severity-error"]')).toContainText('Severity is required');
    });

    test('captures GPS location', async ({ page, context }) => {
      // Grant geolocation permission
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 11.8311, longitude: 13.1506 });

      await page.goto('/dashboard/incidents');
      await page.click('[data-testid="new-incident-button"]');

      // Click capture location button
      await page.click('[data-testid="capture-location-button"]');

      // Wait for location to be captured
      await expect(page.locator('[data-testid="latitude-input"]')).toHaveValue('11.8311');
      await expect(page.locator('[data-testid="longitude-input"]')).toHaveValue('13.1506');
    });
  });

  test.describe('Status Tracking', () => {
    test('switches to status tracker tab', async ({ page }) => {
      await page.goto('/dashboard/incidents');

      // Switch to status timeline tab
      await page.click('[data-testid="status-timeline-tab"]');

      // Should show status tracker interface
      await expect(page.locator('[data-testid="status-tracker"]')).toBeVisible();
      await expect(page.locator('[data-testid="current-status"]')).toContainText('ACTIVE');
      await expect(page.locator('[data-testid="status-progression"]')).toBeVisible();
    });

    test('updates incident status', async ({ page }) => {
      await page.goto('/dashboard/incidents');
      await page.click('[data-testid="status-timeline-tab"]');

      // Open status update form
      await page.click('[data-testid="update-status-button"]');
      await expect(page.locator('[data-testid="status-update-dialog"]')).toBeVisible();

      // Update status
      await page.selectOption('[data-testid="new-status-select"]', 'CONTAINED');
      await page.fill('[data-testid="milestone-input"]', 'Area secured');
      await page.fill('[data-testid="notes-input"]', 'E2E test status update');

      // Submit update
      await page.click('[data-testid="update-status-submit"]');

      // Verify status change
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Status updated successfully');
      await expect(page.locator('[data-testid="current-status"]')).toContainText('CONTAINED');
    });

    test('adds action items', async ({ page }) => {
      await page.goto('/dashboard/incidents');
      await page.click('[data-testid="status-timeline-tab"]');

      // Open add action item form
      await page.click('[data-testid="add-action-item-button"]');

      // Fill action item details
      await page.fill('[data-testid="action-title-input"]', 'E2E Test Action');
      await page.fill('[data-testid="action-description-input"]', 'Test action item for E2E');
      await page.selectOption('[data-testid="priority-select"]', 'HIGH');
      await page.fill('[data-testid="assigned-to-input"]', 'test-coordinator');

      // Submit
      await page.click('[data-testid="add-action-submit"]');

      // Verify action item appears
      await expect(page.locator('[data-testid^="action-item-"]')).toContainText('E2E Test Action');
      await expect(page.locator('[data-testid^="action-item-"]')).toContainText('HIGH');
    });

    test('displays timeline events', async ({ page }) => {
      await page.goto('/dashboard/incidents');
      await page.click('[data-testid="status-timeline-tab"]');

      // Should show timeline events
      const timelineEvents = page.locator('[data-testid^="timeline-event-"]');
      await expect(timelineEvents.first()).toContainText('Incident created');
      await expect(timelineEvents.first()).toContainText('Sarah Johnson');
    });

    test('adds timeline notes', async ({ page }) => {
      await page.goto('/dashboard/incidents');
      await page.click('[data-testid="status-timeline-tab"]');

      // Open add note form
      await page.click('[data-testid="add-note-button"]');

      // Add note
      await page.fill('[data-testid="note-input"]', 'E2E test timeline note');
      await page.selectOption('[data-testid="note-priority-select"]', 'NORMAL');
      await page.click('[data-testid="add-note-submit"]');

      // Verify note appears in timeline
      await expect(page.locator('[data-testid^="timeline-event-"]')).toContainText('E2E test timeline note');
    });
  });

  test.describe('Entity Linking', () => {
    test('switches to entity relations tab', async ({ page }) => {
      await page.goto('/dashboard/incidents');

      // Switch to entity relations tab
      await page.click('[data-testid="entity-relations-tab"]');

      // Should show entity linker interface
      await expect(page.locator('[data-testid="entity-linker"]')).toBeVisible();
      await expect(page.locator('[data-testid="link-entities-button"]')).toBeVisible();
    });

    test('displays linked entities', async ({ page }) => {
      await page.goto('/dashboard/incidents');
      await page.click('[data-testid="entity-relations-tab"]');

      // Should show linked entities
      const entityCards = page.locator('[data-testid^="entity-card-"]');
      await expect(entityCards).toHaveCount(3); // Flood incident has 3 linked entities
      
      // Check entity details
      await expect(entityCards.first()).toContainText('Maiduguri Camp A');
      await expect(entityCards.first()).toContainText('15,000 people');
    });

    test('links new entities to incident', async ({ page }) => {
      await page.goto('/dashboard/incidents');
      await page.click('[data-testid="entity-relations-tab"]');

      // Open entity linking form
      await page.click('[data-testid="link-entities-button"]');
      await expect(page.locator('[data-testid="entity-linking-dialog"]')).toBeVisible();

      // Select entities to link
      await page.check('[data-testid="available-entity-checkbox-2"]');
      await page.check('[data-testid="available-entity-checkbox-4"]');

      // Submit
      await page.click('[data-testid="link-selected-button"]');

      // Verify entities were linked
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Entities linked successfully');
      
      // Should see more entity cards now
      const entityCards = page.locator('[data-testid^="entity-card-"]');
      await expect(entityCards).toHaveCount(5); // Original 3 + 2 new ones
    });

    test('unlinks entity from incident', async ({ page }) => {
      await page.goto('/dashboard/incidents');
      await page.click('[data-testid="entity-relations-tab"]');

      // Click unlink button on first entity
      await page.click('[data-testid="unlink-entity-1"]');

      // Confirm unlinking
      await page.click('[data-testid="confirm-unlink"]');

      // Verify entity was unlinked
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Entity unlinked successfully');
      
      // Should have one less entity card
      const entityCards = page.locator('[data-testid^="entity-card-"]');
      await expect(entityCards).toHaveCount(2);
    });

    test('filters entities by type', async ({ page }) => {
      await page.goto('/dashboard/incidents');
      await page.click('[data-testid="entity-relations-tab"]');

      // Filter by CAMP type
      await page.selectOption('[data-testid="entity-type-filter"]', 'CAMP');

      // Should only show camp entities
      const entityCards = page.locator('[data-testid^="entity-card-"]');
      await expect(entityCards).toHaveCount(2); // Only camps
    });

    test('views entity analytics', async ({ page }) => {
      await page.goto('/dashboard/incidents');
      await page.click('[data-testid="entity-relations-tab"]');

      // Switch to analytics view
      await page.click('[data-testid="analytics-tab"]');

      // Should show analytics data
      await expect(page.locator('[data-testid="total-population-impact"]')).toContainText('34,800');
      await expect(page.locator('[data-testid="affected-lgas-count"]')).toContainText('3');
      await expect(page.locator('[data-testid="risk-distribution"]')).toBeVisible();
    });

    test('views map visualization', async ({ page }) => {
      await page.goto('/dashboard/incidents');
      await page.click('[data-testid="entity-relations-tab"]');

      // Switch to map view
      await page.click('[data-testid="map-view-tab"]');

      // Should show map component
      await expect(page.locator('[data-testid="entity-map"]')).toBeVisible();
      
      // Should show entity markers
      const entityMarkers = page.locator('[data-testid^="map-entity-marker-"]');
      await expect(entityMarkers).toHaveCount(3);
    });
  });

  test.describe('Incident Details and Preview', () => {
    test('opens incident preview', async ({ page }) => {
      await page.goto('/dashboard/incidents');

      // Click view details on first incident
      await page.click('[data-testid="view-details-1"]');

      // Should open preview dialog
      await expect(page.locator('[data-testid="incident-preview-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="preview-incident-name"]')).toContainText('Test Flood Incident');
      await expect(page.locator('[data-testid="preview-incident-type"]')).toContainText('FLOOD');
      await expect(page.locator('[data-testid="preview-affected-entities"]')).toContainText('3');
    });

    test('closes incident preview', async ({ page }) => {
      await page.goto('/dashboard/incidents');
      await page.click('[data-testid="view-details-1"]');

      // Close preview
      await page.click('[data-testid="close-preview-button"]');

      // Should close dialog
      await expect(page.locator('[data-testid="incident-preview-dialog"]')).not.toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('handles network errors gracefully', async ({ page }) => {
      // Intercept API calls to simulate network error
      await page.route('**/api/v1/incidents', route => {
        route.abort('failed');
      });

      await page.goto('/dashboard/incidents');

      // Should show error state
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to load incident management data');
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('retries failed operations', async ({ page }) => {
      let callCount = 0;
      
      // Intercept API calls - fail first call, succeed on retry
      await page.route('**/api/v1/incidents', route => {
        callCount++;
        if (callCount === 1) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      await page.goto('/dashboard/incidents');
      
      // Should show error first
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      
      // Click retry
      await page.click('[data-testid="retry-button"]');
      
      // Should load successfully on retry
      await expect(page.locator('[data-testid="incident-stats"]')).toBeVisible();
    });

    test('shows loading states', async ({ page }) => {
      // Intercept API calls to delay response
      await page.route('**/api/v1/incidents', route => {
        setTimeout(() => route.continue(), 1000);
      });

      await page.goto('/dashboard/incidents');

      // Should show loading skeletons
      await expect(page.locator('[data-testid="loading-skeleton"]')).toBeVisible();
      
      // Should disappear when loaded
      await expect(page.locator('[data-testid="loading-skeleton"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="incident-stats"]')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('works on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard/incidents');

      // Should show mobile-friendly layout
      await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
      await expect(page.locator('[data-testid="incident-stats"]')).toBeVisible();
    });

    test('works on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/dashboard/incidents');

      // Should show tablet layout
      await expect(page.locator('[data-testid="incident-stats"]')).toBeVisible();
      await expect(page.locator('[data-testid="new-incident-button"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('has proper ARIA labels and roles', async ({ page }) => {
      await page.goto('/dashboard/incidents');

      // Check key accessibility attributes
      await expect(page.locator('[data-testid="search-input"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="type-filter"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="new-incident-button"]')).toHaveAttribute('role', 'button');
    });

    test('supports keyboard navigation', async ({ page }) => {
      await page.goto('/dashboard/incidents');

      // Navigate using keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should focus on search input
      await expect(page.locator('[data-testid="search-input"]')).toBeFocused();
      
      // Continue navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="type-filter"]')).toBeFocused();
    });

    test('maintains focus management in dialogs', async ({ page }) => {
      await page.goto('/dashboard/incidents');

      // Open creation dialog
      await page.click('[data-testid="new-incident-button"]');

      // First focusable element should be focused
      await expect(page.locator('[data-testid="incident-name-input"]')).toBeFocused();
      
      // Escape should close dialog
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="creation-dialog"]')).not.toBeVisible();
    });
  });
});