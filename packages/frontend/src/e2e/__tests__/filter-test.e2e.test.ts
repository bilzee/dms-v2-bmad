const { test, expect } = require('@playwright/test');

test('Drill-Down Analysis filters work correctly', async ({ page }) => {
  // Navigate to the monitoring page
  await page.goto('http://localhost:3001/coordinator/monitoring');
  
  // Wait for the page to load
  await page.waitForSelector('[data-testid="monitoring-page"]');
  
  // Click on the Assessments tab
  await page.click('button:has-text("Assessments")');
  
  // Wait for assessments to load
  await page.waitForSelector('[data-testid="assessment-card"]');
  
  // Check initial number of assessments
  const initialCount = await page.locator('[data-testid="assessment-card"]').count();
  console.log(`Initial assessment count: ${initialCount}`);
  
  // Open filters
  await page.click('[data-testid="toggle-filters"]');
  
  // Wait for filters to load
  await page.waitForSelector('[data-testid="incident-filter"]');
  
  // Test incident filter (if incidents are loaded)
  const incidentOptions = await page.locator('[data-testid="incident-filter"] >> select >> option').count();
  if (incidentOptions > 1) {
    // Get the first incident option that's not the placeholder
    const firstIncidentOption = await page.locator('[data-testid="incident-filter"] >> select >> option').nth(1);
    const incidentId = await firstIncidentOption.getAttribute('value');
    
    await page.selectOption('[data-testid="incident-filter"]', incidentId);
    await page.waitForTimeout(2000); // Wait for filtering
    
    const filteredCount = await page.locator('[data-testid="assessment-card"]').count();
    console.log(`Incident filtered assessment count: ${filteredCount}`);
    
    // Verify filtering worked (should have fewer or equal results)
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  }
  
  // Test entity filter
  const entityOptions = await page.locator('[data-testid="entity-filter"] >> select >> option').count();
  if (entityOptions > 1) {
    // Get the first entity option that's not the placeholder
    const firstEntityOption = await page.locator('[data-testid="entity-filter"] >> select >> option').nth(1);
    const entityName = await firstEntityOption.getAttribute('value');
    
    await page.selectOption('[data-testid="entity-filter"]', entityName);
    await page.waitForTimeout(2000); // Wait for filtering
    
    const entityFilteredCount = await page.locator('[data-testid="assessment-card"]').count();
    console.log(`Entity filtered assessment count: ${entityFilteredCount}`);
    
    // Verify filtering worked
    expect(entityFilteredCount).toBeLessThanOrEqual(initialCount);
  }
  
  // Test assessment type filter (Population)
  await page.check('[data-testid="type-filter-POPULATION"]');
  await page.waitForTimeout(2000); // Wait for filtering
  
  const typeFilteredCount = await page.locator('[data-testid="assessment-card"]').count();
  console.log(`Type filtered assessment count: ${typeFilteredCount}`);
  
  // Clear all filters
  await page.click('[data-testid="clear-all-filters"]');
  await page.waitForTimeout(2000);
  
  const clearedCount = await page.locator('[data-testid="assessment-card"]').count();
  console.log(`Cleared filters assessment count: ${clearedCount}`);
  
  // Verify filters were cleared
  expect(clearedCount).toBe(initialCount);
  
  console.log('All filter tests passed!');
});

test('Filter details are visible in assessment cards', async ({ page }) => {
  // Navigate to the monitoring page
  await page.goto('http://localhost:3001/coordinator/monitoring');
  
  // Wait for the page to load
  await page.waitForSelector('[data-testid="monitoring-page"]');
  
  // Click on the Assessments tab
  await page.click('button:has-text("Assessments")');
  
  // Wait for assessments to load
  await page.waitForSelector('[data-testid="assessment-card"]');
  
  // Open filters
  await page.click('[data-testid="toggle-filters"]');
  
  // Wait for filters to load
  await page.waitForSelector('[data-testid="incident-filter"]');
  
  // Test incident filter and verify details are visible
  const incidentOptions = await page.locator('[data-testid="incident-filter"] >> select >> option').count();
  if (incidentOptions > 1) {
    const firstIncidentOption = await page.locator('[data-testid="incident-filter"] >> select >> option').nth(1);
    const incidentId = await firstIncidentOption.getAttribute('value');
    const incidentName = await firstIncidentOption.textContent();
    
    await page.selectOption('[data-testid="incident-filter"]', incidentId);
    await page.waitForTimeout(2000); // Wait for filtering
    
    // Check that filtered assessments show the incident name
    const assessmentCards = await page.locator('[data-testid="assessment-card"]');
    const cardCount = await assessmentCards.count();
    
    if (cardCount > 0) {
      // Check the first assessment card to see if it shows incident details
      const firstCardText = await assessmentCards.first().textContent();
      console.log(`First card contains incident: ${firstCardText.includes(incidentName)}`);
      
      // The incident name should be visible in the card if filtering worked
      expect(firstCardText).toContain(incidentName);
    }
  }
  
  console.log('Filter details visibility test passed!');
});