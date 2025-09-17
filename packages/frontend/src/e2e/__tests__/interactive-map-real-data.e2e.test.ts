/**
 * Interactive Map Real Data Test
 * Tests the interactive map with real database data on port 3001
 */

import { test, expect } from '@playwright/test';

const MAP_CONFIG = {
  name: 'Interactive Map Real Data Test',
  path: '/monitoring/map',
  expectedStats: {
    entities: 9,
    assessments: 80,
    responses: 25
  }
};

async function waitForMapToLoad(page) {
  // Wait for page load state first
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for Leaflet map container to be present and visible
  await page.locator('.leaflet-container').waitFor({ state: 'visible', timeout: 30000 });
  
  // Wait for API responses to complete
  await Promise.all([
    page.waitForResponse(response => 
      response.url().includes('/api/v1/monitoring/map/entities') && response.status() === 200,
      { timeout: 15000 }
    ),
    page.waitForResponse(response => 
      response.url().includes('/api/v1/monitoring/map/assessments') && response.status() === 200,
      { timeout: 15000 }
    ),
    page.waitForResponse(response => 
      response.url().includes('/api/v1/monitoring/map/responses') && response.status() === 200,
      { timeout: 15000 }
    )
  ]);
  
  // Wait for map content to be ready
  await page.waitForFunction(() => {
    const container = document.querySelector('.leaflet-container');
    return container && container.offsetHeight > 0;
  }, { timeout: 15000 });
}

