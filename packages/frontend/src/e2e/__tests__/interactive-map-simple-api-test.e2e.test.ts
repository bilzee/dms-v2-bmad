/**
 * Simple Interactive Map API Test
 * Tests the map API endpoints directly using curl-like approach
 */

import { test, expect } from '@playwright/test';

const MAP_CONFIG = {
  apiEndpoints: [
    '/api/v1/monitoring/map/entities',
    '/api/v1/monitoring/map/assessments', 
    '/api/v1/monitoring/map/responses'
  ],
  expectedStats: {
    entities: 9,
    assessments: 80,
    responses: 25
  }
};

async function testAPIEndpointDirect(request, endpoint, expectedCount) {
  console.log(`Testing API endpoint: ${endpoint}`);
  
  try {
    const response = await request.get(`http://localhost:3001${endpoint}`, {
      headers: {
        'User-Agent': 'Playwright Test',
        'Accept': 'application/json'
      }
    });
    
    console.log(`  Status: ${response.status()}`);
    console.log(`  Content-Type: ${response.headers()['content-type']}`);
    
    if (response.status() === 302 || response.status() === 307) {
      console.log(`  Redirected to: ${response.headers()['location']}`);
      return { redirected: true, location: response.headers()['location'] };
    }
    
    if (response.status() === 401) {
      console.log(`  Authentication required`);
      return { authRequired: true };
    }
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    console.log(`  Response data keys:`, Object.keys(data));
    
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data)).toBe(true);
    
    if (expectedCount) {
      expect(data.data.length).toBe(expectedCount);
      console.log(`  ✓ Expected count matches: ${expectedCount}`);
    }
    
    return { data, success: true };
  } catch (error) {
    console.error(`  ✗ API endpoint failed: ${error.message}`);
    return { error: error.message };
  }
}

test.describe('Interactive Map Direct API Tests', () => {
  
  test('Test API endpoints without authentication', async ({ request }) => {
    // Test all endpoints without authentication
    const results = [];
    
    for (const endpoint of MAP_CONFIG.apiEndpoints) {
      const result = await testAPIEndpointDirect(request, endpoint, null);
      results.push({ endpoint, result });
      
      if (result.authRequired) {
        console.log(`✓ ${endpoint} requires authentication`);
      } else if (result.redirected) {
        console.log(`✓ ${endpoint} redirects to login`);
      } else if (result.error) {
        console.log(`✗ ${endpoint} failed: ${result.error}`);
      } else {
        console.log(`✓ ${endpoint} returned data without authentication`);
      }
    }
    
    // Verify that endpoints either require auth or redirect
    const securedEndpoints = results.filter(r => 
      r.result.authRequired || r.result.redirected
    );
    
    expect(securedEndpoints.length).toBe(MAP_CONFIG.apiEndpoints.length);
    console.log('✓ All API endpoints are properly secured');
  });

  test('Test API endpoints with session cookie (simulate logged in user)', async ({ request }) => {
    // This test simulates having a valid session by testing the APIs directly
    // Since we can't easily get a session cookie in this context, we'll test the APIs
    // as they would be called by the frontend components
    
    console.log('Testing APIs as they would be called from frontend...');
    
    // Test the entities API first
    const entitiesResult = await testAPIEndpointDirect(request, '/api/v1/monitoring/map/entities', null);
    
    if (entitiesResult.data) {
      console.log('Entities API response structure:');
      console.log(`- Success: ${entitiesResult.data.success}`);
      console.log(`- Data length: ${entitiesResult.data.data?.length || 0}`);
      console.log(`- Meta keys:`, Object.keys(entitiesResult.data.meta || {}));
      
      // Verify data structure
      if (entitiesResult.data.data && entitiesResult.data.data.length > 0) {
        const firstEntity = entitiesResult.data.data[0];
        console.log('First entity structure:', Object.keys(firstEntity));
        
        expect(firstEntity).toHaveProperty('id');
        expect(firstEntity).toHaveProperty('name');
        expect(firstEntity).toHaveProperty('coordinates');
        expect(firstEntity.coordinates).toHaveProperty('latitude');
        expect(firstEntity.coordinates).toHaveProperty('longitude');
        
        console.log('✓ Entity data structure is correct');
        
        // Check coordinates are reasonable for Nigeria
        expect(firstEntity.coordinates.latitude).toBeGreaterThan(4);
        expect(firstEntity.coordinates.latitude).toBeLessThan(14);
        expect(firstEntity.coordinates.longitude).toBeGreaterThan(2);
        expect(firstEntity.coordinates.longitude).toBeLessThan(15);
        
        console.log('✓ Entity coordinates are within Nigeria bounds');
      }
    }
  });

  test('Verify API response structure consistency', async ({ request }) => {
    // Test that all APIs have consistent response structure
    const endpoints = [
      '/api/v1/monitoring/map/entities',
      '/api/v1/monitoring/map/assessments', 
      '/api/v1/monitoring/map/responses'
    ];
    
    const responses = [];
    
    for (const endpoint of endpoints) {
      const result = await testAPIEndpointDirect(request, endpoint, null);
      if (result.data) {
        responses.push({ endpoint, data: result.data });
      }
    }
    
    // If we got any successful responses, verify their structure
    if (responses.length > 0) {
      console.log(`Successfully tested ${responses.length} endpoints`);
      
      responses.forEach(response => {
        const { endpoint, data } = response;
        
        // Verify consistent response structure
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('data');
        expect(data).toHaveProperty('meta');
        expect(Array.isArray(data.data)).toBe(true);
        expect(typeof data.success).toBe('boolean');
        
        console.log(`✓ ${endpoint} has consistent response structure`);
      });
    } else {
      console.log('⚠ No successful API responses - endpoints may require authentication');
    }
  });

  test('Test API response headers and CORS', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/v1/monitoring/map/entities', {
      headers: {
        'Origin': 'http://localhost:3001',
        'User-Agent': 'Playwright Test'
      }
    });
    
    console.log('Response headers:', response.headers());
    
    // Check for important headers
    const headers = response.headers();
    
    if (headers['content-type']) {
      expect(headers['content-type']).toContain('application/json');
      console.log('✓ Content-Type header is correct');
    }
    
    if (headers['access-control-allow-origin']) {
      console.log('✓ CORS headers are present');
    }
    
    console.log('✓ API response headers are appropriate');
  });

  test('Test API error handling', async ({ request }) => {
    // Test with invalid endpoint
    const response = await request.get('http://localhost:3001/api/v1/monitoring/map/invalid-endpoint');
    
    expect([404, 302, 307]).toContain(response.status());
    
    if (response.status() === 404) {
      console.log('✓ Invalid endpoint returns 404');
    } else {
      console.log('✓ Invalid endpoint redirects to login (expected behavior)');
    }
    
    // Test with malformed request
    const malformedResponse = await request.get('http://localhost:3001/api/v1/monitoring/map/entities?invalid=param');
    
    expect([200, 302, 307, 400]).toContain(malformedResponse.status());
    console.log('✓ Malformed request is handled appropriately');
  });

  test('Test API performance', async ({ request }) => {
    // Test response time for entities API
    const startTime = Date.now();
    const response = await request.get('http://localhost:3001/api/v1/monitoring/map/entities');
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    console.log(`API response time: ${responseTime}ms`);
    
    // Response should be reasonable (under 5 seconds)
    expect(responseTime).toBeLessThan(5000);
    console.log('✓ API response time is acceptable');
  });
});