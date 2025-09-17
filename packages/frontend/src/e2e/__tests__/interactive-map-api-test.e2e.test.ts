/**
 * Interactive Map API Test
 * Tests the map API endpoints directly to verify data is working
 */

import { test, expect } from '@playwright/test';

const MAP_CONFIG = {
  name: 'Interactive Map API Test',
  path: '/monitoring/map',
  apiEndpoints: [
    '/api/v1/monitoring/map/entities',
    '/api/v1/monitoring/map/assessments', 
    '/api/v1/monitoring/map/responses'
  ],
  expectedStats: {
    entities: 9,
    assessments: 80,
    responses: 25
  },
  testUser: {
    email: 'admin@test.com',
    password: 'admin123'
  }
};

async function login(page) {
  console.log('Logging in as test user...');
  
  // Navigate to login page
  await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
  
  // Fill in login form
  await page.locator('input[type="email"]').fill(MAP_CONFIG.testUser.email);
  await page.locator('input[type="password"]').fill(MAP_CONFIG.testUser.password);
  
  // Click login button
  await page.locator('button[type="submit"]').click();
  
  // Wait for login to complete
  await page.waitForURL('/', { timeout: 10000 });
  
  console.log('✓ Login successful');
}

async function testAPIEndpoint(page, endpoint, expectedCount) {
  console.log(`Testing API endpoint: ${endpoint}`);
  
  try {
    const response = await page.request.get(`http://localhost:3001${endpoint}`);
    
    console.log(`  Status: ${response.status()}`);
    console.log(`  Headers: ${JSON.stringify(response.headers(), null, 2)}`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    console.log(`  Response data:`, JSON.stringify(data, null, 2));
    
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data)).toBe(true);
    
    if (expectedCount) {
      expect(data.data.length).toBe(expectedCount);
      console.log(`  ✓ Expected count matches: ${expectedCount}`);
    }
    
    return data;
  } catch (error) {
    console.error(`  ✗ API endpoint failed: ${error.message}`);
    throw error;
  }
}

