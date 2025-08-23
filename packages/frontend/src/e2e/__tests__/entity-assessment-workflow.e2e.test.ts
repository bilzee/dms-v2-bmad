import { test, expect } from '@playwright/test';

test.describe('Entity-Assessment Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Mock the GPS API
    await page.addInitScript(() => {
      const mockGeolocation = {
        getCurrentPosition: (success: any) => {
          setTimeout(() => {
            success({
              coords: {
                latitude: 11.8469,
                longitude: 13.1511,
                accuracy: 10,
              },
              timestamp: Date.now(),
            });
          }, 100);
        },
        watchPosition: () => 1,
        clearWatch: () => {},
      };
      
      Object.defineProperty(navigator, 'geolocation', {
        value: mockGeolocation,
        configurable: true,
      });
    });
  });

  test('should create entity and use it in assessment', async ({ page }) => {
    // Step 1: Navigate to entities page
    await page.click('text=Affected Entities');
    await expect(page).toHaveURL(/.*entities/);

    // Step 2: Create new entity
    await page.click('text=Create New Entity');
    await expect(page.locator('h1')).toContainText('Create New Entity');

    // Step 3: Fill entity form (Camp)
    await page.selectOption('select[id="type"]', 'CAMP');
    await page.fill('input[id="name"]', 'E2E Test IDP Camp');
    await page.fill('input[id="lga"]', 'Maiduguri');
    await page.fill('input[id="ward"]', 'Central Ward');
    
    // Manual coordinates entry
    await page.fill('input[id="latitude"]', '11.8469');
    await page.fill('input[id="longitude"]', '13.1511');
    
    // Camp details
    await page.fill('input[id="campDetails.campName"]', 'E2E Test Camp');
    await page.selectOption('select[id="campDetails.campStatus"]', 'OPEN');
    await page.fill('input[id="campDetails.campCoordinatorName"]', 'Ahmad Hassan');
    await page.fill('input[id="campDetails.campCoordinatorPhone"]', '+2348012345678');
    await page.fill('input[id="campDetails.superviserName"]', 'Dr. Fatima Mohammed');
    await page.fill('input[id="campDetails.superviserOrganization"]', 'NEMA');
    await page.fill('input[id="campDetails.estimatedPopulation"]', '1500');

    // Step 4: Submit entity form
    await page.click('button[type="submit"]');
    await expect(page.locator('h1')).toContainText('Affected Entities');

    // Step 5: Verify entity was created
    await expect(page.locator('text=E2E Test IDP Camp')).toBeVisible();

    // Step 6: Navigate to assessments
    await page.click('text=Assessments');
    await page.click('text=New Assessment');

    // Step 7: Select assessment type
    await page.click('text=Population Assessment');

    // Step 8: Entity selection should show our created entity
    await page.click('[data-testid="entity-selector"]');
    await expect(page.locator('text=E2E Test IDP Camp')).toBeVisible();
    await page.click('text=E2E Test IDP Camp');

    // Step 9: Verify entity is selected
    await expect(page.locator('text=✓ Entity selected')).toBeVisible();

    // Step 10: Fill assessment form
    await page.fill('input[name="data.totalHouseholds"]', '300');
    await page.fill('input[name="data.totalPopulation"]', '1500');
    await page.fill('input[name="data.populationMale"]', '750');
    await page.fill('input[name="data.populationFemale"]', '750');
    await page.fill('input[name="data.populationUnder5"]', '200');

    // Step 11: Submit assessment
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Assessment submitted successfully')).toBeVisible();
  });

  test('should allow inline entity creation from assessment form', async ({ page }) => {
    // Step 1: Navigate directly to new assessment
    await page.goto('/assessments/new?type=HEALTH');

    // Step 2: Try to select entity - should show create option
    await page.click('[data-testid="entity-selector"]');
    await expect(page.locator('text=Create New Entity')).toBeVisible();

    // Step 3: Click create new entity
    await page.click('text=Create New Entity');
    await expect(page).toHaveURL(/.*entities/);

    // Step 4: Fill entity form quickly
    await page.selectOption('select[id="type"]', 'COMMUNITY');
    await page.fill('input[id="name"]', 'Inline Created Community');
    await page.fill('input[id="lga"]', 'Konduga');
    await page.fill('input[id="ward"]', 'Kawuri Ward');
    await page.fill('input[id="latitude"]', '11.7500');
    await page.fill('input[id="longitude"]', '13.2000');
    
    // Community details
    await page.fill('input[id="communityDetails.communityName"]', 'Kawuri Community');
    await page.fill('input[id="communityDetails.contactPersonName"]', 'Usman Mohammed');
    await page.fill('input[id="communityDetails.contactPersonPhone"]', '+2348098765432');
    await page.fill('input[id="communityDetails.contactPersonRole"]', 'Village Head');

    // Step 5: Submit and return to assessment
    await page.click('button[type="submit"]');
    
    // Should now be able to use the newly created entity in assessment
    await page.goto('/assessments/new?type=HEALTH');
    await page.click('[data-testid="entity-selector"]');
    await expect(page.locator('text=Inline Created Community')).toBeVisible();
  });

  test('should handle entity search and filtering', async ({ page }) => {
    // Create multiple entities first
    await page.goto('/entities');
    
    // Create first entity (Camp)
    await page.click('text=Create New Entity');
    await page.selectOption('select[id="type"]', 'CAMP');
    await page.fill('input[id="name"]', 'Maiduguri Camp Search Test');
    await page.fill('input[id="lga"]', 'Maiduguri');
    await page.fill('input[id="ward"]', 'Central Ward');
    await page.fill('input[id="latitude"]', '11.8469');
    await page.fill('input[id="longitude"]', '13.1511');
    await page.fill('input[id="campDetails.campName"]', 'Maiduguri Camp');
    await page.fill('input[id="campDetails.campCoordinatorName"]', 'Coordinator 1');
    await page.fill('input[id="campDetails.campCoordinatorPhone"]', '+2348011111111');
    await page.click('button[type="submit"]');

    // Create second entity (Community)
    await page.click('text=Create New Entity');
    await page.selectOption('select[id="type"]', 'COMMUNITY');
    await page.fill('input[id="name"]', 'Konduga Community Search Test');
    await page.fill('input[id="lga"]', 'Konduga');
    await page.fill('input[id="ward"]', 'Test Ward');
    await page.fill('input[id="latitude"]', '11.7500');
    await page.fill('input[id="longitude"]', '13.2000');
    await page.fill('input[id="communityDetails.communityName"]', 'Konduga Community');
    await page.fill('input[id="communityDetails.contactPersonName"]', 'Contact 2');
    await page.fill('input[id="communityDetails.contactPersonPhone"]', '+2348022222222');
    await page.fill('input[id="communityDetails.contactPersonRole"]', 'Chief');
    await page.click('button[type="submit"]');

    // Test filtering by type
    await page.selectOption('select:has-text("All Types")', 'IDP Camps');
    await expect(page.locator('text=Maiduguri Camp Search Test')).toBeVisible();
    await expect(page.locator('text=Konduga Community Search Test')).not.toBeVisible();

    await page.selectOption('select:has-text("IDP Camps")', 'Communities');
    await expect(page.locator('text=Konduga Community Search Test')).toBeVisible();
    await expect(page.locator('text=Maiduguri Camp Search Test')).not.toBeVisible();

    // Test search functionality
    await page.selectOption('select:has-text("Communities")', 'All Types');
    await page.fill('input[placeholder="Search entities..."]', 'Maiduguri');
    await expect(page.locator('text=Maiduguri Camp Search Test')).toBeVisible();
    await expect(page.locator('text=Konduga Community Search Test')).not.toBeVisible();

    // Clear search
    await page.fill('input[placeholder="Search entities..."]', '');
    await expect(page.locator('text=Maiduguri Camp Search Test')).toBeVisible();
    await expect(page.locator('text=Konduga Community Search Test')).toBeVisible();
  });

  test('should validate entity form fields correctly', async ({ page }) => {
    await page.goto('/entities');
    await page.click('text=Create New Entity');

    // Try to submit without required fields
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=Entity name is required')).toBeVisible();
    await expect(page.locator('text=LGA is required')).toBeVisible();
    await expect(page.locator('text=Ward is required')).toBeVisible();
    await expect(page.locator('text=Camp name is required')).toBeVisible();

    // Test coordinate validation
    await page.fill('input[id="latitude"]', '91'); // Invalid latitude
    await page.fill('input[id="longitude"]', '181'); // Invalid longitude
    
    await expect(page.locator('text=Coordinates out of valid range')).toBeVisible();

    // Fix coordinates
    await page.fill('input[id="latitude"]', '11.8469');
    await page.fill('input[id="longitude"]', '13.1511');
    
    await expect(page.locator('text=✓ Coordinates are valid')).toBeVisible();

    // Test phone number validation
    await page.fill('input[id="campDetails.campCoordinatorPhone"]', 'invalid-phone');
    await page.blur(); // Trigger validation
    
    // Form should not submit with invalid phone
    await page.fill('input[id="name"]', 'Test Entity');
    await page.fill('input[id="lga"]', 'Test LGA');
    await page.fill('input[id="ward"]', 'Test Ward');
    await page.fill('input[id="campDetails.campName"]', 'Test Camp');
    await page.fill('input[id="campDetails.campCoordinatorName"]', 'Test Coordinator');
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid phone number')).toBeVisible();
  });

  test('should handle offline entity creation', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);

    await page.goto('/entities');
    await page.click('text=Create New Entity');

    // Should show offline indicator
    await expect(page.locator('text=Offline')).toBeVisible();
    await expect(page.locator('text=Will sync when online')).toBeVisible();

    // Fill form
    await page.selectOption('select[id="type"]', 'CAMP');
    await page.fill('input[id="name"]', 'Offline Created Camp');
    await page.fill('input[id="lga"]', 'Test LGA');
    await page.fill('input[id="ward"]', 'Test Ward');
    await page.fill('input[id="latitude"]', '11.8469');
    await page.fill('input[id="longitude"]', '13.1511');
    await page.fill('input[id="campDetails.campName"]', 'Offline Camp');
    await page.fill('input[id="campDetails.campCoordinatorName"]', 'Offline Coordinator');
    await page.fill('input[id="campDetails.campCoordinatorPhone"]', '+2348012345678');

    // Submit form
    await page.click('button[type="submit"]');

    // Should succeed even offline
    await expect(page.locator('h1')).toContainText('Affected Entities');
    await expect(page.locator('text=Offline Created Camp')).toBeVisible();

    // Go back online
    await page.context().setOffline(false);
    await page.reload();

    // Entity should still be there and should sync
    await expect(page.locator('text=Offline Created Camp')).toBeVisible();
  });

  test('should show entity details correctly', async ({ page }) => {
    // Create entity first
    await page.goto('/entities');
    await page.click('text=Create New Entity');
    
    await page.selectOption('select[id="type"]', 'CAMP');
    await page.fill('input[id="name"]', 'Details Test Camp');
    await page.fill('input[id="lga"]', 'Maiduguri');
    await page.fill('input[id="ward"]', 'Central Ward');
    await page.fill('input[id="latitude"]', '11.8469');
    await page.fill('input[id="longitude"]', '13.1511');
    await page.fill('input[id="campDetails.campName"]', 'Details Test Camp');
    await page.fill('input[id="campDetails.campCoordinatorName"]', 'Test Coordinator');
    await page.fill('input[id="campDetails.campCoordinatorPhone"]', '+2348012345678');
    await page.fill('input[id="campDetails.superviserName"]', 'Test Supervisor');
    await page.fill('input[id="campDetails.superviserOrganization"]', 'Test Org');
    await page.fill('input[id="campDetails.estimatedPopulation"]', '2000');
    
    await page.click('button[type="submit"]');

    // Click on the entity to view details
    await page.click('text=Details Test Camp');

    // Should show entity details page
    await expect(page.locator('h1')).toContainText('Details Test Camp');
    await expect(page.locator('text=IDP Camp')).toBeVisible();
    await expect(page.locator('text=Central Ward, Maiduguri')).toBeVisible();
    await expect(page.locator('text=11.846900, 13.151100')).toBeVisible();
    await expect(page.locator('text=Test Coordinator')).toBeVisible();
    await expect(page.locator('text=+2348012345678')).toBeVisible();
    await expect(page.locator('text=Test Supervisor (Test Org)')).toBeVisible();
    await expect(page.locator('text=2,000')).toBeVisible(); // Formatted population

    // Test edit button
    await page.click('text=Edit');
    await expect(page.locator('h1')).toContainText('Edit Entity');
    await expect(page.getByDisplayValue('Details Test Camp')).toBeVisible();
  });
});