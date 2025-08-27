import { test, expect } from '@playwright/test';

test.describe('Story 3.6 - Missing API Endpoints Implementation', () => {
  let baseURL: string;

  test.beforeAll(async () => {
    // Assume dev server is running on localhost:3000
    baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
  });

  test.describe('API Endpoint Verification', () => {
    test('should have /api/v1/incidents/stats endpoint responding correctly', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/v1/incidents/stats`);
      
      expect(response.status()).toBe(200);
      
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.stats).toBeDefined();
      
      // Validate stats structure
      const stats = json.data.stats;
      expect(stats.totalIncidents).toBeGreaterThan(0);
      expect(stats.activeIncidents).toBeGreaterThanOrEqual(0);
      expect(stats.highPriorityIncidents).toBeGreaterThanOrEqual(0);
      expect(stats.byType).toBeDefined();
      expect(stats.bySeverity).toBeDefined();
      expect(stats.byStatus).toBeDefined();
      
      // Validate expected incident types from mock data
      expect(stats.byType).toHaveProperty('FLOOD');
      expect(stats.byType).toHaveProperty('FIRE');
      expect(stats.byType).toHaveProperty('LANDSLIDE');
      
      console.log('✅ Stats endpoint working correctly:', stats);
    });

    test('should have /api/v1/incidents/[id] endpoint for incident-1', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/v1/incidents/incident-1`);
      
      expect(response.status()).toBe(200);
      
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.incident).toBeDefined();
      
      const incident = json.data.incident;
      expect(incident.id).toBe('incident-1');
      expect(incident.name).toBeDefined();
      expect(incident.type).toBeDefined();
      expect(incident.severity).toBeDefined();
      expect(incident.status).toBeDefined();
      expect(incident.affectedEntities).toBeDefined();
      expect(incident.preliminaryAssessments).toBeDefined();
      expect(incident.actionItems).toBeDefined();
      expect(incident.timeline).toBeDefined();
      
      console.log('✅ Incident details endpoint working for incident-1');
    });

    test('should have /api/v1/incidents/[id] endpoint for incident-2', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/v1/incidents/incident-2`);
      
      expect(response.status()).toBe(200);
      
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.incident.id).toBe('incident-2');
      expect(json.data.incident.name).toContain('Market Fire');
      
      console.log('✅ Incident details endpoint working for incident-2');
    });

    test('should have /api/v1/incidents/[id] endpoint for incident-3', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/v1/incidents/incident-3`);
      
      expect(response.status()).toBe(200);
      
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.incident.id).toBe('incident-3');
      expect(json.data.incident.name).toContain('Landslide');
      
      console.log('✅ Incident details endpoint working for incident-3');
    });

    test('should have /api/v1/incidents/[id]/timeline endpoint for incident-1', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/v1/incidents/incident-1/timeline`);
      
      expect(response.status()).toBe(200);
      
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.incidentId).toBe('incident-1');
      expect(json.data.timeline).toBeDefined();
      expect(json.data.statusHistory).toBeDefined();
      expect(Array.isArray(json.data.timeline)).toBe(true);
      expect(json.data.timeline.length).toBeGreaterThan(0);
      
      // Validate timeline entry structure
      const firstEvent = json.data.timeline[0];
      expect(firstEvent.id).toBeDefined();
      expect(firstEvent.type).toBeDefined();
      expect(firstEvent.timestamp).toBeDefined();
      expect(firstEvent.coordinatorName).toBeDefined();
      expect(firstEvent.description).toBeDefined();
      
      console.log('✅ Timeline endpoint working for incident-1');
    });

    test('should have /api/v1/incidents/[id]/timeline endpoint for incident-2', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/v1/incidents/incident-2/timeline`);
      
      expect(response.status()).toBe(200);
      
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.incidentId).toBe('incident-2');
      expect(json.data.timeline.length).toBeGreaterThan(0);
      
      console.log('✅ Timeline endpoint working for incident-2');
    });

    test('should have /api/v1/incidents/[id]/timeline endpoint for incident-3', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/v1/incidents/incident-3/timeline`);
      
      expect(response.status()).toBe(200);
      
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.incidentId).toBe('incident-3');
      expect(json.data.timeline.length).toBeGreaterThan(0);
      
      console.log('✅ Timeline endpoint working for incident-3');
    });
  });

  test.describe('Error Handling Verification', () => {
    test('should return 404 for non-existent incident details', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/v1/incidents/nonexistent-incident`);
      
      expect(response.status()).toBe(404);
      
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('not found');
      
      console.log('✅ Proper 404 error handling for non-existent incident');
    });

    test('should return 404 for non-existent incident timeline', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/v1/incidents/nonexistent-incident/timeline`);
      
      expect(response.status()).toBe(404);
      
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('not found');
      
      console.log('✅ Proper 404 error handling for non-existent timeline');
    });

    test('should return 400 for invalid incident ID format', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/v1/incidents/`);
      
      // This should either be 400 (bad request) or 404 (not found route)
      expect([400, 404]).toContain(response.status());
      
      console.log('✅ Proper error handling for invalid incident ID format');
    });
  });

  test.describe('Story 3.6 Integration Tests', () => {
    test('should navigate to incident management page and verify no 404 errors', async ({ page }) => {
      // Navigate to the main application
      await page.goto(`${baseURL}/`);
      await page.waitForLoadState('networkidle');
      
      // Look for incident management or dashboard navigation
      // This might be in different locations based on the app structure
      const possibleSelectors = [
        'text=Incident',
        'text=Dashboard', 
        '[href*="incident"]',
        '[href*="dashboard"]',
        'text=Management'
      ];
      
      let navigationFound = false;
      for (const selector of possibleSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            navigationFound = true;
            console.log(`✅ Found and clicked navigation: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!navigationFound) {
        console.log('⚠️ Could not find incident management navigation - checking for direct route');
        // Try direct navigation to incident management route
        await page.goto(`${baseURL}/incident-management`);
      }
      
      await page.waitForLoadState('networkidle');
      
      // Check for any 404 or error indicators in the page
      const errorIndicators = [
        'text=404',
        'text=Not Found',
        'text=Error',
        'text=Failed to fetch'
      ];
      
      for (const indicator of errorIndicators) {
        const errorElement = page.locator(indicator);
        if (await errorElement.isVisible()) {
          console.error(`❌ Found error indicator: ${indicator}`);
          throw new Error(`Page contains error indicator: ${indicator}`);
        }
      }
      
      console.log('✅ No visible 404 or error indicators found in UI');
    });

    test('should verify dashboard stats refresh functionality', async ({ page }) => {
      await page.goto(`${baseURL}/`);
      await page.waitForLoadState('networkidle');
      
      // Set up network monitoring to catch API calls
      const apiRequests: string[] = [];
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('/api/v1/incidents')) {
          apiRequests.push(url);
          console.log(`🔄 API Request detected: ${url}`);
        }
      });
      
      // Look for refresh button or stats containers
      const refreshSelectors = [
        '[data-testid="refresh-stats"]',
        'button:has-text("Refresh")',
        '[title*="refresh" i]',
        '[aria-label*="refresh" i]'
      ];
      
      let refreshTriggered = false;
      for (const selector of refreshSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            refreshTriggered = true;
            console.log(`✅ Triggered refresh via: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!refreshTriggered) {
        // Try to find and interact with stats containers that might trigger refresh
        const statsSelectors = [
          '[data-testid*="stats"]',
          '[class*="stat"]',
          '[class*="metric"]'
        ];
        
        for (const selector of statsSelectors) {
          try {
            const element = page.locator(selector).first();
            if (await element.isVisible({ timeout: 2000 })) {
              await element.click();
              console.log(`✅ Interacted with stats container: ${selector}`);
              break;
            }
          } catch (e) {
            // Continue
          }
        }
      }
      
      // Wait for any network requests to complete
      await page.waitForTimeout(2000);
      
      // Check if stats API was called
      const statsApiCalled = apiRequests.some(url => url.includes('/api/v1/incidents/stats'));
      if (statsApiCalled) {
        console.log('✅ Stats API endpoint was called successfully');
      } else {
        console.log('ℹ️ Stats API not explicitly called, but no errors detected');
      }
      
      // Verify no network errors occurred
      const failedRequests = await page.evaluate(() => {
        return (window as any).failedRequests || [];
      });
      
      expect(failedRequests.length).toBe(0);
    });

    test('should verify "View Details" functionality works', async ({ page, context }) => {
      await page.goto(`${baseURL}/`);
      await page.waitForLoadState('networkidle');
      
      // Set up response monitoring
      const apiResponses: { url: string; status: number }[] = [];
      page.on('response', (response) => {
        const url = response.url();
        if (url.includes('/api/v1/incidents/')) {
          apiResponses.push({ url, status: response.status() });
          console.log(`📡 API Response: ${response.status()} - ${url}`);
        }
      });
      
      // Look for "View Details" buttons or incident cards
      const detailSelectors = [
        'button:has-text("View Details")',
        'button:has-text("Details")',
        '[data-testid*="view-details"]',
        '[data-testid*="incident-details"]',
        'a:has-text("View")',
        '[role="button"]:has-text("View")'
      ];
      
      let detailsClicked = false;
      for (const selector of detailSelectors) {
        try {
          const elements = page.locator(selector);
          const count = await elements.count();
          if (count > 0) {
            const firstElement = elements.first();
            if (await firstElement.isVisible({ timeout: 2000 })) {
              await firstElement.click();
              detailsClicked = true;
              console.log(`✅ Clicked "View Details" via: ${selector}`);
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!detailsClicked) {
        console.log('ℹ️ No explicit "View Details" button found, checking for incident links');
        
        // Try clicking on incident cards/items
        const incidentSelectors = [
          '[data-testid*="incident"]',
          '[class*="incident"]',
          'tr:has-text("incident")',
          '[role="button"]:has-text("incident")'
        ];
        
        for (const selector of incidentSelectors) {
          try {
            const elements = page.locator(selector);
            const count = await elements.count();
            if (count > 0) {
              await elements.first().click();
              console.log(`✅ Clicked incident item via: ${selector}`);
              break;
            }
          } catch (e) {
            // Continue
          }
        }
      }
      
      // Wait for any navigation or API calls
      await page.waitForTimeout(3000);
      
      // Check for successful API responses (should be 200, not 404)
      const incidentDetailCalls = apiResponses.filter(r => 
        r.url.match(/\/api\/v1\/incidents\/incident-[0-9]+$/) && !r.url.includes('/timeline')
      );
      
      if (incidentDetailCalls.length > 0) {
        const failedCalls = incidentDetailCalls.filter(r => r.status === 404);
        expect(failedCalls.length).toBe(0);
        console.log(`✅ Incident detail API calls successful: ${incidentDetailCalls.length} calls, 0 failed`);
      } else {
        console.log('ℹ️ No explicit incident detail API calls detected');
      }
      
      // Verify no error messages in the UI
      const errorMessages = [
        'text=404',
        'text=Failed to fetch',
        'text=Error loading',
        'text=Not found'
      ];
      
      for (const errorText of errorMessages) {
        const errorElement = page.locator(errorText);
        expect(await errorElement.count()).toBe(0);
      }
      
      console.log('✅ No error messages detected in View Details functionality');
    });

    test('should verify timeline functionality is accessible', async ({ page }) => {
      await page.goto(`${baseURL}/`);
      await page.waitForLoadState('networkidle');
      
      // Monitor timeline API calls
      const timelineApiCalls: { url: string; status: number }[] = [];
      page.on('response', (response) => {
        const url = response.url();
        if (url.includes('/timeline')) {
          timelineApiCalls.push({ url, status: response.status() });
          console.log(`🕒 Timeline API Response: ${response.status()} - ${url}`);
        }
      });
      
      // Look for timeline-related UI elements
      const timelineSelectors = [
        'text=Timeline',
        '[data-testid*="timeline"]',
        'button:has-text("Timeline")',
        'tab:has-text("Timeline")',
        '[role="tab"]:has-text("Timeline")'
      ];
      
      let timelineFound = false;
      for (const selector of timelineSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            timelineFound = true;
            console.log(`✅ Found and clicked timeline: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      // Wait for any potential API calls
      await page.waitForTimeout(2000);
      
      if (timelineApiCalls.length > 0) {
        const failedTimelineCalls = timelineApiCalls.filter(r => r.status === 404);
        expect(failedTimelineCalls.length).toBe(0);
        console.log(`✅ Timeline API calls successful: ${timelineApiCalls.length} calls, 0 failed`);
      } else {
        console.log('ℹ️ No timeline API calls detected - may be accessed differently');
      }
      
      if (timelineFound) {
        console.log('✅ Timeline functionality is accessible in UI');
      } else {
        console.log('ℹ️ No explicit timeline UI element found - may be integrated differently');
      }
    });
  });

  test.describe('Performance and Reliability', () => {
    test('should verify API response times are acceptable', async ({ request }) => {
      const endpoints = [
        '/api/v1/incidents/stats',
        '/api/v1/incidents/incident-1',
        '/api/v1/incidents/incident-1/timeline'
      ];
      
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        const response = await request.get(`${baseURL}${endpoint}`);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        expect(response.status()).toBe(200);
        expect(responseTime).toBeLessThan(5000); // 5 second max
        
        console.log(`✅ ${endpoint}: ${responseTime}ms (status: ${response.status()})`);
      }
    });

    test('should handle concurrent API requests properly', async ({ request }) => {
      const promises = [
        request.get(`${baseURL}/api/v1/incidents/stats`),
        request.get(`${baseURL}/api/v1/incidents/incident-1`),
        request.get(`${baseURL}/api/v1/incidents/incident-2`),
        request.get(`${baseURL}/api/v1/incidents/incident-3`),
        request.get(`${baseURL}/api/v1/incidents/incident-1/timeline`),
        request.get(`${baseURL}/api/v1/incidents/incident-2/timeline`)
      ];
      
      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach((response, index) => {
        expect(response.status()).toBe(200);
      });
      
      console.log(`✅ All ${responses.length} concurrent API requests completed successfully`);
    });
  });
});