test.describe('Interactive Map API Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await login(page);
  });

  test('All map API endpoints return correct data', async ({ page }) => {
    // Test all endpoints
    const entitiesData = await testAPIEndpoint(page, '/api/v1/monitoring/map/entities', MAP_CONFIG.expectedStats.entities);
    const assessmentsData = await testAPIEndpoint(page, '/api/v1/monitoring/map/assessments', MAP_CONFIG.expectedStats.assessments);
    const responsesData = await testAPIEndpoint(page, '/api/v1/monitoring/map/responses', MAP_CONFIG.expectedStats.responses);
    
    console.log('✓ All API endpoints returned expected data');
    
    // Verify data structure
    expect(entitiesData.data[0]).toHaveProperty('id');
    expect(entitiesData.data[0]).toHaveProperty('name');
    expect(entitiesData.data[0]).toHaveProperty('coordinates');
    expect(entitiesData.data[0].coordinates).toHaveProperty('latitude');
    expect(entitiesData.data[0].coordinates).toHaveProperty('longitude');
    
    console.log('✓ Entities data structure is correct');
    
    // Verify coordinates are within reasonable bounds for Borno State, Nigeria
    entitiesData.data.forEach(entity => {
      expect(entity.coordinates.latitude).toBeGreaterThan(10);
      expect(entity.coordinates.latitude).toBeLessThan(14);
      expect(entity.coordinates.longitude).toBeGreaterThan(11);
      expect(entity.coordinates.longitude).toBeLessThan(16);
    });
    
    console.log('✓ Entity coordinates are within expected range for Borno State, Nigeria');
  });

  test('Map page loads successfully after login', async ({ page }) => {
    // Navigate to map page
    await page.goto(MAP_CONFIG.path, { waitUntil: 'domcontentloaded' });
    
    // Verify we're on the map page
    await expect(page).toHaveURL(MAP_CONFIG.path);
    
    // Check if page loads without critical errors
    const pageContent = await page.content();
    
    // Look for page title
    expect(pageContent).toContain('Interactive Mapping');
    
    // Check for JavaScript errors
    page.on('pageerror', error => {
      console.error('Page error:', error);
      throw error;
    });
    
    // Wait a bit for any dynamic content to load
    await page.waitForTimeout(3000);
    
    console.log('✓ Map page loaded successfully');
  });

  test('Map API endpoints work with authentication', async ({ page }) => {
    // Test that endpoints require authentication by trying without session
    const context = page.context();
    const newPage = await context.newPage();
    
    // Try to access API without authentication
    const response = await newPage.request.get(`http://localhost:3001/api/v1/monitoring/map/entities`);
    
    // Should either redirect or return unauthorized
    expect([401, 302, 307]).toContain(response.status());
    
    await newPage.close();
    
    console.log('✓ API endpoints properly require authentication');
  });

  test('Verify real data content', async ({ page }) => {
    const entitiesData = await testAPIEndpoint(page, '/api/v1/monitoring/map/entities', MAP_CONFIG.expectedStats.entities);
    
    // Verify we have real entity data with proper structure
    expect(entitiesData.data.length).toBeGreaterThan(0);
    
    // Check for specific entities that should exist
    const entityNames = entitiesData.data.map(e => e.name);
    console.log('Entity names found:', entityNames);
    
    // Verify we have entities in Borno State
    const hasBornoEntities = entitiesData.data.some(entity => 
      entity.name && (
        entity.name.toLowerCase().includes('borno') ||
        entity.name.toLowerCase().includes('maiduguri') ||
        entity.name.toLowerCase().includes('ngala') ||
        entity.name.toLowerCase().includes('damasak')
      )
    );
    
    if (hasBornoEntities) {
      console.log('✓ Found entities in Borno State');
    } else {
      console.log('ℹ No Borno-specific entity names found, but coordinates should be in Borno');
    }
    
    // Verify coordinate accuracy
    entitiesData.data.forEach(entity => {
      expect(entity.coordinates.accuracy).toBeGreaterThan(0);
      expect(entity.coordinates.accuracy).toBeLessThan(1000); // Reasonable GPS accuracy
    });
    
    console.log('✓ Entity data has proper GPS accuracy');
  });

  test('Response data has proper delivery status', async ({ page }) => {
    const responsesData = await testAPIEndpoint(page, '/api/v1/monitoring/map/responses', MAP_CONFIG.expectedStats.responses);
    
    // Verify responses have delivery status
    expect(responsesData.data.length).toBeGreaterThan(0);
    
    const deliveryStatuses = responsesData.data.map(r => r.status);
    console.log('Delivery statuses found:', deliveryStatuses);
    
    // Check for various delivery statuses
    const validStatuses = ['PLANNED', 'IN_PROGRESS', 'DELIVERED', 'FAILED', 'CANCELLED'];
    responsesData.data.forEach(response => {
      expect(validStatuses).toContain(response.status);
    });
    
    console.log('✓ Response data has proper delivery status');
  });

  test('Assessment data has proper verification status', async ({ page }) => {
    const assessmentsData = await testAPIEndpoint(page, '/api/v1/monitoring/map/assessments', MAP_CONFIG.expectedStats.assessments);
    
    // Verify assessments have verification status
    expect(assessmentsData.data.length).toBeGreaterThan(0);
    
    const verificationStatuses = assessmentsData.data.map(a => a.verificationStatus);
    console.log('Verification statuses found:', verificationStatuses);
    
    // Check for various verification statuses
    const validStatuses = ['PENDING', 'VERIFIED', 'REJECTED'];
    assessmentsData.data.forEach(assessment => {
      expect(validStatuses).toContain(assessment.verificationStatus);
    });
    
    console.log('✓ Assessment data has proper verification status');
  });

  test('API meta information is correct', async ({ page }) => {
    const entitiesData = await testAPIEndpoint(page, '/api/v1/monitoring/map/entities', MAP_CONFIG.expectedStats.entities);
    
    // Verify meta information
    expect(entitiesData.meta).toBeDefined();
    expect(entitiesData.meta.totalEntities).toBe(MAP_CONFIG.expectedStats.entities);
    expect(entitiesData.meta.connectionStatus).toBe('connected');
    
    // Check bounding box if present
    if (entitiesData.meta.boundingBox) {
      const { northEast, southWest } = entitiesData.meta.boundingBox;
      expect(northEast.latitude).toBeGreaterThan(southWest.latitude);
      expect(northEast.longitude).toBeGreaterThan(southWest.longitude);
      console.log('✓ Bounding box is valid');
    }
    
    console.log('✓ API meta information is correct');
  });
});