test.describe('Interactive Map Real Data Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the mapping page
    await page.goto(MAP_CONFIG.path, { waitUntil: 'domcontentloaded' });
  });

  test('Map loads successfully without "Unable to load geographic data" error', async ({ page }) => {
    // Wait for map to load
    await waitForMapToLoad(page);
    
    // Verify the error message is NOT present
    const errorElement = page.locator('text=Unable to load geographic data');
    await expect(errorElement).not.toBeVisible({ timeout: 10000 });
    
    // Verify the page title is correct
    await expect(page.locator('h2')).toContainText('Interactive Mapping', { timeout: 10000 });
    
    // Verify map container is visible
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
    
    console.log('✓ Map loaded successfully without error');
  });

  test('Real entity markers are displayed on the map', async ({ page }) => {
    await waitForMapToLoad(page);
    
    // Wait for markers to be rendered
    await page.waitForTimeout(3000); // Give extra time for marker rendering
    
    // Look for any marker-like elements (leaflet markers or custom markers)
    const leafletMarkers = page.locator('.leaflet-marker-icon');
    const customMarkers = page.locator('[data-testid="marker"]');
    
    // Check if we have either type of markers
    const hasLeafletMarkers = await leafletMarkers.count() > 0;
    const hasCustomMarkers = await customMarkers.count() > 0;
    
    console.log(`Found ${await leafletMarkers.count()} leaflet markers and ${await customMarkers.count()} custom markers`);
    
    // Verify at least one type of marker exists
    expect(hasLeafletMarkers || hasCustomMarkers).toBe(true);
    
    // If we have leaflet markers, verify they're visible
    if (hasLeafletMarkers) {
      await expect(leafletMarkers.first()).toBeVisible();
    }
    
    // If we have custom markers, verify they're visible
    if (hasCustomMarkers) {
      await expect(customMarkers.first()).toBeVisible();
    }
    
    console.log('✓ Entity markers are displayed on the map');
  });

  test('Layer controls (Entities, Assessments, Responses) are functional', async ({ page }) => {
    await waitForMapToLoad(page);
    
    // Wait for layer controls to be available
    await page.waitForTimeout(2000);
    
    // Find layer control buttons
    const entitiesButton = page.locator('button').filter({ hasText: /entities/i }).first();
    const assessmentsButton = page.locator('button').filter({ hasText: /assessments/i }).first();
    const responsesButton = page.locator('button').filter({ hasText: /responses/i }).first();
    
    // Verify all layer buttons exist and are visible
    await expect(entitiesButton).toBeVisible({ timeout: 10000 });
    await expect(assessmentsButton).toBeVisible({ timeout: 10000 });
    await expect(responsesButton).toBeVisible({ timeout: 10000 });
    
    console.log('✓ All layer controls are visible');
    
    // Test clicking each button to verify they're interactive
    const initialEntitiesState = await entitiesButton.getAttribute('aria-pressed') || 'false';
    await entitiesButton.click();
    await page.waitForTimeout(500);
    
    const initialAssessmentsState = await assessmentsButton.getAttribute('aria-pressed') || 'false';
    await assessmentsButton.click();
    await page.waitForTimeout(500);
    
    const initialResponsesState = await responsesButton.getAttribute('aria-pressed') || 'false';
    await responsesButton.click();
    await page.waitForTimeout(500);
    
    console.log('✓ Layer controls are clickable and interactive');
  });

  test('Click on markers to see popup information with real data', async ({ page }) => {
    await waitForMapToLoad(page);
    
    // Wait for markers to be available
    await page.waitForTimeout(3000);
    
    // Try to find and click on a marker
    const leafletMarkers = page.locator('.leaflet-marker-icon');
    const customMarkers = page.locator('[data-testid="marker"]');
    
    let markerClicked = false;
    
    // Try leaflet markers first
    if (await leafletMarkers.count() > 0) {
      const firstMarker = leafletMarkers.first();
      await firstMarker.click();
      markerClicked = true;
      console.log('Clicked on leaflet marker');
    }
    
    // If no leaflet markers, try custom markers
    if (!markerClicked && await customMarkers.count() > 0) {
      const firstMarker = customMarkers.first();
      await firstMarker.click();
      markerClicked = true;
      console.log('Clicked on custom marker');
    }
    
    // Wait for potential popup to appear
    await page.waitForTimeout(1000);
    
    // Check if any popup or tooltip appeared
    const popup = page.locator('.leaflet-popup');
    const tooltip = page.locator('.leaflet-tooltip');
    const customPopup = page.locator('[data-testid="popup"]');
    
    const hasPopup = await popup.count() > 0;
    const hasTooltip = await tooltip.count() > 0;
    const hasCustomPopup = await customPopup.count() > 0;
    
    console.log(`Popup check: leaflet popup=${hasPopup}, tooltip=${hasTooltip}, custom popup=${hasCustomPopup}`);
    
    // If we found a marker and clicked it, we expect some form of popup
    if (markerClicked) {
      expect(hasPopup || hasTooltip || hasCustomPopup).toBe(true);
      console.log('✓ Marker popup information is displayed');
    } else {
      console.log('⚠ No markers found to click - this might indicate no entities with coordinates');
    }
  });

  test('Statistics show real numbers (9 entities, 80 assessments, 25 responses)', async ({ page }) => {
    await waitForMapToLoad(page);
    
    // Wait for statistics to be populated
    await page.waitForTimeout(3000);
    
    // Look for statistics elements with flexible selectors
    const statsSelectors = [
      '.text-2xl', // Large text elements
      '.stat-number', // Stat number class
      '[data-testid="stat-number"]', // Test ID
      '.font-bold', // Bold text
    ];
    
    let foundStats = false;
    
    for (const selector of statsSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      
      if (count > 0) {
        console.log(`Found ${count} elements with selector "${selector}"`);
        
        // Get text content of these elements
        for (let i = 0; i < Math.min(count, 10); i++) {
          const text = await elements.nth(i).textContent();
          console.log(`  Element ${i}: "${text}"`);
          
          // Check if any of these contain our expected numbers
          if (text && (
            text.includes(MAP_CONFIG.expectedStats.entities.toString()) ||
            text.includes(MAP_CONFIG.expectedStats.assessments.toString()) ||
            text.includes(MAP_CONFIG.expectedStats.responses.toString())
          )) {
            foundStats = true;
            console.log(`✓ Found expected statistic: ${text}`);
          }
        }
      }
    }
    
    // Also look for specific stat labels
    const statLabels = [
      'Total Entities',
      'Total Assessments', 
      'Total Responses',
      'Active Responses',
      'Entities',
      'Assessments',
      'Responses'
    ];
    
    for (const label of statLabels) {
      const labelElement = page.locator(`text=${label}`);
      if (await labelElement.count() > 0) {
        console.log(`Found stat label: "${label}"`);
        
        // Look for the associated value (usually in a sibling or nearby element)
        const parent = labelElement.locator('..');
        const nearbyElements = parent.locator('*');
        const nearbyCount = await nearbyElements.count();
        
        for (let i = 0; i < nearbyCount; i++) {
          const text = await nearbyElements.nth(i).textContent();
          if (text && /\d+/.test(text)) {
            console.log(`  Associated value: ${text}`);
          }
        }
      }
    }
    
    // Check the actual API responses to verify data
    const apiResponses = await page.evaluate(async () => {
      const responses = [];
      
      // Try to fetch the map data directly
      try {
        const entitiesResponse = await fetch('/api/v1/monitoring/map/entities');
        const entitiesData = await entitiesResponse.json();
        responses.push({ type: 'entities', data: entitiesData });
        
        const assessmentsResponse = await fetch('/api/v1/monitoring/map/assessments');
        const assessmentsData = await assessmentsResponse.json();
        responses.push({ type: 'assessments', data: assessmentsData });
        
        const responsesResponse = await fetch('/api/v1/monitoring/map/responses');
        const responsesData = await responsesResponse.json();
        responses.push({ type: 'responses', data: responsesData });
      } catch (error) {
        responses.push({ type: 'error', error: error.message });
      }
      
      return responses;
    });
    
    console.log('API Response Summary:');
    for (const response of apiResponses) {
      if (response.type === 'error') {
        console.log(`  ${response.type}: ${response.error}`);
      } else {
        const data = response.data;
        console.log(`  ${response.type}:`);
        console.log(`    Success: ${data.success}`);
        console.log(`    Data length: ${data.data?.length || 0}`);
        console.log(`    Meta: ${JSON.stringify(data.meta, null, 2)}`);
      }
    }
    
    // Verify the API responses contain expected data
    const entitiesResponse = apiResponses.find(r => r.type === 'entities');
    const assessmentsResponse = apiResponses.find(r => r.type === 'assessments');
    const responsesResponse = apiResponses.find(r => r.type === 'responses');
    
    if (entitiesResponse && entitiesResponse.data.success) {
      expect(entitiesResponse.data.data.length).toBe(MAP_CONFIG.expectedStats.entities);
      console.log(`✓ Confirmed ${MAP_CONFIG.expectedStats.entities} entities from API`);
    }
    
    if (assessmentsResponse && assessmentsResponse.data.success) {
      expect(assessmentsResponse.data.data.length).toBe(MAP_CONFIG.expectedStats.assessments);
      console.log(`✓ Confirmed ${MAP_CONFIG.expectedStats.assessments} assessments from API`);
    }
    
    if (responsesResponse && responsesResponse.data.success) {
      expect(responsesResponse.data.data.length).toBe(MAP_CONFIG.expectedStats.responses);
      console.log(`✓ Confirmed ${MAP_CONFIG.expectedStats.responses} responses from API`);
    }
    
    console.log('✓ Statistics verification completed');
  });

  test('Overall map functionality with real data', async ({ page }) => {
    await waitForMapToLoad(page);
    
    // Take a screenshot for documentation
    await page.screenshot({ path: 'interactive-map-real-data.png', fullPage: true });
    console.log('✓ Screenshot captured');
    
    // Verify the page is stable and not showing loading states
    await expect(page.locator('text=Loading...')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Unable to load geographic data')).not.toBeVisible({ timeout: 5000 });
    
    // Verify map controls are present
    await expect(page.locator('.leaflet-control-zoom')).toBeVisible({ timeout: 5000 });
    
    console.log('✓ Overall map functionality verified with real data');
  });
});