/**
 * End-to-End Test for Story 6.3: Drill-Down Capability
 * Tests complete drill-down workflow from monitoring dashboard to detailed analysis
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const DRILL_DOWN_CONFIG = {
  name: 'Drill-Down Capability',
  dashboardPath: '/monitoring',
  drillDownPath: '/monitoring/drill-down',
  apiEndpoints: [
    '/api/v1/monitoring/drill-down/assessments',
    '/api/v1/monitoring/drill-down/responses',
    '/api/v1/monitoring/drill-down/incidents',
    '/api/v1/monitoring/drill-down/entities',
    '/api/v1/monitoring/export/',
    '/api/v1/monitoring/historical/'
  ]
};

async function setupMockAPIs(page: Page) {
  // Mock main monitoring API
  await page.route('/api/v1/monitoring/situation/overview', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          totalAssessments: 125,
          totalResponses: 98,
          pendingVerification: 15,
          activeIncidents: 8,
          criticalGaps: 3,
          dataFreshness: {
            realTime: 80,
            recent: 35,
            offlinePending: 10
          }
        },
        meta: {
          refreshInterval: 25,
          connectionStatus: 'connected',
          lastUpdate: new Date().toISOString(),
          dataSource: 'real-time'
        }
      })
    });
  });

  // Mock drill-down assessments API
  await page.route('/api/v1/monitoring/drill-down/assessments*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'ASS-001',
            type: 'SHELTER',
            date: new Date().toISOString(),
            assessorName: 'John Smith',
            verificationStatus: 'VERIFIED',
            entityName: 'Camp Alpha',
            entityType: 'CAMP',
            coordinates: { latitude: 12.3456, longitude: 14.7890 },
            incidentName: 'Flood Response 2025',
            dataDetails: {
              shelterCount: 15,
              shelterCondition: 'GOOD',
              occupancyRate: 85
            },
            mediaCount: 3,
            syncStatus: 'SYNCED'
          }
        ],
        meta: {
          totalRecords: 1,
          totalPages: 1,
          currentPage: 1,
          aggregations: {
            byType: { SHELTER: 1, HEALTHCARE: 0, WASH: 0 },
            byStatus: { VERIFIED: 1, PENDING: 0, REJECTED: 0 }
          }
        }
      })
    });
  });

  // Mock drill-down responses API
  await page.route('/api/v1/monitoring/drill-down/responses*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'RES-001',
            responseType: 'SUPPLIES',
            status: 'COMPLETED',
            plannedDate: new Date().toISOString(),
            deliveredDate: new Date().toISOString(),
            responderName: 'Team Alpha',
            entityName: 'Camp Alpha',
            entityType: 'CAMP',
            coordinates: { latitude: 12.3456, longitude: 14.7890 },
            assessmentType: 'SHELTER',
            donorName: 'World Food Programme',
            dataDetails: {
              itemsDelivered: [
                { item: 'Rice', quantity: 100, unit: 'kg' }
              ],
              totalBeneficiaries: 250
            },
            deliveryItems: [
              { item: 'Rice (50kg bags)', quantity: 2, unit: 'bags' }
            ],
            evidenceCount: 4,
            verificationStatus: 'VERIFIED'
          }
        ],
        meta: {
          totalRecords: 1,
          totalPages: 1,
          aggregations: {
            byStatus: { COMPLETED: 1, IN_PROGRESS: 0, PLANNED: 0, CANCELLED: 0 }
          }
        }
      })
    });
  });

  // Mock historical comparison API
  await page.route('/api/v1/monitoring/historical/*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          current: {
            date: new Date().toISOString(),
            metrics: { totalAssessments: 150, verifiedAssessments: 120 }
          },
          historical: [
            {
              date: new Date(Date.now() - 24*60*60*1000).toISOString(),
              metrics: { totalAssessments: 140, verifiedAssessments: 115 }
            }
          ],
          trends: [
            { metric: 'totalAssessments', change: 7.1, direction: 'up' }
          ]
        }
      })
    });
  });
}

test.describe('Story 6.3: Drill-Down Capability E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAPIs(page);
  });

  test('AC1: Click-through from summary metrics to detailed records', async ({ page }) => {
    // Start from monitoring dashboard
    await page.goto(DRILL_DOWN_CONFIG.dashboardPath);
    
    // Wait for monitoring dashboard to load
    await expect(page.locator('h2')).toContainText('Real-Time Situation Display');
    
    // Verify summary cards are present and clickable
    await expect(page.locator('text=Total Assessments')).toBeVisible();
    await expect(page.locator('text=125')).toBeVisible(); // Total assessments count
    
    // Click on assessments card to drill down
    await page.locator('text=Total Assessments').locator('../..').click();
    
    // Verify navigation to drill-down page with assessments tab
    await expect(page).toHaveURL('/monitoring/drill-down?tab=assessments');
    await expect(page.locator('h2')).toContainText('Drill-Down Analysis');
    
    // Verify detailed assessment data is displayed
    await expect(page.locator('text=ASS-001')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=John Smith')).toBeVisible();
    await expect(page.locator('text=Camp Alpha')).toBeVisible();
  });

  test('AC2: Filtered views by incident, entity, timeframe', async ({ page }) => {
    await page.goto(DRILL_DOWN_CONFIG.drillDownPath);
    
    // Wait for drill-down page to load
    await expect(page.locator('h2')).toContainText('Drill-Down Analysis');
    
    // Verify filters section is present
    await expect(page.locator('text=Drill-Down Filters')).toBeVisible();
    
    // Test incident filter
    await page.locator('text=Incident').locator('..').locator('select, [role="combobox"]').first().click();
    await page.locator('text=All Incidents').first().click();
    
    // Test entity filter
    await page.locator('text=Entity').locator('..').locator('select, [role="combobox"]').first().click();
    await page.locator('text=All Entities').first().click();
    
    // Test timeframe quick filter
    await page.locator('text=Last 24 Hours').click();
    
    // Verify active filters are shown
    await expect(page.locator('text=Active Filters')).toBeVisible();
    
    // Test clear filters functionality
    await page.locator('text=Clear All').click();
    await expect(page.locator('text=No active filters')).toBeVisible();
  });

  test('AC3: Export capability for specific data subsets', async ({ page }) => {
    await page.goto(DRILL_DOWN_CONFIG.drillDownPath);
    
    // Wait for page to load
    await expect(page.locator('h2')).toContainText('Drill-Down Analysis');
    
    // Click export button
    await page.locator('text=Export').first().click();
    
    // Verify export modal opens
    await expect(page.locator('text=Export Data')).toBeVisible();
    
    // Test format selection
    await expect(page.locator('text=CSV')).toBeVisible();
    await expect(page.locator('text=JSON')).toBeVisible();
    await expect(page.locator('text=PDF')).toBeVisible();
    
    // Select CSV format
    await page.locator('text=CSV').click();
    
    // Test column selection
    await expect(page.locator('text=Select Columns')).toBeVisible();
    
    // Initiate export
    await page.locator('button', { hasText: 'Start Export' }).click();
    
    // Verify export progress
    await expect(page.locator('text=Preparing export...')).toBeVisible();
  });

  test('AC4: Historical comparison capability', async ({ page }) => {
    await page.goto(DRILL_DOWN_CONFIG.drillDownPath);
    
    // Wait for page to load and switch to assessments tab
    await expect(page.locator('h2')).toContainText('Drill-Down Analysis');
    await page.locator('text=Assessments').click();
    
    // Verify historical comparison chart is present
    await expect(page.locator('text=Historical Comparison')).toBeVisible();
    await expect(page.locator('text=Trend Analysis')).toBeVisible();
    
    // Verify trend indicators
    await expect(page.locator('text=Total Assessments')).toBeVisible();
    await expect(page.locator('text=+7.1%')).toBeVisible();
    
    // Test metric selection
    await page.locator('text=Total Assessments').click();
    
    // Verify chart updates (would show in a real implementation)
    await expect(page.locator('text=vs. Previous Period')).toBeVisible();
  });

  test('Complete drill-down workflow navigation', async ({ page }) => {
    // Start from monitoring dashboard
    await page.goto(DRILL_DOWN_CONFIG.dashboardPath);
    
    // Click drill-down button in header
    await page.locator('text=Drill Down').click();
    
    // Verify navigation to drill-down page
    await expect(page).toHaveURL(DRILL_DOWN_CONFIG.drillDownPath);
    await expect(page.locator('h2')).toContainText('Drill-Down Analysis');
    
    // Test all tabs work
    await page.locator('text=Assessments').click();
    await expect(page.locator('text=Detailed Assessment View')).toBeVisible();
    
    await page.locator('text=Responses').click();
    await expect(page.locator('text=Detailed Response View')).toBeVisible();
    
    await page.locator('text=Incidents').click();
    await expect(page.locator('text=Detailed Incident View')).toBeVisible();
    
    await page.locator('text=Entities').click();
    await expect(page.locator('text=Detailed Entity View')).toBeVisible();
    
    // Test back navigation
    await page.locator('text=Back to Monitoring').click();
    await expect(page).toHaveURL(DRILL_DOWN_CONFIG.dashboardPath);
  });

  test('Filter sharing and URL state management', async ({ page }) => {
    await page.goto(DRILL_DOWN_CONFIG.drillDownPath);
    
    // Apply filters
    await page.locator('text=Last 7 Days').click();
    await page.locator('text=Pending Verification').click();
    
    // Test share filters functionality
    await page.locator('text=Share Filters').click();
    
    // Verify URL contains filter parameters
    const url = page.url();
    expect(url).toContain('timeframe=');
    expect(url).toContain('status=');
    
    // Test direct URL navigation with filters
    const currentUrl = page.url();
    await page.goto(DRILL_DOWN_CONFIG.dashboardPath);
    await page.goto(currentUrl);
    
    // Verify filters are restored from URL
    await expect(page.locator('text=Active Filters')).toBeVisible();
  });

  test('Real-time data refresh in drill-down views', async ({ page }) => {
    let apiCallCount = 0;
    
    // Count API calls
    page.route('/api/v1/monitoring/drill-down/assessments*', async (route) => {
      apiCallCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{
            id: `ASS-${apiCallCount.toString().padStart(3, '0')}`,
            type: 'SHELTER',
            date: new Date().toISOString(),
            assessorName: `Assessor ${apiCallCount}`,
            verificationStatus: 'VERIFIED',
            entityName: 'Test Camp',
            entityType: 'CAMP',
            coordinates: { latitude: 12.0, longitude: 14.0 },
            dataDetails: { shelterCount: 10 + apiCallCount },
            mediaCount: apiCallCount,
            syncStatus: 'SYNCED'
          }],
          meta: {
            totalRecords: 1,
            totalPages: 1,
            aggregations: { byType: {}, byStatus: {} }
          }
        })
      });
    });

    await page.goto(DRILL_DOWN_CONFIG.drillDownPath);
    
    // Wait for initial load
    await expect(page.locator('text=ASS-001')).toBeVisible();
    const initialCallCount = apiCallCount;
    
    // Click refresh button
    await page.locator('button').filter({ hasText: 'Refresh' }).first().click();
    
    // Verify data updated
    await expect(page.locator('text=ASS-002')).toBeVisible();
    expect(apiCallCount).toBeGreaterThan(initialCallCount);
  });

  test('Error handling and offline scenarios', async ({ page }) => {
    // Test API failure scenario
    await page.route('/api/v1/monitoring/drill-down/assessments*', async route => {
      await route.abort('failed');
    });

    await page.goto(DRILL_DOWN_CONFIG.drillDownPath);
    
    // Should handle gracefully without crashing
    await expect(page.locator('h2')).toContainText('Drill-Down Analysis');
    
    // Should show empty state or error message
    await expect(page.locator('text=No assessments found, text=Unable to load')).toBeVisible();
  });

  test('Mobile responsiveness for drill-down interface', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(DRILL_DOWN_CONFIG.drillDownPath);
    
    // Verify mobile layout works
    await expect(page.locator('h2')).toContainText('Drill-Down Analysis');
    
    // Verify tabs work on mobile
    await page.locator('text=Responses').click();
    await expect(page.locator('text=Detailed Response View')).toBeVisible();
    
    // Verify filters panel works on mobile
    await expect(page.locator('text=Drill-Down Filters')).toBeVisible();
    
    // Test filter interaction on mobile
    await page.locator('text=Last 24 Hours').click();
    await expect(page.locator('text=Active Filters')).toBeVisible();
  });

  test('Performance with large datasets', async ({ page }) => {
    // Mock large dataset response
    await page.route('/api/v1/monitoring/drill-down/assessments*', async route => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: `ASS-${(i + 1).toString().padStart(3, '0')}`,
        type: 'SHELTER',
        date: new Date().toISOString(),
        assessorName: `Assessor ${i + 1}`,
        verificationStatus: 'VERIFIED',
        entityName: `Camp ${i + 1}`,
        entityType: 'CAMP',
        coordinates: { latitude: 12.0 + i * 0.01, longitude: 14.0 + i * 0.01 },
        dataDetails: { shelterCount: 10 + i },
        mediaCount: i % 5,
        syncStatus: 'SYNCED'
      }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: largeDataset.slice(0, 20), // Paginated
          meta: {
            totalRecords: 100,
            totalPages: 5,
            currentPage: 1,
            aggregations: { byType: {}, byStatus: {} }
          }
        })
      });
    });

    await page.goto(DRILL_DOWN_CONFIG.drillDownPath);
    
    // Verify pagination works with large dataset
    await expect(page.locator('text=Page 1 of 5 (100 total)')).toBeVisible();
    
    // Test pagination navigation
    await page.locator('text=Next').click();
    await expect(page.locator('text=Page 2 of 5')).toBeVisible();
  });

  test('Cross-tab data consistency', async ({ page }) => {
    await page.goto(DRILL_DOWN_CONFIG.drillDownPath);
    
    // Apply filters on assessments tab
    await page.locator('text=Assessments').click();
    await page.locator('text=Last 7 Days').click();
    
    // Switch to responses tab
    await page.locator('text=Responses').click();
    
    // Verify filters persist across tabs
    await expect(page.locator('text=Active Filters')).toBeVisible();
    
    // Switch to incidents tab
    await page.locator('text=Incidents').click();
    
    // Verify detailed incident view loads
    await expect(page.locator('text=Detailed Incident View')).toBeVisible();
    
    // Switch to entities tab
    await page.locator('text=Entities').click();
    
    // Verify detailed entity view loads
    await expect(page.locator('text=Detailed Entity View')).toBeVisible();
  });
});