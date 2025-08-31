/**
 * End-to-End Test for Story 6.2: Interactive Mapping
 * Tests complete mapping workflow with geographic navigation
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const MAPPING_CONFIG = {
  name: 'Interactive Mapping',
  path: '/monitoring/map',
  apiEndpoints: [
    '/api/v1/monitoring/map/entities',
    '/api/v1/monitoring/map/assessments', 
    '/api/v1/monitoring/map/responses'
  ],
  navigationPath: ['Monitoring', 'Interactive Mapping']
};

async function waitForMapToLoad(page: Page) {
  // Wait for page load state first
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for Leaflet map container to be present and visible
  await page.locator('.leaflet-container').waitFor({ state: 'visible', timeout: 15000 });
  
  // Wait for API responses to complete before checking map content
  await page.waitForResponse(response => 
    response.url().includes('/api/v1/monitoring/map/entities') && response.status() === 200,
    { timeout: 10000 }
  );
  
  // Wait for map content to be ready using modern approach
  await page.waitForFunction(() => {
    const container = document.querySelector('.leaflet-container');
    const markers = document.querySelectorAll('[data-testid="marker"]');
    return container && markers.length > 0;
  }, { timeout: 10000 });
  
  // Ensure no pending network requests for map tiles
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
    // Gracefully handle networkidle timeout - not critical for map functionality
  });
}

async function interceptMapAPIs(page: Page) {
  // Mock map API responses for consistent testing
  await page.route('/api/v1/monitoring/map/entities', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'entity-test-1',
            name: 'Test Camp Alpha',
            type: 'CAMP',
            longitude: 14.5,
            latitude: 12.5,
            coordinates: {
              latitude: 12.5,
              longitude: 14.5,
              accuracy: 10,
              timestamp: new Date().toISOString(),
              captureMethod: 'GPS'
            },
            assessmentCount: 5,
            responseCount: 3,
            lastActivity: new Date().toISOString(),
            statusSummary: {
              pendingAssessments: 2,
              verifiedAssessments: 3,
              activeResponses: 1,
              completedResponses: 2
            }
          }
        ],
        meta: {
          boundingBox: {
            northEast: { latitude: 13.0, longitude: 15.0 },
            southWest: { latitude: 12.0, longitude: 14.0 }
          },
          totalEntities: 1,
          connectionStatus: 'connected'
        }
      })
    });
  });

  await page.route('/api/v1/monitoring/map/assessments', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'assessment-test-1',
            type: 'HEALTH',
            date: new Date().toISOString(),
            assessorName: 'Dr. Test',
            coordinates: {
              latitude: 12.5,
              longitude: 14.5,
              accuracy: 10,
              timestamp: new Date().toISOString(),
              captureMethod: 'GPS'
            },
            entityName: 'Test Camp Alpha',
            verificationStatus: 'VERIFIED',
            priorityLevel: 'HIGH'
          }
        ]
      })
    });
  });

  await page.route('/api/v1/monitoring/map/responses', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'response-test-1',
            responseType: 'FOOD_DISTRIBUTION',
            plannedDate: new Date().toISOString(),
            responderName: 'Field Team Alpha',
            coordinates: {
              latitude: 12.5,
              longitude: 14.5,
              accuracy: 10,
              timestamp: new Date().toISOString(),
              captureMethod: 'GPS'
            },
            entityName: 'Test Camp Alpha',
            status: 'DELIVERED',
            deliveryItems: [
              { item: 'Rice (50kg bags)', quantity: 100 },
              { item: 'Cooking Oil (5L)', quantity: 50 }
            ]
          }
        ]
      })
    });
  });
}

test.describe('Story 6.2: Interactive Mapping E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API interception first
    await interceptMapAPIs(page);
    
    // Navigate to the mapping page with proper wait state
    await page.goto(MAPPING_CONFIG.path, { waitUntil: 'domcontentloaded' });
    
    // Wait for the page to be in a ready state
    await page.waitForLoadState('domcontentloaded');
  });

  test('AC1: Geographic visualization loads and displays entities', async ({ page }) => {
    // Wait for map to fully load before any assertions
    await waitForMapToLoad(page);
    
    // Verify page title and description with retry
    await expect(page.locator('h2')).toContainText('Interactive Mapping', { timeout: 10000 });
    await expect(page.getByText('Geographic visualization of affected entities')).toBeVisible({ timeout: 5000 });

    // Verify map container is present and ready
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 5000 });

    // Verify entity markers are rendered with modern locator
    await expect(page.locator('[data-testid="marker"]')).toHaveCount({ min: 1 }, { timeout: 10000 });

    // Check total entities counter with improved selector
    await expect(page.getByText('Total Entities')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.text-2xl').first()).toContainText('1', { timeout: 5000 });
  });

  test('AC2: Assessment status indicators on map', async ({ page }) => {
    // Wait for map to load completely
    await waitForMapToLoad(page);

    // Verify assessments layer toggle is available with timeout
    await expect(page.getByRole('button', { name: /assessments/i })).toBeVisible({ timeout: 10000 });

    // Toggle assessments layer
    await page.locator('button').filter({ hasText: 'Assessments' }).click();

    // Verify assessment markers are visible (when assessments layer is enabled)
    await expect(page.locator('.assessment-marker, [data-testid="marker"]')).toHaveCount({ min: 1 });
  });

  test('AC3: Response activity overlay', async ({ page }) => {
    // Wait for map to load
    await waitForMapToLoad(page);

    // Verify responses layer toggle
    await expect(page.locator('button').filter({ hasText: 'Responses' })).toBeVisible();

    // Toggle responses layer
    await page.locator('button').filter({ hasText: 'Responses' }).click();

    // Verify response markers display
    await expect(page.locator('.response-marker, [data-testid="marker"]')).toHaveCount({ min: 1 });

    // Check active responses counter
    await expect(page.locator('text=Active Responses').locator('../../..').locator('.text-2xl')).toBeVisible();
  });

  test('AC4: Layer controls and visibility toggles', async ({ page }) => {
    // Wait for map to load
    await waitForMapToLoad(page);

    // Verify all layer control buttons are present
    await expect(page.locator('button').filter({ hasText: 'Entities' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'Assessments' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'Responses' })).toBeVisible();

    // Test layer toggle functionality
    const entitiesButton = page.locator('button').filter({ hasText: 'Entities' });
    
    // Click to toggle entities layer
    await entitiesButton.click();
    
    // Verify layer count updates
    await expect(page.locator('text=Layers active:')).toBeVisible();
  });

  test('Real-time refresh functionality', async ({ page }) => {
    let apiCallCount = 0;
    
    // Count API calls
    page.route('/api/v1/monitoring/map/entities', async (route, request) => {
      apiCallCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
          meta: { totalEntities: apiCallCount, connectionStatus: 'connected' }
        })
      });
    });

    await page.goto(MAPPING_CONFIG.path);
    await waitForMapToLoad(page);

    // Wait for initial load
    await page.waitForTimeout(1000);
    const initialCallCount = apiCallCount;

    // Click refresh button
    await page.locator('button').filter({ hasText: 'Refresh' }).click();
    
    // Verify API was called again
    await page.waitForTimeout(1000);
    expect(apiCallCount).toBeGreaterThan(initialCallCount);
  });

  test('Error handling and connection status', async ({ page }) => {
    // Test offline scenario
    await page.route('/api/v1/monitoring/map/entities', async route => {
      await route.abort('failed');
    });

    await page.goto(MAPPING_CONFIG.path);

    // Should show error state
    await expect(page.locator('text=Unable to load geographic data')).toBeVisible();
    
    // Connection status should reflect offline state
    await expect(page.locator('text=OFFLINE, text=offline')).toBeVisible();
  });

  test('Interactive popup functionality', async ({ page }) => {
    await waitForMapToLoad(page);

    // Click on a marker to open popup
    const marker = page.locator('[data-testid="marker"]').first();
    await marker.click();

    // Verify popup appears with entity details
    await expect(page.locator('[data-testid="popup"]')).toBeVisible();
    
    // Verify popup contains expected information
    await expect(page.locator('text=Test Camp Alpha')).toBeVisible();
    await expect(page.locator('text=Assessments')).toBeVisible();
    await expect(page.locator('text=Responses')).toBeVisible();
  });

  test('Map navigation and zoom controls', async ({ page }) => {
    await waitForMapToLoad(page);

    // Verify Leaflet zoom controls are present
    await expect(page.locator('.leaflet-control-zoom')).toBeVisible();
    await expect(page.locator('.leaflet-control-zoom-in')).toBeVisible();
    await expect(page.locator('.leaflet-control-zoom-out')).toBeVisible();

    // Test zoom in
    await page.locator('.leaflet-control-zoom-in').click();
    await page.waitForTimeout(500);

    // Test zoom out  
    await page.locator('.leaflet-control-zoom-out').click();
    await page.waitForTimeout(500);

    // Verify map center coordinates are displayed
    await expect(page.locator('text=Map center:')).toBeVisible();
  });

  test('Coverage area calculation', async ({ page }) => {
    await waitForMapToLoad(page);

    // Verify coverage area is calculated and displayed
    await expect(page.locator('text=Coverage Area').locator('../../..').locator('.text-2xl')).toBeVisible();
    await expect(page.locator('text=square kilometers covered')).toBeVisible();
  });

  test('Complete mapping workflow navigation', async ({ page }) => {
    // Start from monitoring dashboard
    await page.goto('/monitoring');
    
    // Navigate to interactive mapping
    await page.locator('a[href="/monitoring/map"]').click();
    
    // Verify we're on the mapping page
    await expect(page).toHaveURL('/monitoring/map');
    await expect(page.locator('h2')).toContainText('Interactive Mapping');
    
    // Wait for map to fully load
    await waitForMapToLoad(page);
    
    // Interact with all layer controls
    await page.locator('button').filter({ hasText: 'Entities' }).click();
    await page.locator('button').filter({ hasText: 'Assessments' }).click(); 
    await page.locator('button').filter({ hasText: 'Responses' }).click();
    
    // Use refresh functionality
    await page.locator('button').filter({ hasText: 'Refresh' }).click();
    
    // Verify final state shows all components working
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.locator('text=Last updated:')).toBeVisible();
    await expect(page.locator('text=Layers active:')).toBeVisible();
  });
});